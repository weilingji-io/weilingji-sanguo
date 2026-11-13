import {
  esc, site, findPerson, findChapter, findEvent, findPlace, findSource,
  tag, sourceTag, seal, chapterHead, closing, notice, empty, bigNumber,
  personLink, chapterLink, eventLink, panel, illustration, portrait, hashSeed,
} from './ui.js';
import { initStarMap } from './star-map.js';
import { createMap, footprintIntersection } from './scroll-map.js';

const S = () => site();
const stat = (n, label) => `<div class="stat"><b>${n}</b><span>${esc(label)}</span></div>`;
const arcChips = (arcs, active, attr = 'data-arc') =>
  `<button class="btn btn--sm ${active === '全部' ? 'is-active' : ''}" ${attr}="全部">全部</button>` +
  arcs.map((a) => `<button class="btn btn--sm ${active === a ? 'is-active' : ''}" ${attr}="${esc(a)}">${esc(a)}</button>`).join('');

const entries = [
  { seal: '故', name: '故事馆', desc: '读原著 · 120 回插画、导读与原文', num: '120 回', href: '#/chapters' },
  { seal: '人', name: '人物馆', desc: '认人物 · 人物卡、关系与出处', num: '65 位', href: '#/people' },
  { seal: '图', name: '山河年表', desc: '看天下 · 绘卷、年表与足迹叠加', num: '38 件', href: '#/map' },
  { seal: '问', name: '对话', desc: '问古人 · 按时期，人物有知识边界', num: '16 段', href: '#/dialogue' },
  { seal: '典', name: '典籍室', desc: '查出处 · 演义回目与史书卷目', num: '120+65', href: '#/sources' },
];

/* ---------------- 首页 ---------------- */
const home = {
  title: '首页',
  render() {
    const st = S().stats;
    const today = findChapter('049');
    return `${chapterHead('卷首', 1)}
    <section class="home-hero">
      <div>
        <p class="eyebrow">不是电子书，是一个能走进去的三国世界</p>
        <h1 class="display-title">一卷三国，<span class="accent">万千线索</span></h1>
        <p class="lead">读《三国》最难的不是故事，是人名对不上号、地名一直在变、小说和正史搅在一起。这里把 120 回拆成五条能互相跳转的线索，从哪一条进去都走得通。</p>
        <div class="path-row">
          <a class="path-card" href="#/chapters"><b>从故事开始</b><span>先看懂一回，再往深处读</span></a>
          <a class="path-card" href="#/people"><b>从人物开始</b><span>把人名变成一颗会转的星球</span></a>
          <a class="path-card" href="#/map"><b>从地图开始</b><span>把故事放回山河之间</span></a>
        </div>
        <div class="tag-row" style="margin-top:16px">${sourceTag('演义')}${sourceTag('正史')}${sourceTag('传说')}<span class="muted" style="font-size:12px;margin-left:6px">全站分开标注</span></div>
      </div>
      <div class="hero-art">${illustration(49, { fire: true })}</div>
    </section>
    <div class="stat-row">${stat(st.chapters, '回原著')}${stat(st.people, '位人物')}${stat(st.relations, '条关系 · 均有出处')}${stat(st.timeline, '件大事')}</div>
    <h2 class="section-title">一个首页 · 五个入口 <small>每个入口回答一个不同的问题</small></h2>
    <div class="entry-list">${entries.map((e) => `<a class="entry-item" href="${e.href}">
      ${seal(e.seal)}<span class="entry-name">${e.name}</span><span class="entry-desc">${e.desc}</span><span class="entry-num">${e.num}</span>
    </a>`).join('')}</div>
    <h2 class="section-title">今日一回 <small>从一张插画开始，往下就是原文</small></h2>
    <div class="card today-card"><div>${illustration(49, { fire: true })}</div>
      <div><span class="tag tag--neutral">第 ${today.no} 回 · ${esc(today.era)}（${today.year}）</span>
        <h3 style="font-family:var(--serif);font-size:24px;margin:12px 0">${esc(today.title)}</h3>
        <p class="muted" style="font-size:14px">${esc(today.summary)}</p>
        <a class="btn btn--primary" href="#/chapters/049">读这一回 →</a></div></div>
    ${closing('从哪个入口进去，都能走通')}`;
  },
};

/* ---------------- 故事馆 ---------------- */
const chapters = {
  title: '故事馆',
  render() {
    const arcs = S().arcs;
    return `${chapterHead('故事馆', 2)}
    <p class="eyebrow">不是把原文搬上网，而是让每一回都能走下去</p>
    <h1 class="display-title">120 回，<span class="accent">每回一张插画</span></h1>
    <p class="lead">${bigNumber(120, '回')} 已校导读 ${S().stats.reviewedChapters} 回，其余回目已建立索引，导读与插画按流水线补齐中。点开任一回都能看到状态，不会出现假完成。</p>
    <div class="filter-bar" id="chapter-filters">${arcChips(arcs, '全部')}<button class="btn btn--sm" data-only="reviewed">只看已校</button></div>
    <div class="chapter-grid" id="chapter-grid"></div>
    ${closing('先看懂，再往深处读')}`;
  },
  mount(root, ctx) {
    const grid = root.querySelector('#chapter-grid');
    const filters = root.querySelector('#chapter-filters');
    let arc = ctx.query.get('arc') || '全部', reviewedOnly = false;
    const paint = () => {
      const list = S().chapters.filter((c) => (arc === '全部' || c.arc === arc) && (!reviewedOnly || c.review === '已校'));
      grid.innerHTML = list.map((c) => `<a class="chapter-card" href="#/chapters/${c.id}">
        ${illustration(c.no, { fire: c.no === 49, lazy: true })}
        <div class="cc-body"><span class="cc-no">第 ${c.no} 回</span>
        <h3 class="cc-title">${esc(c.title)}</h3>
        <div class="cc-meta"><span>${esc(c.arc)}</span><span class="${c.review === '已校' ? 'gold' : ''}">${c.review === '已校' ? '导读已校' : '导读待补'}</span></div></div>
      </a>`).join('') || empty('这一卷暂时没有符合条件的回目');
    };
    filters.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.arc) { arc = b.dataset.arc; }
      else if (b.dataset.only) { reviewedOnly = !reviewedOnly; b.classList.toggle('is-active'); }
      [...filters.querySelectorAll('[data-arc]')].forEach((x) => x.classList.toggle('is-active', x.dataset.arc === arc));
      paint();
    });
    [...filters.querySelectorAll('[data-arc]')].forEach((x) => x.classList.toggle('is-active', x.dataset.arc === arc));
    paint();
  },
};

