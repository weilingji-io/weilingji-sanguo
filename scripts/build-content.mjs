import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const catalog = read('content/catalog.json');
const master = read('content/master.json');
const world = read('content/world.json');

const errors = [];
const warnings = [];
const ok = (cond, msg) => { if (!cond) errors.push(msg); };

const SOURCE_TYPES = new Set(['演义', '正史', '传说']);
const ARCS = [
  { from: 1, to: 20, name: '群雄起事', hint: '中平至初平年间' },
  { from: 21, to: 40, name: '北方混战', hint: '建安初年' },
  { from: 41, to: 60, name: '赤壁前后', hint: '建安十三年前后' },
  { from: 61, to: 80, name: '三分成形', hint: '建安后期' },
  { from: 81, to: 100, name: '蜀汉北伐', hint: '章武至建兴年间' },
  { from: 101, to: 120, name: '三国归晋', hint: '景耀至太康年间' },
];
const arcOf = (no) => ARCS.find((a) => no >= a.from && no <= a.to);

const chapters = catalog.map((c) => {
  const arc = arcOf(c.no);
  const g = master.guides[c.id];
  return {
    id: c.id,
    no: c.no,
    fullTitle: c.fullTitle,
    title: c.title,
    originUrl: c.originUrl,
    arc: arc?.name ?? '未分卷',
    era: g?.era ?? '',
    eraHint: arc?.hint ?? '',
    year: g?.year ?? null,
    summary: g?.summary ?? c.title,
    guide: g?.guide ?? '',
    question: g?.question ?? '',
    peopleIds: g?.people ?? [],
    placeIds: g?.places ?? [],
    eventIds: g?.events ?? [],
    sourceIds: g?.sources ?? [],
    sourceType: '演义',
    review: g ? '已校' : '待校',
    illustrationSeed: c.no,
  };
});

const people = master.people;
const relations = master.relations;
const events = world.events;
const places = world.places;
const timeline = world.timeline;
const sources = world.sources;
const periods = world.periods;
const questions = world.dialogueQuestions;

const index = (arr) => new Set(arr.map((x) => x.id));
const chapterIds = index(chapters);
const personIds = index(people);
const placeIds = index(places);
const eventIds = index(events);
const sourceIds = index(sources);

const checkRefs = (list, set, label, field) => {
  for (const it of list) ok(it && set.has(it), `${label} 引用了不存在的 ${field}: ${it}`);
};

for (const ch of chapters) {
  checkRefs(ch.peopleIds, personIds, `第${ch.no}回`, '人物');
  checkRefs(ch.placeIds, placeIds, `第${ch.no}回`, '地名');
  checkRefs(ch.eventIds, eventIds, `第${ch.no}回`, '事件');
  checkRefs(ch.sourceIds, sourceIds, `第${ch.no}回`, '史料');
  if (ch.year !== null) ok(ch.year >= 180 && ch.year <= 290, `第${ch.no}回年份异常: ${ch.year}`);
}

for (const p of people) {
  ok(p.name && p.tagline, `人物 ${p.id} 缺姓名或一句话定位`);
  ok(SOURCE_TYPES.has(p.sourceType), `人物 ${p.id} 的来源标签非法: ${p.sourceType}`);
  ok(chapterIds.has(p.first) || p.first === '', `人物 ${p.id} 首次出场回目不存在: ${p.first}`);
  checkRefs(p.footprints ?? [], placeIds, `人物 ${p.id}`, '足迹地名');
}

for (const r of relations) {
  ok(personIds.has(r.from), `关系起点不存在: ${r.from}`);
  ok(personIds.has(r.to), `关系终点不存在: ${r.to}`);
  ok(SOURCE_TYPES.has(r.sourceType), `关系 ${r.from}-${r.to} 缺少合法的出处标签`);
  ok(typeof r.note === 'string' && r.note.length > 0, `关系 ${r.from}-${r.to} 无出处说明，按「没有依据的线一条都不画」应拒绝入库`);
  ok(r.sinceYear >= 150 && r.sinceYear <= 300, `关系 ${r.from}-${r.to} 年份异常`);
}

for (const e of events) {
  checkRefs(e.chapterIds ?? [], chapterIds, `事件 ${e.id}`, '回目');
  checkRefs(e.placeIds ?? [], placeIds, `事件 ${e.id}`, '地名');
  for (const v of e.viewpoints ?? []) ok(personIds.has(v.personId), `事件 ${e.id} 视角人物不存在: ${v.personId}`);
  ok(e.phases?.cause && e.phases?.process && e.phases?.result, `事件 ${e.id} 缺少前因/经过/后果三段`);
}

