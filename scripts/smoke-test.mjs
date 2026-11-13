import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const site = read('data/site.json');
const searchIndex = read('data/search-index.json');
globalThis.window = { SITE: site, SEARCH: searchIndex };

const { pages } = await import('../assets/js/pages.js');

const cases = [
  ['home', '/', []],
  ['chapters', '/chapters', []],
  ['chapter 已校', '/chapters/049', ['049']],
  ['chapter 待补', '/chapters/002', ['002']],
  ['event 赤壁', '/events/chibi', ['chibi']],
  ['event 官渡', '/events/guandu', ['guandu']],
  ['people', '/people', []],
  ['person 诸葛亮', '/people/zhugeliang', ['zhugeliang']],
  ['person 貂蝉', '/people/diaochan', ['diaochan']],
  ['star', '/star', []],
  ['map', '/map', []],
  ['dialogue', '/dialogue', []],
  ['sources', '/sources', []],
  ['search', '/search', []],
  ['about', '/about', []],
  ['notFound', '/unknown', []],
];

const ctx = (p, params, query = '') => ({
  path: p, anchor: '', segments: p.split('/').filter(Boolean),
  query: new URLSearchParams(query), params,
});

const errors = [];
const chapterIds = new Set(site.chapters.map((c) => c.id));
const personIds = new Set(site.people.map((p) => p.id));
const eventIds = new Set(site.events.map((e) => e.id));
const placeIds = new Set(site.places.map((p) => p.id));
const sourceIds = new Set(site.sources.map((s) => s.id));

for (const [name, p, params] of cases) {
  const pageName = (() => {
    const a = p.split('/')[1];
    if (!a) return 'home';
    if (a === 'chapters') return params.length ? 'chapter' : 'chapters';
    if (a === 'events') return 'event';
    if (a === 'people') return params.length ? 'person' : 'people';
    return pages[a] ? a : 'notFound';
  })();
  const page = pages[pageName];
  let html;
  try {
    html = page.render(ctx(p, params, p.includes('/search') ? 'q=赤壁' : ''));
  } catch (e) {
    errors.push(`${name}: render 抛错 ${e.message}`);
    continue;
  }
  if (typeof html !== 'string' || html.length < 150) errors.push(`${name}: 输出过短或不是字符串`);
  for (const bad of ['undefined', 'NaN', '[object Object]']) {
    if (html.includes(bad)) errors.push(`${name}: 输出包含异常片段 ${bad}`);
  }
  const links = [...html.matchAll(/href="(#\/[^"]*)"/g)].map((m) => m[1]);
  for (const raw of links) {
    const clean = raw.slice(1).split('?')[0];
    const seg = clean.split('/').filter(Boolean);
    if (seg[0] === 'chapters' && seg[1] && !chapterIds.has(seg[1])) errors.push(`${name}: 死链 ${raw}`);
    if (seg[0] === 'people' && seg[1] && !personIds.has(seg[1])) errors.push(`${name}: 死链 ${raw}`);
    if (seg[0] === 'events' && seg[1] && !eventIds.has(seg[1])) errors.push(`${name}: 死链 ${raw}`);
    if (seg[0] === 'sources' && raw.includes('focus=')) {
      const id = new URLSearchParams(raw.split('?')[1]).get('focus');
      if (!sourceIds.has(id)) errors.push(`${name}: 史料锚点不存在 ${id}`);
    }
    if (seg[0] === 'map' && raw.includes('place=')) {
      const id = new URLSearchParams(raw.split('?')[1]).get('place');
      if (!placeIds.has(id)) errors.push(`${name}: 地名锚点不存在 ${id}`);
    }
  }
  console.log(`  ${name.padEnd(18)} ${String(html.length).padStart(6)} 字符 / ${links.length} 个站内链接`);
}

// 对话逻辑自测：未来事件必须被拦截
const q = site.questions.find((x) => x.id === 'q-chibi');
const periods = site.periods.filter((x) => x.personId === 'zhugeliang');
const p207 = periods.find((x) => x.year === 207);
if (!p207 || q.year <= p207.year) errors.push('对话知识边界：207 年诸葛亮未能拦截 208 年赤壁问题');
const p228 = periods.find((x) => x.year === 228);
if (!p228 || q.year > p228.year) errors.push('对话知识边界：228 年诸葛亮应能回答 208 年赤壁问题');

// 关系出处校验
const noSource = site.relations.filter((r) => !r.sourceType || !r.note);
if (noSource.length) errors.push(`存在 ${noSource.length} 条无出处关系`);

// 搜索索引覆盖
if (searchIndex.length < site.chapters.length + site.people.length) errors.push('搜索索引条目不足');

console.log(`\n自检完成：${cases.length} 个页面 / ${searchIndex.length} 条索引 / ${site.relations.length} 条关系`);
if (errors.length) {
  console.error(`\n发现 ${errors.length} 个问题：`);
  for (const e of errors) console.error('  -', e);
  process.exit(1);
}
console.log('全部通过：页面可渲染、无死链、年份知识边界生效、关系均有出处。');