const chapter = {
  title: '回目',
  render(ctx) {
    const c = findChapter(ctx.params[0]);
    if (!c) return notFound.render(ctx);
    const prev = findChapter(String(Number(c.id) - 1).padStart(3, '0'));
    const next = findChapter(String(Number(c.id) + 1).padStart(3, '0'));
    const people = c.peopleIds.map((id) => personLink(id)).join('');
    const places = c.placeIds.map((id) => { const p = findPlace(id); return p ? `<a class="chip" href="#/map?place=${p.id}">${esc(p.name)}</a>` : ''; }).join('');
    const events = c.eventIds.map((id) => eventLink(id)).join('');
    const sources = c.sourceIds.map((id) => { const s = findSource(id); return s ? `<a class="chip" href="#/sources?focus=${s.id}">${esc(s.title)}</a>` : ''; }).join('');
    return `${chapterHead(`故事馆 · 第 ${c.no} 回`, 2)}
    <div class="hero-illus">${illustration(c.no, { fire: c.no === 49, lazy: true })}
      <div class="hero-illus-caption"><h1>第 ${c.no} 回</h1><p>${esc(c.title)}</p></div></div>
    <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:18px 0 26px">
      <span class="tag tag--neutral">${esc(c.era || c.eraHint)}</span>
      ${c.year ? `<span class="tag tag--neutral">公元 ${c.year} 年</span>` : ''}
      ${sourceTag('演义')}
      <span class="tag ${c.review === '已校' ? 'tag--history' : 'tag--neutral'}">${c.review === '已校' ? '导读已校' : '导读待补'}</span>
      <span class="muted" style="font-size:12px">${esc(c.arc)}</span>
    </div>
    <div class="chapter-detail">
      <div>
        <h2 class="section-title" style="margin-top:0">一回导读 <small>白话、短句，不剧透后文</small></h2>
        ${c.guide ? `<div class="guide-text">${c.guide.split('\n').map((x) => `<p>${esc(x)}</p>`).join('')}</div>` : empty('这一回的导读还在生产流水线里，先看看回目名、出场人物与相关事件。')}
        ${c.question ? `<div class="question-box">留给孩子的一个问题：${esc(c.question)}</div>` : ''}
        <div class="prev-next">
          ${prev ? `<a class="btn" href="#/chapters/${prev.id}">← 第 ${prev.no} 回</a>` : '<span></span>'}
          ${next ? `<a class="btn" href="#/chapters/${next.id}">第 ${next.no} 回 →</a>` : '<span></span>'}
        </div>
        <p style="margin-top:26px"><a class="btn btn--primary" href="${esc(c.originUrl)}" target="_blank" rel="noopener noreferrer">读原文（外部公版阅读站）↗</a></p>
        <p class="muted" style="font-size:12px">原文链接指向第三方在线阅读站，本站不转载受版权保护的整理本。</p>
      </div>
      <aside>
        <div class="side-box"><h3>这一回出现的人</h3><div class="tag-row">${people || '<span class="muted">待标注</span>'}</div></div>
        <div class="side-box"><h3>相关的地点</h3><div class="tag-row">${places || '<span class="muted">待标注</span>'}</div></div>
        <div class="side-box"><h3>所属事件</h3><div class="tag-row">${events || '<span class="muted">待标注</span>'}</div></div>
        <div class="side-box"><h3>出处对照</h3><div class="tag-row">${sources || '<span class="muted">待接入</span>'}</div></div>
        <div class="side-box"><h3>三分法</h3><p style="font-size:12px;color:var(--ink-2);margin:0">回目正文属<b>小说层</b>；涉及史实的内容在典籍室按正史、传说分别标注。</p></div>
      </aside>
    </div>
    ${closing('从一张插画，走到原文')}`;
  },
};