for (const t of timeline) {
  if (t.eventId) ok(eventIds.has(t.eventId), `年表 ${t.year} ${t.title} 引用了不存在的事件`);
  checkRefs(t.placeIds ?? [], placeIds, `年表 ${t.year}`, '地名');
  ok(t.year >= 180 && t.year <= 290, `年表年份异常: ${t.year}`);
}

for (const s of sources) {
  ok(SOURCE_TYPES.has(s.type), `史料 ${s.id} 来源标签非法: ${s.type}`);
  checkRefs(s.chapters ?? [], chapterIds, `史料 ${s.id}`, '回目');
  ok(s.ref && s.note, `史料 ${s.id} 缺出处或辨析说明`);
}

for (const p of periods) ok(personIds.has(p.personId), `对话时期引用了不存在的人物: ${p.personId}`);
for (const q of questions) {
  ok(q.answers && typeof q.answers.default === 'string', `问题 ${q.id} 缺默认回答`);
  ok(q.basis?.length > 0, `问题 ${q.id} 缺依据标注`);
  ok(q.creation?.length > 0, `问题 ${q.id} 缺创作标注`);
}

const reviewed = chapters.filter((c) => c.review === '已校').length;
if (reviewed < chapters.length) warnings.push(`${chapters.length - reviewed} 回导读待补，详情页会显示占位状态`);
warnings.push('插画为程序化生成的示意水墨图，尚未替换为正式 AI 插画');
warnings.push('地图为不含任何行政边界的手绘示意绘卷，未接入在线底图');

const relationBySource = { 正史: 0, 演义: 0, 传说: 0 };
for (const r of relations) relationBySource[r.sourceType]++;

const stats = {
  chapters: chapters.length,
  reviewedChapters: reviewed,
  people: people.length,
  relations: relations.length,
  relationBySource,
  events: events.length,
  timeline: timeline.length,
  places: places.length,
  sources: sources.length,
  periods: periods.length,
  questions: questions.length,
};

const site = {
  meta: { ...master.meta, generatedAt: new Date().toISOString() },
  stats,
  chapters,
  people,
  relations,
  events,
  places,
  timeline,
  sources,
  periods,
  questions,
  sourceTypes: ['演义', '正史', '传说'],
  arcs: ARCS.map((a) => a.name),
};

const searchIndex = [
  ...chapters.map((c) => ({ type: 'chapter', id: c.id, title: `第${c.no}回 ${c.title}`, sub: c.arc, href: `#/chapters/${c.id}`, keywords: `${c.title} ${c.arc} ${c.summary}` })),
  ...people.map((p) => ({ type: 'person', id: p.id, title: p.name, sub: p.tagline, href: `#/people/${p.id}`, keywords: `${p.name} ${p.zi} ${p.faction} ${p.tagline}` })),
  ...events.map((e) => ({ type: 'event', id: e.id, title: e.name, sub: e.summary, href: `#/events/${e.id}`, keywords: `${e.name} ${e.era} ${e.summary}` })),
  ...places.map((p) => ({ type: 'place', id: p.id, title: p.name, sub: p.modern, href: `#/map?place=${p.id}`, keywords: `${p.name} ${p.modern}` })),
  ...sources.map((s) => ({ type: 'source', id: s.id, title: s.title, sub: s.ref, href: `#/sources?focus=${s.id}`, keywords: `${s.title} ${s.ref} ${s.note} ${s.type}` })),
];

const outDir = path.join(root, 'data');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'site.json'), JSON.stringify(site, null, 2) + '\n');
fs.writeFileSync(path.join(outDir, 'search-index.json'), JSON.stringify(searchIndex, null, 2) + '\n');
fs.writeFileSync(path.join(outDir, 'build-report.json'), JSON.stringify({ stats, warnings, errors, generatedAt: site.meta.generatedAt }, null, 2) + '\n');

console.log('内容构建完成');
console.log(JSON.stringify(stats, null, 2));
for (const w of warnings) console.log('  提示:', w);
if (errors.length) {
  console.error(`\n校验失败，共 ${errors.length} 项：`);
  for (const e of errors.slice(0, 40)) console.error('  -', e);
  process.exit(1);
}
console.log('\n校验通过：引用完整、三分法标签齐全、关系均有出处、年份合法。');
