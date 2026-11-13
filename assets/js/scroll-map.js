import { esc } from './ui.js';

/** 山河绘卷：AI 生成水墨山水为底图（无边界/无文字），城池点、河流与标签仍由本站绘制，保证信息可控 */
export function mapSVG(places) {
  const dots = places.map((p, i) => {
    const x = p.x * 10, y = p.y * 6;
    const left = i % 2 === 1;
    const tx = x + (left ? -11 : 11), ty = y + (left ? 17 : -8);
    return `<g class="map-place" data-id="${esc(p.id)}" role="button" tabindex="0" aria-label="${esc(p.name)}">
      <circle class="map-dot" cx="${x}" cy="${y}" r="5" fill="#6B5A42" opacity=".85"/>
      <text class="map-label" x="${tx}" y="${ty}" text-anchor="${left ? 'end' : 'start'}" font-size="13" fill="#3A3327" stroke="#F0E5CC" stroke-width="3" paint-order="stroke">${esc(p.name)}</text>
    </g>`;
  }).join('');
  return `<svg class="map-svg" viewBox="0 0 1000 600" role="img" aria-label="三国时期山川城池示意绘卷" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <image href="assets/img/art/map-scroll.webp" x="0" y="0" width="1000" height="600" preserveAspectRatio="xMidYMid slice"/>
  <rect width="1000" height="600" fill="none" stroke="#C4B48F" stroke-width="3"/>
  <path d="M40 190 C 210 160, 300 230, 430 205 S 690 165, 950 215" fill="none" stroke="#84A6AD" stroke-width="8" opacity=".65" stroke-linecap="round"/>
  <path d="M120 430 C 290 395, 430 450, 570 425 S 810 385, 970 415" fill="none" stroke="#7C9FA9" stroke-width="10" opacity=".7" stroke-linecap="round"/>
  <text x="60" y="176" font-size="13" fill="#5C6E70" opacity=".8">大河</text>
  <text x="60" y="414" font-size="13" fill="#5C6E70" opacity=".8">大江</text>
  ${dots}
  <text x="965" y="578" text-anchor="end" font-size="12" fill="#7A6B50" stroke="#F0E5CC" stroke-width="3" paint-order="stroke">山水绘卷 · 示意，无行政边界</text>
</svg>`;
}

export function createMap(host, places) {
  host.innerHTML = mapSVG(places);
  const svg = host.querySelector('svg');
  function paint({ activeIds = [], footprints = [], focusId = null } = {}) {
    const active = new Set(activeIds);
    const foot = new Set(footprints);
    svg.querySelectorAll('.map-place').forEach((g) => {
      const id = g.dataset.id;
      const c = g.querySelector('.map-dot');
      const t = g.querySelector('.map-label');
      let fill = '#6B5A42', rad = 5, opacity = .85, textOpacity = .82;
      if (foot.has(id)) { fill = '#35564C'; rad = 8; opacity = 1; textOpacity = 1; }
      if (active.has(id)) { fill = '#A63126'; rad = 9; opacity = 1; textOpacity = 1; }
      if (focusId === id) { rad = 11; opacity = 1; textOpacity = 1; }
      c.setAttribute('fill', fill);
      c.setAttribute('r', String(rad));
      c.setAttribute('opacity', String(opacity));
      t.setAttribute('opacity', String(textOpacity));
      g.style.cursor = 'pointer';
    });
  }
  return { svg, paint };
}

export function footprintIntersection(a, b) {
  if (!a || !b) return [];
  const set = new Set(b.footprints || []);
  return (a.footprints || []).filter((id) => set.has(id));
}