const event = {
  title: '事件专题',
  render(ctx) {
    const e = findEvent(ctx.params[0]);
    if (!e) return notFound.render(ctx);
    return `${chapterHead('故事馆 · 事件专题', 2)}
    <div class="hero-illus">${illustration(e.id === 'chibi' ? 49 : 5, { fire: e.id === 'chibi' })}
      <div class="hero-illus-caption"><h1>${esc(e.name)}</h1><p>${esc(e.era)} · ${esc(e.summary)}</p></div></div>
    <h2 class="section-title">前因 · 经过 · 后果 <small>三步看懂一场仗</small></h2>
    <div class="phase-grid">
      <div class="phase"><b>前因</b><p>${esc(e.phases.cause)}</p></div>
      <div class="phase"><b>经过</b><p>${esc(e.phases.process)}</p></div>
      <div class="phase"><b>后果</b><p>${esc(e.phases.result)}</p></div>
    </div>
    <h2 class="section-title">换一个人的位置，看这场战役 <small>同一件事，不同人当时知道的不一样</small></h2>
    <div class="viewpoint-grid">${e.viewpoints.map((v) => {
      const p = findPerson(v.personId);
      return `<div class="viewpoint"><div class="portrait">${portrait(hashSeed(v.personId), v.personId)}</div>
        <div class="viewpoint-body"><b>${esc(p?.name || v.personId)}</b>${p ? `<span class="muted" style="font-size:11px;margin-left:6px">${esc(p.faction)}</span>` : ''}
        <p>${esc(v.text)}</p>${personLink(v.personId)}</div></div>`;
    }).join('')}</div>
    <h2 class="section-title">相关回目 <small>往下就是原文</small></h2>
    <div class="tag-row">${e.chapterIds.map((id) => chapterLink(id)).join('')}</div>
    <h2 class="section-title">涉及地点</h2>
    <div class="tag-row">${e.placeIds.map((id) => { const p = findPlace(id); return p ? `<a class="chip" href="#/map?place=${p.id}">${esc(p.name)}</a>` : ''; }).join('')}</div>
    ${notice('<strong>出处提醒：</strong>视角文字是本站依据史料与小说情节改写的白话，不是人物原话；史实在典籍室另有标注。')}
    ${closing('理解一个人的选择，要先回到他当时的处境')}`;
  },
};

/* ---------------- 人物馆 ---------------- */
const people = {
  title: '人物馆',
  render() {
    const factions = [...new Set(S().people.map((p) => p.faction))];
    return `${chapterHead('人物馆', 3)}
    <p class="eyebrow">把 1235 个人名，换成 146 张读得清的卡片</p>
    <h1 class="display-title">把人名变成<span class="accent">一张可以转的图</span></h1>
    <p class="lead">${bigNumber(S().people.length, '位人物')} 每个人的阵营、关系、出处与首次出场回目都分开记录；关系没有依据的线，一条都不画。</p>
    <div class="filter-bar" id="people-filters">
      <button class="btn btn--sm is-active" data-faction="全部">全部</button>
      ${factions.map((f) => `<button class="btn btn--sm" data-faction="${esc(f)}">${esc(f)}</button>`).join('')}
    </div>
    <div class="people-grid" id="people-grid"></div>
    <div class="star-cta"><div><h3>群英星图</h3><p>会自转的球面点阵：点谁，谁转到正中间，与他有关的人全部亮起。还能按年份与出处筛选关系。</p>
      <a class="btn" href="#/star">进入星图 →</a></div><div>${illustration(60)}</div></div>
    ${closing('人名背后，是一张关系网')}`;
  },
  mount(root) {
    const grid = root.querySelector('#people-grid');
    const bar = root.querySelector('#people-filters');
    let faction = '全部';
    const paint = () => {
      const list = S().people.filter((p) => faction === '全部' || p.faction === faction);
      grid.innerHTML = list.map((p) => `<a class="person-card" href="#/people/${p.id}">
        <div class="person-thumb">${portrait(hashSeed(p.id), p.id)}</div>
        <div class="person-card-body"><b>${esc(p.name)}</b><span class="zi">字 ${esc(p.zi)}</span>
        <p>${esc(p.tagline)}</p><div class="tag-row">${sourceTag(p.sourceType)}<span class="tag tag--neutral">${esc(p.faction)}</span></div></div>
      </a>`).join('');
    };
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      faction = b.dataset.faction;
      [...bar.querySelectorAll('button')].forEach((x) => x.classList.toggle('is-active', x === b));
      paint();
    });
    paint();
  },
};

const person = {
  title: '人物',
  render(ctx) {
    const p = findPerson(ctx.params[0]);
    if (!p) return notFound.render(ctx);
    const rels = S().relations.filter((r) => r.from === p.id || r.to === p.id);
    const appeared = S().chapters.filter((c) => c.peopleIds.includes(p.id));
    const periods = S().periods.filter((x) => x.personId === p.id);
    const first = findChapter(p.first);
    return `${chapterHead('人物馆 · 人物卡', 3)}
    <div class="person-hero"><div class="portrait">${portrait(hashSeed(p.id), p.id)}</div>
      <div><p class="eyebrow">${esc(p.faction)} · ${esc(p.life)}</p>
        <h1 class="display-title" style="margin-bottom:6px">${esc(p.name)}<span style="font-size:18px;color:var(--ink-3);margin-left:12px">字 ${esc(p.zi)}</span></h1>
        <p class="lead">${esc(p.tagline)}</p>
        <div class="tag-row">${sourceTag(p.sourceType)}<span class="tag tag--neutral">${esc(p.faction)}</span><span class="tag tag--neutral">${esc(p.review)}</span></div>
      </div></div>
    <div class="section-title">一句话定位</div>
    <p class="prose">${esc(p.bio)}</p>
    <div class="section-title">关系 <small>${rels.length} 条 · 每条都标了出处</small></div>
    <div class="relation-list">${rels.map((r) => {
      const other = findPerson(r.from === p.id ? r.to : r.from);
      return `<div class="relation-item"><a class="rel-avatar" href="#/people/${other.id}" title="${esc(other.name)}">${portrait(hashSeed(other.id), other.id)}</a>${sourceTag(r.sourceType)}<a href="#/people/${other.id}"><b>${esc(other.name)}</b></a>
        <span class="rel-type">${esc(r.type)}</span><span class="muted" style="font-size:11px">自 ${r.sinceYear} 年</span>
        <span class="rel-note">${esc(r.note)}</span></div>`;
    }).join('') || empty('暂无关系记录')}</div>
    <div class="section-title">足迹 <small>示意绘卷上的城池点</small></div>
    <div class="tag-row">${p.footprints.map((id) => { const pl = findPlace(id); return pl ? `<a class="chip" href="#/map?place=${pl.id}">${esc(pl.name)}</a>` : ''; }).join('')}</div>
    <div class="section-title">出现的回目 <small>首次出场：${first ? `第 ${first.no} 回` : '待标注'}</small></div>
    <div class="tag-row">${appeared.slice(0, 20).map((c) => chapterLink(c.id)).join('') || '<span class="muted">导读待补，尚未标注出场回目</span>'}</div>
    ${periods.length ? `<div class="section-title">对话时期 <small>按时期设定知识边界</small></div>
      <div class="tag-row">${periods.map((x) => `<a class="chip" href="#/dialogue?person=${p.id}&year=${x.year}">${esc(x.label)} · ${x.year}</a>`).join('')}</div>` : ''}
    <p style="margin-top:28px"><a class="btn" href="#/star?person=${p.id}&year=${p.since}">在星图里找到 ${esc(p.name)} →</a> <a class="btn" href="#/people">← 返回人物馆</a></p>
    ${closing('理解一个人，要先看清他站在哪一年')}`;
  },
};

