import { rng, esc } from './ui.js';

/** 手绘示意绘卷：只有山川、河流与城池点，不含任何行政边界或真实经纬度 */
export function mapSVG(places) {
  const r = rng(77);
  const mountain = (baseY, amp, fill, opacity) => {
    let d = `M0 ${baseY}`;
    for (let x = 0; x <= 1000; x += 50) d += ` L${x} ${Math.round(baseY - r() * amp)}`;
    return `<path d="${d} L1000 600 L0 600 Z" fill="${fill}" opacity="${opacity}"/>`;
  };
  const dots = places.map((p, i) => {
    const x = p.x * 10, y = p.y * 6;
    const left = i % 2 === 1;
    const tx = x + (left ? -11 : 11), ty = y + (left ? 17 : -8);
    return `<g class="map-place" data-id="${esc(p.id)}" role="button" tabindex="0" aria-label="${esc(p.name)}">
      <circle class="map-dot" cx="${x}" cy="${y}" r="5" fill="#6B5A42" opacity=".85"/>
      <text class="map-label" x="${tx}" y="${ty}" text-anchor="${left ? 'end' : 'start'}" font-size="13" fill="#3A3327" stroke="#F0E5CC" stroke-width="3" paint-order="stroke">${esc(p.name)}</text>
    </g>`;
  }).join('');
  return `<svg class="map-svg" viewBox="0 0 1000 600" role="img" aria-label="三国时期山川城池示意绘卷" xmlns="http://www.w3.org/2000/svg">
  <rect width="1000" height="600" fill="#E6D8B8"/>
  <rect width="1000" height="600" fill="none" stroke="#C4B48F" stroke-width="3"/>
  ${mountain(220, 120, '#A9A98B', .28)}
  ${mountain(300, 90, '#8D9A83', .3)}
  ${mountain(390, 70, '#778C79', .26)}
  <path d="M40 190 C 210 160, 300 230, 430 205 S 690 165, 950 215" fill="none" stroke="#84A6AD" stroke-width="8" opacity=".65" stroke-linecap="round"/>
  <path d="M120 430 C 290 395, 430 450, 570 425 S 810 385, 970 415" fill="none" stroke="#7C9FA9" stroke-width="10" opacity=".7" stroke-linecap="round"/>
  <path d="M900 230 C 930 320, 880 400, 940 500" fill="none" stroke="#84A6AD" stroke-width="6" opacity=".35"/>
  <text x="60" y="176" font-size="13" fill="#5C6E70" opacity=".8">大河</text>
  <text x="60" y="414" font-size="13" fill="#5C6E70" opacity=".8">大江</text>
  <g opacity=".16" stroke="#6B5A42" stroke-width="1">
    <path d="M0 120 H1000 M0 300 H1000 M0 480 H1000"/>
    <path d="M200 0 V600 M500 0 V600 M800 0 V600"/>
  </g>
  ${dots}
  <text x="965" y="578" text-anchor="end" font-size="12" fill="#7A6B50">山水绘卷 · 示意，无行政边界</text>
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
