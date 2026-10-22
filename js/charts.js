// Minimal dependency-free SVG line chart with log axes, reference lines and hover tooltip.

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
};

function scale(lo, hi, a, b, log) {
  if (log) {
    const L0 = Math.log10(lo), L1 = Math.log10(hi);
    const f = (v) => a + (Math.log10(v) - L0) / (L1 - L0) * (b - a);
    f.inv = (p) => 10 ** (L0 + (p - a) / (b - a) * (L1 - L0));
    return f;
  }
  const f = (v) => a + (v - lo) / (hi - lo) * (b - a);
  f.inv = (p) => lo + (p - a) / (b - a) * (hi - lo);
  return f;
}

function logTicks(lo, hi, maxN = 9) {
  const out = [];
  for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++) {
    for (const m of [1, 2, 5]) {
      const v = m * 10 ** e;
      if (v >= lo * 0.999 && v <= hi * 1.001) out.push({ v, major: m === 1 });
    }
  }
  // thin out if too dense
  if (out.length > maxN) return out.filter((t) => t.major);
  return out;
}

function linTicks(lo, hi, n = 5) {
  const step0 = (hi - lo) / n;
  const p = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= step0);
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push({ v: +v.toPrecision(10), major: true });
  return out;
}

/**
 * opts: {
 *   data: [[x, y], ...], xLog, yLog, xDomain, yDomain,
 *   xFmt, yFmt, xTitle, yTitle,
 *   hRefs: [{ y, label, cls }], vRefs: [{ x, label, cls, onClick, on }],
 *   points: [{ x, y, cls, label, anchor }],
 *   tip: (x, y) => html, height
 * }
 */