/* ---------------- 群英星图 ---------------- */
const star = {
  title: '群英星图',
  theme: 'dark',
  render() {
    const st = S().stats;
    return `${chapterHead('人物馆 · 群英星图', 3)}
    <div class="star-center">
      <p class="eyebrow">— 群英星图</p>
      ${bigNumber(st.people, '位')}
      <h1 class="display-title">人物，排成一颗会转的星球</h1>
      <p class="lead" style="margin:0 auto">点谁，谁就转到正中间，和他有关的人全部亮起。拖动可旋转，年份滑块会过滤尚未登场的人物与尚未成立的关系。</p>
      <div class="star-wrap"><canvas class="star-canvas" id="star-canvas" aria-label="可旋转的三国人物关系星图"></canvas></div>
      <div class="star-hint">拖动旋转 · 点击人物置中 · 球体为 Canvas 实时绘制</div>
      <div class="star-stats" id="star-stats">
        <button class="star-pill is-active" data-filter="all">${st.relations} 条关系</button>
        <button class="star-pill" data-filter="正史">正史 ${st.relationBySource['正史']}</button>
        <button class="star-pill" data-filter="演义">小说 ${st.relationBySource['演义']}</button>
        <button class="star-pill" data-filter="传说">传说 ${st.relationBySource['传说']}</button>
      </div>
      <div class="star-toolbar">
        <button class="btn btn--sm" id="star-rotate">暂停自转</button>
        <label>年份 <input type="range" id="star-year" min="184" max="280" value="280"></label>
        <span id="star-year-label">280 年 · 全部人物</span>
        <button class="btn btn--sm" id="star-reset">重置</button>
      </div>
      <div class="star-selected" id="star-selected"><h3>点一个人名试试</h3><p>例如诸葛亮：他会转到正中，与刘备、周瑜、姜维等人的关系会按出处着色亮起。</p></div>
    </div>
    ${closing('没有依据的线，一条都不画')}`;
  },
  mount(root, ctx) {
    const canvas = root.querySelector('#star-canvas');
    const box = root.querySelector('#star-selected');
    const yearInput = root.querySelector('#star-year');
    const yearLabel = root.querySelector('#star-year-label');
    const rotateBtn = root.querySelector('#star-rotate');
    const statsBar = root.querySelector('#star-stats');
    if (!canvas?.getContext) {
      box.classList.add('star-fallback');
      box.innerHTML = `<h3>当前环境不支持 Canvas</h3><p>已降级为人物列表：</p><div class="tag-row">${S().people.map((p) => personLink(p.id)).join('')}</div>`;
      return null;
    }
    const relationList = (id) => S().relations.filter((r) => r.from === id || r.to === id);
    const controller = initStarMap(canvas, {
      people: S().people, relations: S().relations,
      onSelect(id) {
        const p = findPerson(id);
        if (!p) return;
        const rels = relationList(id);
        box.innerHTML = `<div class="star-card"><div class="star-avatar">${portrait(hashSeed(p.id), p.id)}</div>
          <div class="star-card-main"><h3>${esc(p.name)} <span style="font-size:13px;color:#A9B9C4">字 ${esc(p.zi)} · ${esc(p.faction)}</span></h3>
          <p>${esc(p.tagline)}　${esc(p.bio)}</p>
          <div class="tag-row">${sourceTag(p.sourceType)}<span class="tag tag--neutral">${rels.length} 条关系</span></div>
          <div style="margin-top:12px">${rels.slice(0, 8).map((r) => {
            const o = findPerson(r.from === id ? r.to : r.from);
            return `<span class="chip" style="margin:3px">${esc(o?.name || '')} · ${esc(r.type)} · ${esc(r.sourceType)}</span>`;
          }).join('')}</div>
          <p style="margin-top:14px"><a class="btn btn--sm" href="#/people/${p.id}">查看人物卡 →</a></p></div></div>`;
      },
    });
    statsBar.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      [...statsBar.querySelectorAll('button')].forEach((x) => x.classList.toggle('is-active', x === b));
      controller.setFilter(b.dataset.filter);
    });
    yearInput.addEventListener('input', () => {
      const y = Number(yearInput.value);
      controller.setYear(y);
      const active = S().people.filter((p) => p.since <= y).length;
      yearLabel.textContent = `${y} 年 · 已登场 ${active} 人`;
    });
    let rotating = true;
    rotateBtn.addEventListener('click', () => {
      rotating = !rotating;
      controller.setAutoRotate(rotating);
      rotateBtn.textContent = rotating ? '暂停自转' : '恢复自转';
    });
    root.querySelector('#star-reset').addEventListener('click', () => {
      controller.setFilter('all'); controller.setYear(280);
      yearInput.value = '280'; yearLabel.textContent = '280 年 · 全部人物';
      [...statsBar.querySelectorAll('button')].forEach((x, i) => x.classList.toggle('is-active', i === 0));
      controller.focus('zhugeliang');
    });
    // 支持从人物页带参直达：#/star?person=xxx&year=207
    const qp = ctx?.query?.get('person');
    const qy = Number(ctx?.query?.get('year'));
    const initial = (qp && findPerson(qp)) ? qp : 'zhugeliang';
    if (Number.isFinite(qy) && qy >= 184 && qy <= 280) {
      yearInput.value = String(qy);
      controller.setYear(qy);
      const active = S().people.filter((p) => p.since <= qy).length;
      yearLabel.textContent = `${qy} 年 · 已登场 ${active} 人`;
    }
    controller.focus(initial);
    return () => controller.destroy();
  },
};

