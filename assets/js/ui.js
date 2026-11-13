const TYPE_CLASS = { '演义': 'novel', '正史': 'history', '传说': 'legend' };

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const site = () => window.SITE;
export const findPerson = (id) => site().people.find((p) => p.id === id);
export const findChapter = (id) => site().chapters.find((c) => c.id === id);
export const findEvent = (id) => site().events.find((e) => e.id === id);
export const findPlace = (id) => site().places.find((p) => p.id === id);
export const findSource = (id) => site().sources.find((s) => s.id === id);

export const tag = (type, label) => `<span class="tag tag--${TYPE_CLASS[type] || 'neutral'}">${esc(label || type)}</span>`;
export const sourceTag = (type) => tag(type, type === '演义' ? '小说' : type === '正史' ? '正史' : '传说');
export const seal = (char, cls = '') => `<span class="seal ${cls}">${esc(char)}</span>`;

export function chapterHead(name, index = 1, total = 9) {
  const pct = Math.max(8, Math.min(100, Math.round((index / total) * 100)));
  return `<div class="chapter-head">${seal(String(index))}<span class="chapter-name">${esc(name)}</span><span class="progress-dashes" aria-hidden="true"><i style="width:${pct}%"></i></span></div>`;
}

export const closing = (text) => `<div class="closing">${esc(text)}</div>`;
export const notice = (html) => `<div class="notice">${html}</div>`;
export const empty = (text) => `<div class="placeholder-guide">${esc(text)}</div>`;
export const bigNumber = (n, unit = '') => `<div class="big-number">${esc(n)}${unit ? `<small>${esc(unit)}</small>` : ''}</div>`;

export const personLink = (id, text) => {
  const p = findPerson(id);
  return p ? `<a class="chip" href="#/people/${p.id}">${esc(p.name)}</a>` : '';
};

export const chapterLink = (id, label) => {
  const c = findChapter(id);
  return c ? `<a class="chip" href="#/chapters/${c.id}">${esc(label || `第${c.no}回`)}</a>` : '';
};

export const eventLink = (id) => {
  const e = findEvent(id);
  return e ? `<a class="chip" href="#/events/${e.id}">${esc(e.name)}</a>` : '';
};

export const panel = (title, body) => `<div class="paper-panel"><div class="panel-bar"><i></i><i></i><i></i><span>${esc(title)}</span></div><div class="panel-body">${body}</div></div>`;

export function rng(seed) {
  let a = (Number(seed) || 1) * 9301 + 49297;
  return () => { a = (a * 9301 + 49297) % 233280; return a / 233280; };
}

/** 程序化水墨示意插画：确定性生成，不依赖任何外部图片 */
export function illustration(seed = 1, opts = {}) {
  const r = rng(seed);
  const warm = (seed % 3) !== 0;
  const sky1 = warm ? '#F0D9A8' : '#D9DCCD';
  const sky2 = warm ? '#E7B27C' : '#B9C6C2';
  const ridge = (baseY, amp, fill, opacity) => {
    let d = `M0 ${baseY}`;
    for (let x = 0; x <= 800; x += 80) d += ` L${x} ${Math.round(baseY - r() * amp)}`;
    return `<path d="${d} L800 450 L0 450 Z" fill="${fill}" opacity="${opacity}"/>`;
  };
  const birds = Array.from({ length: 3 }, () => {
    const x = 120 + r() * 600, y = 60 + r() * 90;
    return `<path d="M${x} ${y} q6 -5 12 0 q6 -5 12 0" fill="none" stroke="#5A5142" stroke-width="1.3" opacity=".5"/>`;
  }).join('');
  const boats = Array.from({ length: 1 + Math.floor(r() * 3) }, () => {
    const x = 90 + r() * 600, y = 300 + r() * 70, s = .7 + r() * .6;
    return `<g transform="translate(${x} ${y}) scale(${s})" opacity=".72">
      <path d="M-42 22 L42 22 L28 34 L-28 34 Z" fill="#4A3C2C"/>
      <path d="M0 20 L0 -54 L34 -12 L0 -12 Z" fill="#6B5740"/>
      <path d="M0 20 L0 -54" stroke="#3E3225" stroke-width="2"/>
    </g>`;
  }).join('');
  const fire = opts.fire || seed === 49 || seed === 46
    ? Array.from({ length: 9 }, () => {
        const x = 120 + r() * 560, y = 250 + r() * 90;
        return `<circle cx="${x}" cy="${y}" r="${3 + r() * 9}" fill="#D9743C" opacity="${.25 + r() * .4}"/>`;
      }).join('') : '';
  const water = Array.from({ length: 7 }, () => {
    const y = 340 + r() * 95, x = r() * 700;
    return `<path d="M${x} ${y} q20 -4 40 0 q20 4 40 0" fill="none" stroke="#8FA3A0" stroke-width="1" opacity=".45"/>`;
  }).join('');
  return `<svg class="illus" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" role="img" aria-label="第${seed}回示意水墨插画" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="sky${seed}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky1}"/><stop offset="1" stop-color="${sky2}"/></linearGradient></defs>
  <rect width="800" height="450" fill="url(#sky${seed})"/>
  <circle cx="${600 + r() * 120}" cy="${110 + r() * 40}" r="${28 + r() * 16}" fill="#F7E3B4" opacity=".85"/>
  ${ridge(230, 90, '#8A8A76', .28)}
  ${ridge(280, 70, '#6F7566', .34)}
  ${ridge(330, 45, '#556055', .38)}
  <rect y="330" width="800" height="120" fill="#C9BFA1" opacity=".55"/>
  ${water}${fire}${boats}${birds}
  <rect width="800" height="450" fill="none" stroke="rgba(70,55,35,.18)" stroke-width="2"/>
</svg><span class="illus-label">示意水墨图 · 待替换为正式插画</span>`;
}

/** 程序化人物剪影，避免直接使用他人作品的立绘 */
export function portrait(seed = 1) {
  const r = rng(seed * 7 + 13);
  const robe = ['#5A4A38', '#4A5148', '#6B4A3A', '#43505A', '#705A40'][Math.floor(r() * 5)];
  const skin = '#D9BE96';
  return `<svg viewBox="0 0 100 140" role="img" aria-label="人物示意剪影" xmlns="http://www.w3.org/2000/svg">
  <path d="M18 138 Q20 78 34 66 L50 60 L66 66 Q80 78 82 138 Z" fill="${robe}"/>
  <path d="M34 66 Q50 82 66 66 L60 60 L40 60 Z" fill="#E4D6B8" opacity=".85"/>
  <rect x="38" y="16" width="24" height="9" rx="2" fill="#3C3327"/>
  <ellipse cx="50" cy="42" rx="16" ry="19" fill="${skin}"/>
  <path d="M34 38 Q50 20 66 38 Q60 26 50 26 Q40 26 34 38 Z" fill="#2E2820"/>
  <path d="M42 48 q3 2 6 0 M52 48 q3 2 6 0" stroke="#5A4636" stroke-width="1.2" fill="none"/>
  <path d="M44 58 q6 4 12 0" stroke="#8A6548" stroke-width="1.2" fill="none"/>
  <path d="M30 82 L18 118 M70 82 L82 118" stroke="${robe}" stroke-width="11" stroke-linecap="round"/>
</svg>`;
}

export const hashSeed = (s) => [...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0);