export function lineChart(container, opts) {
  const W = Math.max(container.clientWidth || 480, 280);
  const H = opts.height || 220;
  const m = { l: 62, r: 16, t: opts.vRefs?.some((r) => r.label) ? 32 : 14, b: 50 };
  container.innerHTML = '';
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': opts.ariaLabel || '' }, container);
  const [x0, x1] = opts.xDomain, [y0, y1] = opts.yDomain;
  const X = scale(x0, x1, m.l, W - m.r, opts.xLog);
  const Y = scale(y0, y1, H - m.b, m.t, opts.yLog);

  // grid + ticks
  const xt = opts.xLog ? logTicks(x0, x1, Math.floor((W - m.l - m.r) / 72)) : linTicks(x0, x1, Math.max(3, Math.floor(W / 90)));
  const yt = opts.yLog ? logTicks(y0, y1) : linTicks(y0, y1, 4);
  for (const t of yt) {
    el('line', { x1: m.l, x2: W - m.r, y1: Y(t.v), y2: Y(t.v), class: 'gridline' }, svg);
    el('text', { x: m.l - 9, y: Y(t.v) + 4.5, 'text-anchor': 'end', class: 'tick' }, svg).textContent = opts.yFmt(t.v);
  }
  for (const t of xt) {
    if (!t.major && opts.xLog && xt.length > 6) {
      el('line', { x1: X(t.v), x2: X(t.v), y1: H - m.b, y2: H - m.b + 3, class: 'axis' }, svg);
    }
    el('text', { x: X(t.v), y: H - m.b + 20, 'text-anchor': 'middle', class: 'tick' }, svg).textContent = opts.xFmt(t.v);
  }
  el('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, class: 'axis' }, svg);
  if (opts.xTitle) el('text', { x: (m.l + W - m.r) / 2, y: H - 5, 'text-anchor': 'middle', class: 'axis-title' }, svg).textContent = opts.xTitle;
  if (opts.yTitle) el('text', { x: 12, y: (m.t + H - m.b) / 2, 'text-anchor': 'middle', class: 'axis-title', transform: `rotate(-90 12 ${(m.t + H - m.b) / 2})` }, svg).textContent = opts.yTitle;

  const clipId = 'c' + Math.random().toString(36).slice(2);
  const cp = el('clipPath', { id: clipId }, el('defs', {}, svg));
  el('rect', { x: m.l, y: m.t - 1, width: W - m.l - m.r, height: H - m.t - m.b + 2 }, cp);

  // vertical refs (e.g. sources) below the line
  for (const r of opts.vRefs || []) {
    if (r.x < x0 || r.x > x1) continue;
    const g = el('g', {}, svg);
    el('line', { x1: X(r.x), x2: X(r.x), y1: m.t - 4, y2: H - m.b, class: r.cls }, g);
    if (r.label) {
      el('text', { x: X(r.x), y: m.t - 11, 'text-anchor': 'middle', class: r.lblCls || 'lbl' }, g).textContent = r.label;
    }
    if (r.onClick) {
      const hit = el('rect', { x: X(r.x) - 12, y: 0, width: 24, height: H - m.b, class: 'src-hit' }, g);
      hit.addEventListener('click', r.onClick);
      el('title', {}, hit).textContent = r.title || r.label;
    }
  }

  // series
  const pts = opts.data.filter(([x, y]) => x >= x0 && x <= x1 && y > (opts.yLog ? 0 : -Infinity));
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)},${Y(Math.min(Math.max(y, y0), y1 * 1.5)).toFixed(1)}`).join('');
  if (opts.area && pts.length) {
    el('path', { d: `${d}L${X(pts.at(-1)[0]).toFixed(1)},${H - m.b}L${X(pts[0][0]).toFixed(1)},${H - m.b}Z`, class: 'area', 'clip-path': `url(#${clipId})` }, svg);
  }
  el('path', { d, class: 'line', 'clip-path': `url(#${clipId})` }, svg);

  // horizontal refs
  for (const r of opts.hRefs || []) {
    if (r.y < y0 || r.y > y1) continue;
    el('line', { x1: m.l, x2: W - m.r, y1: Y(r.y), y2: Y(r.y), class: r.cls || 'ref' }, svg);
    if (r.label) el('text', { x: W - m.r - 2, y: Y(r.y) - 5, 'text-anchor': 'end', class: 'lbl' }, svg).textContent = r.label;
  }

  // points (with optional dashed guides to both axes)
  const inside = (p) => p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1;
  for (const p of opts.points || []) {
    if (!inside(p) || !p.guide) continue;
    el('path', { d: `M${m.l},${Y(p.y)}H${X(p.x)}V${H - m.b}`, class: p.guide, fill: 'none' }, svg);
  }
  for (const p of opts.points || []) {
    if (!inside(p)) continue;
    el('circle', { cx: X(p.x), cy: Y(p.y), r: 6, class: p.cls || 'dot' }, svg);
    if (p.label) {
      // preferred side, flipped if the label would leave the plot (~7px per character)
      const w = p.label.length * 8;
      let right = p.side ? p.side === 'right' : X(p.x) < (m.l + W - m.r) / 2;
      if (right && X(p.x) + 12 + w > W - m.r) right = false;
      if (!right && X(p.x) - 12 - w < m.l) right = true;
      el('text', {
        x: X(p.x) + (right ? 12 : -12), y: Y(p.y) + (p.dy ?? -8),
        'text-anchor': right ? 'start' : 'end', class: 'lbl-strong',
      }, svg).textContent = p.label;
    }
  }

  // hover layer
  if (opts.tip && pts.length > 1) {
    const tip = document.createElement('div');
    tip.className = 'tip';
    container.appendChild(tip);
    const cross = el('line', { y1: m.t, y2: H - m.b, class: 'cross', opacity: 0 }, svg);
    const hd = el('circle', { r: 4.5, class: 'hover-dot', opacity: 0 }, svg);
    const overlay = el('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: 'transparent' }, svg);
    const xs = pts.map((p) => p[0]);
    const move = (ev) => {
      const rect = svg.getBoundingClientRect();
      const px = (ev.clientX - rect.left) * (W / rect.width);
      const xv = X.inv(px);
      let lo = 0, hi = xs.length - 1;
      while (hi - lo > 1) { const k = (lo + hi) >> 1; if (xs[k] > xv) hi = k; else lo = k; }
      const [xa, ya] = pts[Math.abs(xs[lo] - xv) < Math.abs(xs[hi] - xv) ? lo : hi];
      const cx = X(xa), cy = Y(Math.min(Math.max(ya, y0), y1));
      cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.setAttribute('opacity', 1);
      hd.setAttribute('cx', cx); hd.setAttribute('cy', cy); hd.setAttribute('opacity', 1);
      tip.innerHTML = opts.tip(xa, ya);
      const sx = rect.width / W;
      tip.style.left = `${Math.min(Math.max(cx * sx, 70), rect.width - 70)}px`;
      tip.style.top = `${cy * sx}px`;
      tip.style.opacity = 1;
    };
    const leave = () => { cross.setAttribute('opacity', 0); hd.setAttribute('opacity', 0); tip.style.opacity = 0; };
    overlay.addEventListener('pointermove', move);
    overlay.addEventListener('pointerdown', move);
    overlay.addEventListener('pointerleave', leave);
    // the overlay covers clickable vertical refs; forward clicks that land near one
    overlay.addEventListener('click', (ev) => {
      const rect = svg.getBoundingClientRect();
      const px = (ev.clientX - rect.left) * (W / rect.width);
      const hit = (opts.vRefs || []).find((r) => r.onClick && Math.abs(X(r.x) - px) < 10);
      if (hit) hit.onClick();
    });
  }
  return svg;
}