/* ---------------- 山河年表 ---------------- */
const map = {
  title: '山河年表',
  render(ctx) {
    const peopleOptions = S().people.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
    return `${chapterHead('山河年表', 4)}
    <p class="eyebrow">山水绘卷 · 示意，不接入在线底图</p>
    <h1 class="display-title">一幅山水长卷，<span class="accent">也是一张时间轴</span></h1>
    <p class="lead">拖动年份，从黄巾起事到三国归晋，${S().timeline.length} 件大事依次点亮；再把两个人的足迹叠在一起，看他们共同到过哪些地方。</p>
    ${notice('<strong>合规说明：</strong>这是一张不含任何行政边界与真实经纬度的手绘示意绘卷，古今地名只作「约今」对照；本项目刻意不接在线底图，也不采集任何位置数据。')}
    <div class="map-controls">
      <label>视图 <select id="map-view"><option value="scroll">山水绘卷</option><option value="timeline">年表视图</option></select></label>
      <label>足迹 A <select id="map-person-a">${peopleOptions}</select></label>
      <label>足迹 B <select id="map-person-b">${peopleOptions}</select></label>
      <button class="btn btn--sm" id="map-clear">清除叠加</button>
    </div>
    <div id="map-scroll"><div class="map-frame" id="map-host"></div>
      <div class="footprint-legend" id="map-legend"><span><i style="background:#A63126"></i>当前年份相关地点</span><span><i style="background:#35564C"></i>两人共同到过</span><span><i style="background:#6B5A42"></i>其余城池</span></div>
    </div>
    <div id="map-timeline" style="display:none"></div>
    <div class="year-row"><div class="year-display" id="map-year">208</div>
      <input type="range" id="map-range" min="184" max="280" value="208">
      <div class="year-meta" id="map-year-meta"></div></div>
    <div class="timeline-strip" id="map-strip"></div>
    <div class="section-title">这一年前后 <small>年表条目按时间排列</small></div>
    <div id="map-nearby"></div>
    ${closing('把故事放回山河之间')}`;
  },
  mount(root, ctx) {
    const host = root.querySelector('#map-host');
    const map = createMap(host, S().places);
    const range = root.querySelector('#map-range');
    const yearEl = root.querySelector('#map-year');
    const meta = root.querySelector('#map-year-meta');
    const strip = root.querySelector('#map-strip');
    const nearby = root.querySelector('#map-nearby');
    const selA = root.querySelector('#map-person-a');
    const selB = root.querySelector('#map-person-b');
    const legend = root.querySelector('#map-legend');
    selA.value = 'liubei'; selB.value = 'caocao';
    let focusId = ctx.query.get('place');

    strip.innerHTML = S().timeline.map((t) => `<button class="timeline-item" data-year="${t.year}" data-places="${(t.placeIds || []).join(',')}">
      <b>${t.year}</b><span>${esc(t.title)}</span></button>`).join('');

    const paint = () => {
      const y = Number(range.value);
      yearEl.textContent = y;
      const hit = S().timeline.find((t) => t.year === y);
      const closest = hit || S().timeline.reduce((a, b) => Math.abs(b.year - y) < Math.abs(a.year - y) ? b : a);
      meta.innerHTML = `<b>${esc(closest.era)}</b><br>${hit ? esc(hit.title) : `接近 ${esc(closest.title)}（${closest.year}）`}`;
      const active = hit?.placeIds || [];
      const common = footprintIntersection(findPerson(selA.value), findPerson(selB.value));
      map.paint({ activeIds: active, footprints: common, focusId });
      legend.innerHTML = `<span><i style="background:#A63126"></i>当前年份相关地点</span><span><i style="background:#35564C"></i>两人共同到过 ${common.length} 处：${common.map((id) => esc(findPlace(id)?.name || id)).join('、') || '无'}</span><span><i style="background:#6B5A42"></i>其余城池</span>`;
      nearby.innerHTML = S().timeline.filter((t) => Math.abs(t.year - y) <= 6).map((t) => `<div class="relation-item"><b style="color:var(--gold);font-family:var(--serif);font-size:18px;min-width:52px">${t.year}</b>
        <span>${esc(t.era)}</span><span style="margin-left:auto">${esc(t.title)}</span>
        ${t.eventId ? `<a class="chip" href="#/events/${t.eventId}">看事件</a>` : ''}</div>`).join('') || empty('附近年份暂无条目');
      [...strip.children].forEach((el) => el.classList.toggle('is-current', Number(el.dataset.year) === y));
    };
    const paintTimeline = () => {
      root.querySelector('#map-timeline').innerHTML = `<div class="card"><h3>184 → 280 · ${S().timeline.length} 件大事</h3>
        <div class="relation-list">${S().timeline.map((t) => `<div class="relation-item"><b style="color:var(--gold);font-family:var(--serif);font-size:18px;min-width:52px">${t.year}</b>
          <span>${esc(t.era)}</span><span style="margin-left:auto">${esc(t.title)}</span></div>`).join('')}</div></div>`;
    };
    range.addEventListener('input', paint);
    selA.addEventListener('change', paint);
    selB.addEventListener('change', paint);
    root.querySelector('#map-clear').addEventListener('click', () => { focusId = null; paint(); });
    root.querySelector('#map-view').addEventListener('change', (e) => {
      const isScroll = e.target.value === 'scroll';
      root.querySelector('#map-scroll').style.display = isScroll ? '' : 'none';
      root.querySelector('#map-timeline').style.display = isScroll ? 'none' : '';
      if (!isScroll) paintTimeline();
    });
    strip.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      range.value = b.dataset.year; paint();
    });
    host.addEventListener('click', (e) => {
      const g = e.target.closest('.map-place'); if (!g) return;
      focusId = g.dataset.id; paint();
    });
    host.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const g = e.target.closest('.map-place'); if (!g) return;
      e.preventDefault(); focusId = g.dataset.id; paint();
    });
    paint();
  },
};

