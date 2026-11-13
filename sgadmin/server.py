#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""三国寻踪 · 访问统计后台（sgadmin）

- 仅 Python 3 标准库，零外部依赖；SQLite 存储
- POST /api/track      前端浏览上报（CORS 开放给 sanguo.weilingji.com，text/plain 免预检）
- POST /api/login      管理员登录（pbkdf2 校验 + 按失败次数限流）
- POST /api/logout     退出
- GET  /api/stats      统计数据（需登录，HMAC 签名 Cookie 会话）
- GET  /               管理界面 web/admin.html

运行：python3 server.py  （默认 127.0.0.1:8083，由 systemd 托管）
"""
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import sys
import threading
import time
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(BASE_DIR, 'web')
DATA_DIR = os.path.join(BASE_DIR, 'data')
DB_PATH = os.path.join(DATA_DIR, 'sgadmin.db')
SECRET_PATH = os.path.join(DATA_DIR, 'secret.key')

ALLOWED_ORIGIN = 'https://sanguo.weilingji.com'
CN_TZ = timezone(timedelta(hours=8))
SESSION_TTL = 12 * 3600
COOKIE_NAME = 'sgadmin_token'
MAX_BODY = 8 * 1024
LOGIN_FAIL_LIMIT = 10       # 15 分钟内失败次数上限
LOGIN_FAIL_WINDOW = 15 * 60

os.makedirs(DATA_DIR, exist_ok=True)

# ---------- 会话签名密钥（首次运行生成） ----------
if not os.path.exists(SECRET_PATH):
    with open(SECRET_PATH, 'w', encoding='utf-8') as f:
        f.write(secrets.token_hex(32))
with open(SECRET_PATH, encoding='utf-8') as f:
    SECRET = f.read().strip()

with open(os.path.join(BASE_DIR, 'config.json'), encoding='utf-8') as f:
    USERS = json.load(f)['users']

# ---------- 数据库 ----------
def db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with db() as c:
        c.execute('''CREATE TABLE IF NOT EXISTS pageviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts INTEGER NOT NULL,
            day TEXT NOT NULL,
            path TEXT NOT NULL,
            title TEXT,
            sid TEXT,
            ua TEXT,
            ip TEXT
        )''')
        c.execute('CREATE INDEX IF NOT EXISTS idx_pv_day ON pageviews(day)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_pv_path ON pageviews(path)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_pv_sid ON pageviews(sid)')

init_db()

# ---------- 登录限流 ----------
_login_fails = {}  # ip -> [timestamps]
_lock = threading.Lock()

def too_many_failures(ip):
    now = time.time()
    with _lock:
        ts = [t for t in _login_fails.get(ip, []) if now - t < LOGIN_FAIL_WINDOW]
        _login_fails[ip] = ts
        return len(ts) >= LOGIN_FAIL_LIMIT

def record_failure(ip):
    with _lock:
        _login_fails.setdefault(ip, []).append(time.time())

def clear_failures(ip):
    with _lock:
        _login_fails.pop(ip, None)

# ---------- 会话令牌 ----------
def make_token(username):
    exp = int(time.time()) + SESSION_TTL
    payload = f'{username}|{exp}'
    sig = hmac.new(SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f'{payload}|{sig}'

def verify_token(token):
    try:
        username, exp, sig = token.split('|')
        if int(exp) < time.time():
            return None
        expect = hmac.new(SECRET.encode(), f'{username}|{exp}'.encode(), hashlib.sha256).hexdigest()
        if hmac.compare_digest(sig, expect):
            return username
    except Exception:
        pass
    return None

def check_password(username, password):
    u = USERS.get(username)
    if not u:
        # 恒定时间：对假盐也算一遍，避免用户名枚举
        hashlib.pbkdf2_hmac('sha256', password.encode(), b'0' * 32, 120000)
        return False
    h = hashlib.pbkdf2_hmac('sha256', password.encode(), u['salt'].encode(), u['iterations']).hex()
    return hmac.compare_digest(h, u['hash'])

# ---------- 工具 ----------
def cn_day(ts=None):
    dt = datetime.fromtimestamp(ts if ts is not None else time.time(), CN_TZ)
    return dt.strftime('%Y-%m-%d')

def clean(s, n):
    s = (s or '')[:n]
    return re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', s)

def route_category(path):
    seg = (path or '/').split('?')[0].split('/')
    head = seg[1] if len(seg) > 1 else 'home'
    return head if head else 'home'

CATEGORY_LABEL = {
    'home': '首页', 'chapters': '故事馆', 'chapter': '回目详情',
    'people': '人物馆', 'person': '人物卡', 'star': '群英星图',
    'map': '山河年表', 'dialogue': '对话台', 'sources': '典籍室',
    'search': '搜索', 'about': '关于',
}

# ---------- 统计 ----------
def query_stats(days):
    out = {}
    with db() as c:
        total = c.execute('SELECT COUNT(*) n, COUNT(DISTINCT sid) uv FROM pageviews').fetchone()
        out['total_pv'] = total['n']
        out['total_uv'] = total['uv']

        today = cn_day()
        t = c.execute('SELECT COUNT(*) n, COUNT(DISTINCT sid) uv FROM pageviews WHERE day=?', (today,)).fetchone()
        out['today_pv'], out['today_uv'] = t['n'], t['uv']
        out['today'] = today

        since_day = cn_day(time.time() - (days - 1) * 86400)
        rows = c.execute('''SELECT day, COUNT(*) pv, COUNT(DISTINCT sid) uv FROM pageviews
                            WHERE day >= ? GROUP BY day ORDER BY day''', (since_day,)).fetchall()
        # 补齐空日期
        series = {}
        for r in rows:
            series[r['day']] = (r['pv'], r['uv'])
        daily = []
        d = datetime.strptime(since_day, '%Y-%m-%d')
        for i in range(days):
            key = d.strftime('%Y-%m-%d')
            pv, uv = series.get(key, (0, 0))
            daily.append({'day': key, 'pv': pv, 'uv': uv})
            d += timedelta(days=1)
        out['daily'] = daily

        cats = c.execute('''SELECT path, COUNT(*) n FROM pageviews WHERE day >= ?
                            GROUP BY path ORDER BY n DESC LIMIT 15''', (since_day,)).fetchall()
        top = [{'path': r['path'], 'label': CATEGORY_LABEL.get(route_category(r['path']), r['path']),
                'pv': r['n']} for r in cats]
        out['top_paths'] = top

        cat_rows = c.execute('''SELECT path, COUNT(*) n FROM pageviews WHERE day >= ?''', (since_day,)).fetchall()
        agg = {}
        for r in cat_rows:
            k = route_category(r['path'])
            agg[k] = agg.get(k, 0) + r['n']
        out['categories'] = sorted(
            [{'key': k, 'label': CATEGORY_LABEL.get(k, k), 'pv': v} for k, v in agg.items()],
            key=lambda x: -x['pv'])

        recent = c.execute('''SELECT ts, day, path, title, sid, ua, ip FROM pageviews
                              ORDER BY id DESC LIMIT 50''').fetchall()
        out['recent'] = [dict(r) for r in recent]

        hours = c.execute('''SELECT strftime('%H', ts, 'unixepoch', '+8 hours') h, COUNT(*) n FROM pageviews
                             WHERE day = ? GROUP BY h ORDER BY h''', (today,)).fetchall()
        out['today_hours'] = [{'h': r['h'], 'pv': r['n']} for r in hours]
    return out

# ---------- HTTP ----------
MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
        '.ico': 'image/x-icon'}

class Handler(BaseHTTPRequestHandler):
    server_version = 'sgadmin/1.0'
    protocol_version = 'HTTP/1.1'

    def log_message(self, fmt, *args):
        sys.stderr.write('[%s] %s\n' % (cn_day() + ' ' + datetime.now(CN_TZ).strftime('%H:%M:%S'), fmt % args))

    # ---- 响应 ----
    def send_json(self, obj, status=200, cookies=None, extra=None):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        for c in cookies or []:
            self.send_header('Set-Cookie', c)
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def send_empty(self, status=204, extra=None):
        self.send_response(status)
        self.send_header('Cache-Control', 'no-store')
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.send_header('Content-Length', '0')
        self.end_headers()

    def read_body(self):
        n = int(self.headers.get('Content-Length') or 0)
        if n <= 0 or n > MAX_BODY:
            return None
        return self.rfile.read(n)

    def client_ip(self):
        return self.headers.get('X-Real-IP') or self.headers.get('X-Forwarded-For', '').split(',')[0].strip() or self.client_address[0]

    def session_user(self):
        raw = self.headers.get('Cookie', '')
        for part in raw.split(';'):
            k, _, v = part.strip().partition('=')
            if k == COOKIE_NAME:
                return verify_token(v)
        return None

    # ---- 路由 ----
    def do_OPTIONS(self):
        self.send_empty(204, extra={'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
                                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                                    'Access-Control-Allow-Headers': 'Content-Type',
                                    'Access-Control-Max-Age': '86400'})

    def do_GET(self):
        u = urlparse(self.path)
        if u.path == '/api/stats':
            user = self.session_user()
            if not user:
                return self.send_json({'ok': False, 'error': '未登录或会话过期'}, 401)
            q = parse_qs(u.query)
            try:
                days = min(max(int(q.get('days', ['30'])[0]), 1), 90)
            except ValueError:
                days = 30
            return self.send_json({'ok': True, 'user': user, 'days': days, 'stats': query_stats(days)})

        if u.path == '/' or u.path == '/index.html':
            return self.send_file('admin.html')
        if u.path.startswith('/api/'):
            return self.send_json({'ok': False, 'error': 'not found'}, 404)
        # 其余按静态文件（限定在 web 目录内）
        rel = u.path.lstrip('/')
        return self.send_file(rel)

    def send_file(self, rel):
        path = os.path.normpath(os.path.join(WEB_DIR, rel))
        if not path.startswith(WEB_DIR) or not os.path.isfile(path):
            return self.send_json({'ok': False, 'error': 'not found'}, 404)
        ext = os.path.splitext(path)[1].lower()
        with open(path, 'rb') as f:
            body = f.read()
        self.send_response(200)
        self.send_header('Content-Type', MIME.get(ext, 'application/octet-stream'))
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        u = urlparse(self.path)
        cors = {'Access-Control-Allow-Origin': ALLOWED_ORIGIN}

        if u.path == '/api/track':
            try:
                data = json.loads(self.read_body() or b'{}')
            except Exception:
                data = {}
            path = clean(str(data.get('path') or '/'), 200)
            title = clean(str(data.get('title') or ''), 120)
            sid = clean(str(data.get('sid') or ''), 64)
            ua = clean(self.headers.get('User-Agent', ''), 200)
            ip = clean(self.client_ip(), 64)
            if not path.startswith('/'):
                path = '/' + path
            with db() as c:
                c.execute('INSERT INTO pageviews(ts, day, path, title, sid, ua, ip) VALUES (?,?,?,?,?,?,?)',
                          (int(time.time()), cn_day(), path, title, sid or None, ua, ip))
            return self.send_empty(204, extra=cors)

        if u.path == '/api/login':
            ip = self.client_ip()
            if too_many_failures(ip):
                return self.send_json({'ok': False, 'error': '尝试次数过多，请 15 分钟后再试'}, 429)
            try:
                data = json.loads(self.read_body() or b'{}')
            except Exception:
                data = {}
            username = clean(str(data.get('username') or ''), 64)
            password = str(data.get('password') or '')[:128]
            if check_password(username, password):
                clear_failures(ip)
                token = make_token(username)
                cookie = (f'{COOKIE_NAME}={token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age={SESSION_TTL}')
                return self.send_json({'ok': True, 'user': username}, cookies=[cookie])
            record_failure(ip)
            time.sleep(0.5)
            return self.send_json({'ok': False, 'error': '账号或密码不正确'}, 401)

        if u.path == '/api/logout':
            cookie = f'{COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
            return self.send_json({'ok': True}, cookies=[cookie])

        return self.send_json({'ok': False, 'error': 'not found'}, 404, extra=cors)


def main():
    port = int(os.environ.get('PORT', '8083'))
    host = os.environ.get('HOST', '127.0.0.1')
    server = ThreadingHTTPServer((host, port), Handler)
    print(f'sgadmin listening on http://{host}:{port}', flush=True)
    server.serve_forever()

if __name__ == '__main__':
    main()
