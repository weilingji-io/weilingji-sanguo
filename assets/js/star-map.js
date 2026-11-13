import { rng } from './ui.js';

const EDGE = {
  '正史': { color: 'rgba(121,198,168,.8)', dash: [] },
  '演义': { color: 'rgba(226,132,112,.85)', dash: [5, 4] },
  '传说': { color: 'rgba(214,178,106,.85)', dash: [1, 5] },
};

export function initStarMap(canvas, { people, relations, onSelect = () => {} } = {}) {
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return null;

  const points = people.map((p, i) => {
    const t = (i + 0.5) / people.length;
    return {
      id: p.id, name: p.name, weight: p.weight || 2, since: p.since || 184,
      lat: Math.asin(1 - 2 * t), lon: i * 2.39996323,
    };
  });
  const byId = new Map(points.map((p) => [p.id, p]));
  const bgStars = (() => {
    const r = rng(2026);
    return Array.from({ length: 130 }, () => ({ x: r(), y: r(), a: .1 + r() * .45, s: .4 + r() * 1.1 }));
  })();

  let rot = 0.4, tilt = 0.22, targetRot = null, autoRotate = true;
  let filter = 'all', year = 280, selected = null, w = 0, h = 0, dpr = 1;
  let pointer = null, moved = false, raf = 0;

  const project = (p) => {
    const lon = p.lon + rot;
    const cl = Math.cos(p.lat), sl = Math.sin(p.lat);
    const x = cl * Math.sin(lon);
    const y = sl * Math.cos(tilt) - cl * Math.cos(lon) * Math.sin(tilt);
    const z = cl * Math.cos(lon) * Math.cos(tilt) + sl * Math.sin(tilt);
    return { x, y, z };
  };
  const screen = (v) => ({ x: w / 2 + v.x * (Math.min(w, h) * .42), y: h / 2 - v.y * (Math.min(w, h) * .42) });

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rect.width; h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * .42;

    for (const s of bgStars) {
      ctx.fillStyle = `rgba(220,230,240,${s.a})`;
      ctx.fillRect(s.x * w, s.y * h, s.s, s.s);
    }

    const g = ctx.createRadialGradient(cx - R * .32, cy - R * .35, R * .08, cx, cy, R);
    g.addColorStop(0, 'rgba(38,74,96,.62)');
    g.addColorStop(.65, 'rgba(16,39,56,.72)');
    g.addColorStop(1, 'rgba(7,18,28,.9)');
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(cx, cy, R + i * 3, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(170,210,220,${.28 - i * .08})`; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    for (let i = 0; i < 9; i++) {
      const yy = cy - R + (i + 1) * (2 * R / 10);
      ctx.beginPath(); ctx.ellipse(cx, yy, R * Math.sqrt(Math.max(0, 1 - Math.pow((yy - cy) / R, 2))), R * .055, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(150,195,210,.07)'; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.restore();

    const visible = points.map((p) => ({ p, v: project(p) })).sort((a, b) => a.v.z - b.v.z);
    const linked = new Set();
    if (selected) for (const r of relations) {
      if (r.from === selected) linked.add(r.to);
      if (r.to === selected) linked.add(r.from);
    }

    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R + 1, 0, Math.PI * 2); ctx.clip();
    if (selected && byId.has(selected)) {
      const from = screen(project(byId.get(selected)));
      for (const r of relations) {
        if (r.from !== selected && r.to !== selected) continue;
        if (filter !== 'all' && r.sourceType !== filter) continue;
        if (r.sinceYear > year) continue;
        const other = byId.get(r.from === selected ? r.to : r.from);
        if (!other) continue;
        const to = screen(project(other));
        const st = EDGE[r.sourceType] || EDGE['正史'];
        ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y);
        ctx.setLineDash(st.dash); ctx.strokeStyle = st.color; ctx.lineWidth = r.sourceType === '正史' ? 1.25 : 1;
        ctx.stroke(); ctx.setLineDash([]);
      }
    }
    ctx.restore();

    let labelCount = 0;
    for (const { p, v } of visible) {
      const s = screen(v);
      const front = v.z > 0;
      const notYet = p.since > year;
      let a = front ? .9 : .22;
      if (notYet) a *= .22;
      const isSel = p.id === selected;
      const rad = (1.3 + p.weight * .45) * (front ? 1 : .7) + (isSel ? 2.5 : 0);
      if (isSel) {
        const halo = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, 20);
        halo.addColorStop(0, 'rgba(240,205,120,.85)');
        halo.addColorStop(1, 'rgba(240,205,120,0)');
        ctx.beginPath(); ctx.arc(s.x, s.y, 20, 0, Math.PI * 2); ctx.fillStyle = halo; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(s.x, s.y, rad, 0, Math.PI * 2);
      ctx.fillStyle = isSel ? '#F0CD78' : `rgba(205,225,235,${a})`;
      ctx.fill();
      if (front && !notYet && labelCount < 22 && (p.weight >= 4 || isSel || linked.has(p.id))) {
        ctx.font = '11px "PingFang SC", system-ui, sans-serif';
        ctx.fillStyle = isSel ? 'rgba(245,222,165,.98)' : `rgba(220,230,238,${Math.min(.85, a)})`;
        ctx.textAlign = 'center';
        ctx.fillText(p.name, s.x, s.y - rad - 6);
        labelCount++;
      }
    }
  }

  function tick() {
    if (!document.hidden) {
      if (targetRot !== null) {
        let d = targetRot - rot;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        rot += d * .09;
        if (Math.abs(d) < .004) { rot = targetRot; targetRot = null; }
      } else if (autoRotate) rot += .0022;
      draw();
    }
    raf = requestAnimationFrame(tick);
  }

  const onDown = (e) => {
    pointer = { x: e.clientX, y: e.clientY, rot, tilt }; moved = false; targetRot = null;
    canvas.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (!pointer) return;
    const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
    if (moved) {
      rot = pointer.rot + dx * .006;
      tilt = Math.max(-.6, Math.min(.6, pointer.tilt + dy * .003));
      if (!document.hidden) draw();
    }
  };
  const onUp = (e) => {
    if (!pointer) return;
    const wasMoved = moved;
    pointer = null;
    if (wasMoved) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    let best = null, bestD = 26;
    for (const p of points) {
      const v = project(p);
      if (v.z <= 0 || p.since > year) continue;
      const s = screen(v);
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < bestD) { bestD = d; best = p.id; }
    }
    if (best) focus(best);
  };

  function focus(id) {
    const p = byId.get(id);
    if (!p) return;
    selected = id;
    let t = -p.lon;
    while (t - rot > Math.PI) t -= Math.PI * 2;
    while (t - rot < -Math.PI) t += Math.PI * 2;
    targetRot = t;
    onSelect(id);
    draw();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas.parentElement || canvas);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  resize();
  raf = requestAnimationFrame(tick);

  return {
    focus,
    setFilter(f) { filter = f; draw(); },
    setYear(y) { year = y; draw(); },
    setAutoRotate(v) { autoRotate = v; if (v) targetRot = null; },
    getSelected: () => selected,
    destroy() {
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    },
  };
}