/* ---------------- 对话台 ---------------- */
const dialogue = {
  title: '对话',
  render(ctx) {
    const personIds = [...new Set(S().periods.map((p) => p.personId))];
    return `${chapterHead('对话', 5)}
    <p class="eyebrow">给人物加一条时间线</p>
    <h1 class="display-title">先问清楚，<span class="accent">现在是哪一年</span></h1>
    <p class="lead">选定人物与时期后，回答只依据这一年之前已发生的事。问 207 年的诸葛亮赤壁谁赢了，他会告诉你：那一年赤壁还没发生。</p>
    ${notice('<strong>实现说明：</strong>本页不调用任何大模型。回答来自按人物时期预置的语料，知识截止年份由 <code>dialoguePeriods[period].year</code> 决定，晚于该年份的事件一律不进入回答；每句都可展开看「依据」与「创作」。')}
    <div class="dialogue-layout">
      <div>
        <div class="side-box"><h3>选一个人物</h3><div class="tag-row" id="dlg-people">
          ${personIds.map((id) => `<button class="chip" data-person="${id}">${esc(findPerson(id)?.name || id)}</button>`).join('')}
        </div></div>
        <div class="side-box"><h3>选一个时期</h3><div class="tag-row" id="dlg-periods"></div></div>
        <div class="side-box"><h3>可以问什么</h3><div class="q-list" id="dlg-questions"></div></div>
      </div>
      <div>
        <div class="knowledge-cut" id="dlg-cut"></div>
        <div class="period-axis" id="dlg-axis"></div>
        ${panel('三国寻踪 · 人物对话（按时期）', `<div class="chat-window" id="dlg-chat"></div>`)}
      </div>
    </div>
    ${closing('此事超出我此刻所知')}`;
  },
  mount(root, ctx) {
    const state = {
      personId: ctx.query.get('person') || 'zhugeliang',
      year: Number(ctx.query.get('year')) || 207,
      messages: [],
    };
    const peopleBox = root.querySelector('#dlg-people');
    const periodBox = root.querySelector('#dlg-periods');
    const qBox = root.querySelector('#dlg-questions');
    const cut = root.querySelector('#dlg-cut');
    const axis = root.querySelector('#dlg-axis');
    const chat = root.querySelector('#dlg-chat');
    const periodsOf = () => S().periods.filter((p) => p.personId === state.personId);
    const current = () => periodsOf().find((p) => p.year === state.year) || periodsOf()[0];

    const paintChat = () => {
      chat.innerHTML = state.messages.length ? state.messages.map((m) => {
        if (m.role === 'user') return `<div class="chat-bubble user">${esc(m.text)}</div>`;
        return `<div class="chat-row"><div class="chat-avatar">${portrait(hashSeed(state.personId), state.personId)}</div><div class="chat-bubble answer"><div class="speaker">${esc(m.speaker)} · ${m.year} 年 ${m.refused ? '· 未来事件已拦截' : ''}</div>
          <div>${esc(m.text)}</div>
          <details class="answer-detail"><summary>展开看依据 / 创作</summary>
            <p><b>依据</b></p><ul>${m.basis.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
            <p><b>创作</b></p><ul>${m.creation.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          </details></div></div>`;
      }).join('') : '<div class="chat-empty">从左边挑一个问题，看看这个时期的人物会怎么回答。</div>';
      chat.scrollTop = chat.scrollHeight;
    };

    const paint = () => {
      const ps = periodsOf();
      if (!ps.some((p) => p.year === state.year)) state.year = ps[0].year;
      const cur = current();
      const person = findPerson(state.personId);
      [...peopleBox.children].forEach((b) => b.classList.toggle('is-active', b.dataset.person === state.personId));
      periodBox.innerHTML = ps.map((p) => `<button class="chip ${p.year === state.year ? 'is-active' : ''}" data-year="${p.year}">${esc(p.label)} · ${p.year}</button>`).join('');
      axis.innerHTML = ps.map((p) => `<div class="period-node ${p.year === state.year ? 'is-active' : ''}"><i></i><b>${p.year}</b><span>${esc(p.label)}</span></div>`).join('');
      cut.textContent = `知识截止：${cur.era}（${cur.year}） · ${person.name}`;
      qBox.innerHTML = S().questions.map((q) => `<button class="q-item" data-q="${q.id}">${esc(q.text)}</button>`).join('');
      state.messages = [];
      paintChat();
    };

    peopleBox.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      state.personId = b.dataset.person; paint();
    });
    periodBox.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      state.year = Number(b.dataset.year); paint();
    });
    qBox.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const q = S().questions.find((x) => x.id === b.dataset.q);
      const cur = current();
      const person = findPerson(state.personId);
      const refused = q.year > cur.year;
      const text = refused
        ? '此事超出我此刻所知，不能预言后来的结果。'
        : (q.answers[state.personId] || q.answers.default);
      state.messages.push({ role: 'user', text: q.text });
      state.messages.push({
        role: 'answer', speaker: person.name, year: cur.year, refused, text,
        basis: refused
          ? [...q.basis, `你问的事发生在 ${q.year} 年，而对话设定在 ${cur.year} 年`]
          : q.basis,
        creation: refused
          ? [`拒答文案为本站固定模板，不含 ${q.year} 年之后的情节`]
          : q.creation,
      });
      paintChat();
    });
    paint();
  },
};

