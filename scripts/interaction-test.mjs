import { spawn } from 'node:child_process';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
const BASE = 'http://127.0.0.1:4173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function until(fn, label, timeout = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try { if (await fn()) return; } catch { /* 继续等待 */ }
    await wait(150);
  }
  throw new Error(`等待超时：${label}`);
}

const proc = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
  '--no-first-run', `--user-data-dir=/tmp/chrome-sanguo-cdp-${Date.now()}`,
  `--remote-debugging-port=${PORT}`, 'about:blank',
], { stdio: 'ignore' });

let ws;
let seq = 0;
const pending = new Map();

function cmd(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error(`CDP 超时 ${method}`)); } }, 10000);
  });
}

async function evaluate(expression) {
  const r = await cmd('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text + ' ' + (r.result.exceptionDetails.exception?.description || ''));
  return r.result?.result?.value;
}

async function goto(hash) {
  await evaluate(`location.hash = ${JSON.stringify(hash)}; new Promise(r => setTimeout(r, 260))`);
  await until(async () => await evaluate('!!window.SITE'), `路由 ${hash}`);
  await wait(220);
}

const results = [];
const check = (name, cond, detail = '') => {
  results.push({ name, ok: !!cond, detail });
  console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${name}${detail ? '  ' + detail : ''}`);
};

try {
  await until(async () => (await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok, 'Chrome CDP 端口');
  const tab = await fetch(`http://127.0.0.1:${PORT}/json/new?${BASE}`, { method: 'PUT' }).then((r) => r.json());
  ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m); pending.delete(m.id); }
  };
  await cmd('Runtime.enable');
  await until(async () => await evaluate('!!window.SITE'), '站点初始化');
  await goto('#/dialogue');

  // 1. 207 年的诸葛亮必须拒答 208 年赤壁
  const denied = await evaluate(`(() => { document.querySelector('[data-q="q-chibi"]').click(); return document.querySelector('#dlg-chat').innerText; })()`);
  check('207 年拒答未来事件', denied.includes('此事超出我此刻所知'), denied.slice(0, 46).replace(/\n/g, ' '));

  // 2. 切到 228 年后可以回答同一问题
  const allowed = await evaluate(`(() => {
    [...document.querySelectorAll('#dlg-periods button')].find(b => b.dataset.year === '228').click();
    document.querySelector('[data-q="q-chibi"]').click();
    return document.querySelector('#dlg-chat').innerText;
  })()`);
  check('228 年可回答 208 年战事',
    !allowed.includes('超出我此刻所知') && !allowed.includes('未来事件已拦截') &&
    (allowed.includes('江东') || allowed.includes('孙刘联军') || allowed.includes('火攻')),
    allowed.slice(0, 52).replace(/\n/g, ' '));

  // 3. 回答可展开依据 / 创作
  const details = await evaluate(`document.querySelectorAll('#dlg-chat details').length`);
  check('回答含依据/创作展开', details > 0, `${details} 个`);

  // 4. 故事馆筛选只看已校
  await goto('#/chapters');
  const reviewed = await evaluate(`(() => {
    document.querySelector('[data-only="reviewed"]').click();
    return { cards: document.querySelectorAll('.chapter-card').length, total: window.SITE.stats.reviewedChapters };
  })()`);
  check('故事馆筛选已校导读', reviewed.cards === reviewed.total, `${reviewed.cards} 张 / 应为 ${reviewed.total} 张`);
  const allChapters = await evaluate(`(() => { document.querySelector('[data-only="reviewed"]').click(); return document.querySelectorAll('.chapter-card').length; })()`);
  check('故事馆 120 回全量', allChapters === 120, `${allChapters} 张`);

  // 5. 地图年份联动
  await goto('#/map');
  const mapState = await evaluate(`(() => {
    const r = document.querySelector('#map-range'); r.value = '208'; r.dispatchEvent(new Event('input'));
    return { year: document.querySelector('#map-year').textContent, meta: document.querySelector('#map-year-meta').innerText, dots: document.querySelectorAll('.map-place').length };
  })()`);
  check('地图年份联动', mapState.year === '208' && mapState.meta.includes('建安十三年'), mapState.meta.replace(/\n/g, ' '));
  check('绘卷城池点渲染', mapState.dots === 22, `${mapState.dots} 处`);

  // 6. 典籍室三分法筛选
  await goto('#/sources');
  const src = await evaluate(`(() => {
    const all = document.querySelectorAll('.source-card').length;
    document.querySelector('[data-type="正史"]').click();
    return { all, filtered: document.querySelectorAll('.source-card').length };
  })()`);
  check('典籍室按出处筛选', src.filtered > 0 && src.filtered < src.all, `全部 ${src.all} → 正史 ${src.filtered}`);

  // 7. 搜索
  await goto('#/search?q=%E8%8D%89%E8%88%B9%E5%80%9F%E7%AE%AD');
  const search = await evaluate(`document.querySelector('#search-results').innerText`);
  check('检索命中史料与回目', search.includes('草船借箭'));

  // 8. 星图 Canvas 与默认选中
  await goto('#/star');
  const star = await evaluate(`(() => {
    const c = document.querySelector('#star-canvas');
    return { width: c.width, height: c.height, selected: document.querySelector('#star-selected').innerText };
  })()`);
  check('星图 Canvas 已绘制', star.width > 0 && star.height > 0, `${star.width}×${star.height}`);
  check('星图默认选中人物', star.selected.includes('诸葛亮'));

  // 9. 全局搜索框跳转
  const nav = await evaluate(`(() => {
    const i = document.querySelector('#global-search-input'); i.value = '周瑜';
    document.querySelector('#global-search').dispatchEvent(new Event('submit', { cancelable: true }));
    return location.hash;
  })()`);
  check('顶栏搜索跳转', nav.includes('search?q='), nav);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n交互自检：${results.length - failed.length}/${results.length} 通过`);
  if (failed.length) process.exitCode = 1;
} catch (err) {
  console.error('交互自检异常：', err.message);
  process.exitCode = 1;
} finally {
  try { ws?.close(); } catch { /* ignore */ }
  proc.kill('SIGTERM');
}
