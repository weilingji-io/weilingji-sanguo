import { pages } from './pages.js';

const root = () => document.getElementById('app');
let cleanup = null;

function parseHash() {
  let raw = location.hash.slice(1) || '/';
  try { raw = decodeURIComponent(raw); } catch { /* 保留原样 */ }
  const qIndex = raw.indexOf('?');
  const pathPart = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
  const queryPart = qIndex >= 0 ? raw.slice(qIndex + 1) : '';
  let path = pathPart || '/';
  let anchor = '';
  const hIndex = path.indexOf('#');
  if (hIndex >= 0) { anchor = path.slice(hIndex + 1); path = path.slice(0, hIndex) || '/'; }
  return {
    path,
    anchor,
    segments: path.split('/').filter(Boolean),
    query: new URLSearchParams(queryPart),
    params: [],
  };
}

function resolve(ctx) {
  const [a, b] = ctx.segments;
  if (!a) return 'home';
  if (a === 'chapters') return b ? 'chapter' : 'chapters';
  if (a === 'events') return b ? 'event' : 'notFound';
  if (a === 'people') return b ? 'person' : 'people';
  if (a === 'star') return 'star';
  if (a === 'map') return 'map';
  if (a === 'dialogue') return 'dialogue';
  if (a === 'sources') return 'sources';
  if (a === 'search') return 'search';
  if (a === 'about') return 'about';
  return 'notFound';
}

function navKey(path) {
  if (path.startsWith('/chapters') || path.startsWith('/events')) return '#/chapters';
  if (path.startsWith('/people')) return '#/people';
  if (path.startsWith('/star')) return '#/star';
  if (path.startsWith('/map')) return '#/map';
  if (path.startsWith('/dialogue')) return '#/dialogue';
  if (path.startsWith('/sources')) return '#/sources';
  if (path.startsWith('/about')) return '#/about';
  return '';
}

function renderRoute() {
  if (cleanup) { try { cleanup(); } catch { /* 忽略卸载异常 */ } cleanup = null; }
  const ctx = parseHash();
  const name = resolve(ctx);
  ctx.params = ctx.segments.slice(1);
  if (name === 'chapter') ctx.params = [ctx.segments[1]];
  if (name === 'event') ctx.params = [ctx.segments[1]];
  if (name === 'person') ctx.params = [ctx.segments[1]];
  const page = pages[name] || pages.notFound;

  document.body.classList.toggle('theme-dark', page.theme === 'dark');
  document.title = `${page.title} · ${window.SITE.meta.name}`;
  const el = root();
  try {
    el.innerHTML = page.render(ctx);
    cleanup = page.mount?.(el, ctx) || null;
  } catch (err) {
    console.error('页面渲染失败', err);
    el.innerHTML = `<div class="error-state"><h2>这一页渲染出错了</h2><p>${String(err)}</p><p><a class="btn" href="#/">回到首页</a></p></div>`;
  }
  const key = navKey(ctx.path);
  document.querySelectorAll('.main-nav a').forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === key));
  window.scrollTo(0, 0);
  if (ctx.anchor) {
    requestAnimationFrame(() => document.getElementById(ctx.anchor)?.scrollIntoView({ block: 'start' }));
  }
}

async function boot() {
  try {
    const [siteRes, indexRes] = await Promise.all([
      fetch('./data/site.json'),
      fetch('./data/search-index.json'),
    ]);
    if (!siteRes.ok || !indexRes.ok) throw new Error(`数据加载失败：${siteRes.status} / ${indexRes.status}`);
    const [site, index] = await Promise.all([siteRes.json(), indexRes.json()]);
    window.SITE = site;
    window.SEARCH = index;
    window.addEventListener('hashchange', renderRoute);
    document.getElementById('global-search').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = document.getElementById('global-search-input').value.trim();
      location.hash = q ? `#/search?q=${encodeURIComponent(q)}` : '#/search';
    });
    renderRoute();
  } catch (err) {
    console.error('初始化失败', err);
    root().innerHTML = `<div class="error-state"><h2>站点数据没能加载</h2>
      <p>${String(err)}</p><p>请先运行 <code>npm run build</code> 生成 data/site.json，再用 <code>npm start</code> 启动本地服务（不要直接以 file:// 打开）。</p></div>`;
  }
}

boot();