/* ---------------- 典籍室 ---------------- */
const sources = {
  title: '典籍室',
  render() {
    return `${chapterHead('典籍室', 6)}
    <p class="eyebrow">小说、正史、后世传说，分开标注</p>
    <h1 class="display-title">整个网站的<span class="accent">底线</span></h1>
    <p class="lead">借东风、草船借箭是小说写的；七擒孟获见于裴松之注，而非《三国志》陈寿正文。每一条内容都要说清自己从哪来。</p>
    <div class="seal-row">
      <div class="seal-block"><div class="big-seal novel">小说</div><p>演义描写 · 《三国演义》回目</p></div>
      <div class="seal-block"><div class="big-seal history">正史</div><p>史书记载 · 《三国志》及裴注</p></div>
      <div class="seal-block"><div class="big-seal legend">传说</div><p>后世传说 · 民间、戏曲与演绎</p></div>
    </div>
    <h2 class="section-title">双索引 <small>演义回目 120 + 史书卷目 65</small></h2>
    <div class="index-columns">
      <div class="card"><h3>演义回目 · 120 回</h3><p>按六卷分组，每回可跳到导读与原文。</p>
        <div class="tag-row">${S().arcs.map((a) => `<button class="chip" data-jump-arc="${esc(a)}">${esc(a)}</button>`).join('')}</div>
        <p style="margin-top:14px"><a class="btn btn--sm" href="#/chapters">打开故事馆 →</a></p></div>
      <div class="card"><h3>史书卷目 · 65 卷</h3><p>《三国志》分魏书三十卷、蜀书十五卷、吴书二十卷。本站只建立卷目索引，原文待接入公版底本。</p>
        <div class="tag-row"><span class="chip">魏书 1–30</span><span class="chip">蜀书 1–15</span><span class="chip">吴书 1–20</span></div>
        <p class="muted" style="font-size:12px;margin-top:12px">不整本搬运受版权保护的现代整理本。</p></div>
    </div>
    <h2 class="section-title">出处对照 <small>${S().sources.length} 条 · 点击印章可筛选</small></h2>
    <div class="filter-bar" id="source-filters">
      <button class="btn btn--sm is-active" data-type="全部">全部</button>
      <button class="btn btn--sm" data-type="演义">小说</button>
      <button class="btn btn--sm" data-type="正史">正史</button>
      <button class="btn btn--sm" data-type="传说">传说</button>
    </div>
    <div class="source-grid" id="source-grid"></div>
    ${closing('分开标注，才能一路查到原文')}`;
  },
  mount(root, ctx) {
    const grid = root.querySelector('#source-grid');
    const bar = root.querySelector('#source-filters');
    let type = '全部';
    const paint = () => {
      const list = S().sources.filter((s) => type === '全部' || s.type === type);
      grid.innerHTML = list.map((s) => `<article class="card source-card" id="src-${s.id}">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">${sourceTag(s.type)}<span class="ref">${esc(s.ref)}</span></div>
        <h3 style="margin-top:12px">${esc(s.title)}</h3>
        <blockquote>${esc(s.quote)}</blockquote>
        <p class="note">${esc(s.note)}</p>
        <div class="tag-row" style="margin-top:12px">${s.chapters.map((id) => chapterLink(id)).join('')}${s.tags.map((t) => `<span class="tag tag--neutral">${esc(t)}</span>`).join('')}</div>
      </article>`).join('');
      const focus = ctx.query.get('focus');
      if (focus) {
        const el = grid.querySelector(`#src-${CSS.escape(focus)}`);
        if (el) { el.style.borderColor = 'var(--red)'; el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      }
    };
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      type = b.dataset.type;
      [...bar.querySelectorAll('button')].forEach((x) => x.classList.toggle('is-active', x === b));
      paint();
    });
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-jump-arc]'); if (!b) return;
      location.hash = `#/chapters?arc=${encodeURIComponent(b.dataset.jumpArc)}`;
    });
    paint();
  },
};

/* ---------------- 搜索 ---------------- */
const search = {
  title: '检索',
  render(ctx) {
    const q = ctx.query.get('q') || '';
    return `${chapterHead('检索', 7)}
    <p class="eyebrow">人名、地名、回目、事件、出处，一处可查</p>
    <h1 class="display-title">找一个人、<span class="accent">一处地</span>，或某一回</h1>
    <div class="search-input-row"><input id="search-input" type="search" value="${esc(q)}" placeholder="例如：诸葛亮 / 赤壁 / 第49回 / 草船借箭" aria-label="搜索关键词"><button class="btn btn--primary" id="search-btn">检索</button></div>
    <div id="search-results"></div>
    ${closing('从一条线索，走到下一条')}`;
  },
  mount(root, ctx) {
    const input = root.querySelector('#search-input');
    const box = root.querySelector('#search-results');
    const labels = { chapter: '回目', person: '人物', event: '事件', place: '地点', source: '出处' };
    const paint = () => {
      const q = input.value.trim();
      if (!q) { box.innerHTML = empty('输入一个关键词开始检索'); return; }
      const hits = (window.SEARCH || []).filter((x) => `${x.title} ${x.sub} ${x.keywords}`.toLowerCase().includes(q.toLowerCase()));
      if (!hits.length) { box.innerHTML = empty(`没有找到与「${q}」相关的内容`); return; }
      const groups = Object.keys(labels).map((type) => {
        const list = hits.filter((h) => h.type === type);
        return list.length ? `<div class="result-group"><h3>${labels[type]} <small class="muted" style="font-size:12px">${list.length} 条</small></h3>
          ${list.slice(0, 30).map((h) => `<a class="result-item" href="${h.href}">${esc(h.title)}<small>${esc(h.sub)}</small></a>`).join('')}</div>` : '';
      }).join('');
      box.innerHTML = `<p class="muted" style="font-size:13px">共 ${hits.length} 条结果</p>${groups}`;
    };
    input.addEventListener('input', paint);
    root.querySelector('#search-btn').addEventListener('click', paint);
    paint();
  },
};

/* ---------------- 关于 ---------------- */
const about = {
  title: '关于',
  render() {
    const st = S().stats;
    return `${chapterHead('关于', 8)}
    <p class="eyebrow">站名「三国寻踪」为暂定名</p>
    <h1 class="display-title">这套内容，<span class="accent">是怎么做出来的</span></h1>
    <div class="prose">
      <p>本站把《三国演义》120 回拆成故事、人物、地理、时间与原文五条线索，参照「一卷三国，万千人生」式的分卷叙事，但坚持三条自己的规则。</p>
      <h3>三条内容原则</h3>
      <ul>
        <li><b>出处三分法</b>：每条内容打且只打一个标签——演义（小说）、正史（《三国志》及裴注）、传说（后世民间与戏曲），UI 上固定颜色。</li>
        <li><b>同一条动线</b>：插画 → 回目 → 人物 → 地理/年表 → 原文 → 史料。不分成儿童版与成人版，只在同一页往下滚时逐层展开。</li>
        <li><b>时间优先</b>：人物阵营、关系与对话都带年份；晚于当前时期的事不进入回答。</li>
      </ul>
      <h3 id="credits">底本与版权</h3>
      <ul>
        <li>120 回回目名来自公版古籍目录，本站仅收录回目与自撰导读，不转载任何受版权保护的现代整理本全文。</li>
        <li>「读原文」外链指向第三方在线阅读站，链接随公版目录一并保存，可在 <code>content/catalog.json</code> 中替换。</li>
        <li>史料只作短引并注明出处；插画为 AI 生成的水墨风格示意配图（人物为写意剪影，非史料图像）；地图底图为 AI 山水绘卷，均不含行政边界。</li>
        <li>地图为不含任何行政边界与真实经纬度的手绘示意绘卷，不接在线底图、不采集位置数据。</li>
      </ul>
      <h3>当前实现范围</h3>
      <table class="stat-table"><tr><th>项目</th><th>状态</th></tr>
        <tr><td>120 回索引</td><td>${st.chapters} 回，全部可打开</td></tr>
        <tr><td>完整导读</td><td>${st.reviewedChapters} 回已校，其余显示「导读待补」占位</td></tr>
        <tr><td>人物与关系</td><td>${st.people} 人 / ${st.relations} 条关系，全部带出处</td></tr>
        <tr><td>插画</td><td>AI 水墨插画 120 张已上线；导读覆盖 27 回，其余回目导读待补</td></tr>
        <tr><td>对话台</td><td>按时期预置语料，未接入大模型</td></tr>
        <tr><td>典籍室</td><td>回目索引已建，史书卷目索引已建，原文待接入公版底本</td></tr>
      </table>
      <h3>技术说明</h3>
      <p>零依赖静态站：内容源为仓库内 JSON，<code>npm run build</code> 合并校验后生成 <code>data/site.json</code> 与搜索索引；前端为原生 ES Modules + Canvas/SVG，<code>npm start</code> 启动本地预览。构建期会校验引用完整性、三分法标签、年份范围，以及「无出处的关系不允许入库」。</p>
      <h3>相关文档</h3>
      <ul>
        <li><a class="red" href="docs/三国读书内容网站-策划方案.md">完整策划方案</a></li>
        <li><a class="red" href="docs/三国图志视频逐帧拆解.md">对标视频逐帧拆解</a></li>
      </ul>
      <p class="muted" style="font-size:12px">数据构建时间：${esc(S().meta.generatedAt)}　版本：${esc(S().meta.version)}</p>
    </div>
    ${closing('从一回故事，走到一个人、一片山河')}`;
  },
};

const notFound = {
  title: '未找到',
  render(ctx) {
    return `${chapterHead('检索', 8)}<h1 class="display-title">这一页<span class="accent">还没写进来</span></h1>
      ${empty(`没有找到「${esc(ctx.path)}」对应的内容`)}<p style="margin-top:20px"><a class="btn btn--primary" href="#/">回到首页</a></p>`;
  },
};

export const pages = { home, chapters, chapter, event, people, person, star, map, dialogue, sources, search, about, notFound };
