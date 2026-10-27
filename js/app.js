import * as P from './physics.js';
import { SOURCES, MATERIALS, CONTAINERS, PRESETS } from './presets.js';
import { lineChart } from './charts.js';

const $ = (id) => document.getElementById(id);
const ICONS = {
  warn: '<svg viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>',
  bad: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6m0-6 6 6"/></svg>',
};

// ---------------------------------------------------------------- formatting
const sig = (x, n = 3) => {
  if (!isFinite(x)) return '–';
  if (x === 0) return '0';
  const a = Math.abs(x);
  if (a >= 1e5 || a < 1e-3) return x.toExponential(n - 1).replace('e+', 'e');
  const d = Math.max(0, n - 1 - Math.floor(Math.log10(a)));
  return x.toFixed(Math.min(d, 6));
};
function fmtLen(um) {
  if (!isFinite(um) || um <= 0) return '–';
  if (um < 1) return `${sig(um * 1000)} nm`;
  if (um < 1000) return `${sig(um)} µm`;
  if (um < 1e5) return `${sig(um / 1000)} mm`;
  return `${sig(um / 1e4)} cm`;
}
function fmtPct(T) {
  const p = T * 100;
  if (!isFinite(p)) return '–';
  if (p >= 99.95) return '≈ 100 %';
  if (p >= 10) return `${p.toFixed(1)} %`;
  if (p >= 0.01) return `${sig(p, 2)} %`;
  return `${p.toExponential(1)} %`;
}
const num = (x) => +(+x).toFixed(4);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------------------------------------------------------- state
const clone = (o) => JSON.parse(JSON.stringify(o));
function presetState(p, base = {}) {
  return {
    source: base.source || 'Cu',
    energy: base.energy || SOURCES[0].E,
    preset: p.id,
    base: p.id,
    basis: p.basis,
    porosity: p.porosity,
    phases: clone(p.phases),
    container: p.container || 'none',
    cFormula: base.cFormula, cDensity: base.cDensity, cThick: base.cThick,
    thickness: p.thickness,
    thickUnit: p.thickness >= 1000 ? 1000 : 1,
    target: p.target,
  };
}

let state;
function loadState() {
  const m = location.hash.match(/s=([^&]+)/);
  if (m) {
    try {
      const s = JSON.parse(decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/')))));
      if (s && Array.isArray(s.phases) && s.phases.length) return s;
    } catch (e) { /* fall through to default */ }
  }
  // default start: Mo Kα beam, porous titanium
  const mo = SOURCES.find((x) => x.id === 'Mo');
  return presetState(PRESETS.find((x) => x.id === 'ti-pores'), { source: mo.id, energy: mo.E });
}
function encodeState() {
  return btoa(unescape(encodeURIComponent(JSON.stringify(state)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
let hashTimer;
function saveHash() {
  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => history.replaceState(null, '', `#s=${encodeState()}`), 300);
}
function markModified() {
  if (state.preset) { state.preset = null; renderPicker(); }
}

// ---------------------------------------------------------------- library lookup
const LIB_BY_FORMULA = new Map();
for (const [name, formula, density] of MATERIALS) if (!LIB_BY_FORMULA.has(formula)) LIB_BY_FORMULA.set(formula, { name, density });
function suggestedDensity(formula) {
  const f = formula.trim();
  if (LIB_BY_FORMULA.has(f)) return LIB_BY_FORMULA.get(f).density;
  const el = P.element(f);
  if (el && el.d > 0.1) return el.d;
  return null;
}
// searchable material library: every word must match the name, formula or group
const LIB_HAY = MATERIALS.map(([name, formula, , group]) =>
  `${name} ${formula} ${formula.replace(/[()n]/g, '')} ${group}`.toLowerCase());
function searchMaterials(q) {
  const toks = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = MATERIALS.map((m, i) => i).filter((i) => toks.every((t) => LIB_HAY[i].includes(t)));
  if (!toks.length) return hits;
  const starts = (i) => MATERIALS[i][0].toLowerCase().startsWith(toks[0]) || MATERIALS[i][1].toLowerCase() === q.trim().toLowerCase();
  return [...hits.filter(starts), ...hits.filter((i) => !starts(i))];
}

// ---------------------------------------------------------------- beam
const MAIN_SOURCES = ['Cu', 'Mo', 'Ga', 'Ag'];
function renderBeam() {
  const inMain = MAIN_SOURCES.includes(state.source);
  const cur = SOURCES.find((s) => s.id === state.source);
  const moreOpen = !$('morePanel').hidden;
  $('srcbar').innerHTML = SOURCES.filter((s) => MAIN_SOURCES.includes(s.id)).map((s) => `
    <button role="radio" data-id="${s.id}" aria-checked="${state.source === s.id}" title="${esc(s.note)}">
      <b>${s.label}</b><small>${s.E.toFixed(2)}<span class="u"> keV</span></small>
    </button>`).join('') + `
    <button class="more-btn" role="radio" aria-checked="${!inMain}" aria-expanded="${moreOpen}" title="Other lab sources and synchrotron energies">
      <b>${inMain ? 'More' : (state.source === 'custom' ? 'Synch.' : cur.label)}</b><small>${inMain ? '<span class="u">sources </span>▾' : `${sig(state.energy, 4)}<span class="u"> keV</span>`}</small>
    </button>`;
  $('moreSources').innerHTML = SOURCES.filter((s) => !MAIN_SOURCES.includes(s.id)).map((s) => `
    <button role="radio" data-id="${s.id}" aria-checked="${state.source === s.id}">${s.id === 'custom' ? 'Synchrotron / custom' : s.label}${s.id === 'custom' ? '' : `<small>${s.E.toFixed(2)} keV</small>`}</button>`).join('');
  $('beamMeta').textContent = `${sig(state.energy, 4)} keV · λ ${sig(P.HC_KEV_A / state.energy, 4)} Å`;
}
function syncEnergyInputs(skip) {
  if (skip !== 'energy') $('energy').value = +state.energy.toFixed(4);
  if (skip !== 'wavelength') $('wavelength').value = +(P.HC_KEV_A / state.energy).toFixed(5);
}
function setSource(id) {
  const s = SOURCES.find((x) => x.id === id);
  state.source = id;
  if (id !== 'custom') state.energy = s.E;
  if (MAIN_SOURCES.includes(id)) $('morePanel').hidden = true;
  renderBeam(); syncEnergyInputs(); update();
  if (id === 'custom') $('energy').select();
}
function setEnergy(E, from) {
  if (!(E >= 1 && E <= 100)) return;
  state.energy = E;
  const match = SOURCES.find((s) => s.id !== 'custom' && Math.abs(s.E - E) < 0.0015);
  state.source = match ? match.id : 'custom';
  renderBeam(); syncEnergyInputs(from); update();
}

// ---------------------------------------------------------------- sample picker
function renderPicker() {
  const p = PRESETS.find((x) => x.id === (state.preset || state.base)) || PRESETS.at(-1);
  $('pickerIcon').textContent = p.icon;
  $('pickerTitle').textContent = state.preset ? p.title : 'Custom sample';
  $('pickerDesc').textContent = state.preset ? p.desc : `Based on: ${p.title}`;
  const groups = {};
  for (const x of PRESETS) (groups[x.group] ||= []).push(x);
  $('pickerMenu').innerHTML = Object.entries(groups).map(([g, list]) => `
    <div class="grp">${esc(g)}</div>` + list.map((x) => `
    <button class="opt" role="option" data-id="${x.id}" aria-selected="${state.preset === x.id}">
      <span class="pi" aria-hidden="true">${x.icon}</span><span><b>${esc(x.title)}</b><small>${esc(x.desc)}</small></span>
    </button>`).join('')).join('');
}
function setPicker(open) {
  $('pickerBtn').setAttribute('aria-expanded', open);
  $('pickerMenu').hidden = !open;
  if (open) ($('pickerMenu').querySelector('[aria-selected=true]') || $('pickerMenu').querySelector('.opt')).focus();
}
function applyPreset(id) {
  state = presetState(PRESETS.find((x) => x.id === id), state);
  openPhases.clear();
  renderAll();
}

// ---------------------------------------------------------------- phases
const openPhases = new Set();
const balanced = () => state.phases.length > 1;
const unit = () => (state.basis === 'vol' ? 'vol %' : 'wt %');
function rebalance() {
  if (!balanced()) { state.phases[0].fraction = 100; return; }
  const rest = state.phases.slice(1).reduce((a, p) => a + (+p.fraction || 0), 0);
  state.phases[0].fraction = +(100 - rest).toFixed(6);
}
const phaseSub = (p) => `${p.formula || '?'} · ${+sig(+p.density || 0, 4)} g/cm³`;

// density units: internally always g/cm³; number densities need the formula's mean atomic mass
const DUNITS = ['g/cm³', 'kg/m³', 'atoms/Å³', 'atoms/nm³'];
function meanAtomMass(formula) {
  const c = P.parseFormula(formula);
  return P.composition(c).M / Object.values(c).reduce((a, n) => a + n, 0);
}
function densityFactor(unit, formula) { // multiply a value in `unit` by this to get g/cm³
  if (unit === 'kg/m³') return 1e-3;
  if (unit === 'atoms/Å³') return meanAtomMass(formula) * P.AMU_G * 1e24;
  if (unit === 'atoms/nm³') return meanAtomMass(formula) * P.AMU_G * 1e21;
  return 1;
}
function densityShown(p) {
  try { return +sig(p.density / densityFactor(p.dUnit, p.formula), 5); } catch { return ''; }
}

function phaseHTML(p, i) {
  const open = openPhases.has(i);
  const frac = !balanced()
    ? `<div class="ph-bal">100 ${unit()}</div>`
    : i === 0
      ? `<div class="ph-bal" data-bal>${sig(+p.fraction, 4)} ${unit()}<small>remainder</small></div>`
      : `<div class="input-unit ph-frac"><input type="number" data-k="fraction" value="${num(p.fraction)}" min="0" max="100" step="any" aria-label="Fraction of ${esc(p.name)}"><em>${unit()}</em></div>`;
  return `
  <div class="phase${open ? ' open' : ''}" data-i="${i}" style="--pc: var(--ph-${(i % 5) + 1})">
    <div class="ph-row">
      <button class="ph-toggle" data-act="toggle" aria-expanded="${open}" title="Edit material, formula and density">
        <span class="chev" aria-hidden="true"></span>
        <span class="ph-dot" aria-hidden="true"></span>
        <span class="ph-txt"><b data-h="name">${esc(p.name)}</b><small data-h="sub">${esc(phaseSub(p))}</small></span>
      </button>
      ${frac}
    </div>
    <div class="ph-edit"${open ? '' : ' hidden'}>
      <div class="field full"><span>Material library</span>
        <div class="combo">
          <input type="text" class="combo-in" role="combobox" aria-expanded="false" aria-autocomplete="list" autocomplete="off" spellcheck="false"
            placeholder="Search by name or formula, e.g. TiO2, steel, PMMA" aria-label="Search material library">
          <div class="combo-list" role="listbox" hidden></div>
        </div>
      </div>
      <label class="field full ph-name"><span>Name</span><input type="text" data-k="name" value="${esc(p.name)}" spellcheck="false"></label>
      <label class="field"><span>Formula</span><input type="text" data-k="formula" value="${esc(p.formula)}" spellcheck="false" autocomplete="off" placeholder="e.g. CsPbBr3"></label>
      <label class="field"><span>Density <button type="button" class="linkish" data-act="cell" title="Calculate the density from the unit cell">from cell</button></span>
        <div class="input-unit"><input type="number" data-k="density" value="${densityShown(p)}" min="0" step="any">
          <select data-k="dUnit" aria-label="Density unit">${DUNITS.map((u) => `<option${(p.dUnit || 'g/cm³') === u ? ' selected' : ''}>${u}</option>`).join('')}</select></div></label>
      <div class="ph-err" data-err hidden></div>
      <div class="ph-foot">
        <span data-sugg></span>
        ${state.phases.length > 1 ? '<button type="button" class="linkish danger" data-act="del">Remove phase</button>' : ''}
      </div>
    </div>
  </div>`;
}
function renderPhases() {
  rebalance();
  $('phases').innerHTML = state.phases.map(phaseHTML).join('');
  document.querySelectorAll('#basisSeg button').forEach((b) => b.setAttribute('aria-checked', b.dataset.v === state.basis));
  $('porosity').value = state.porosity;
  $('porosityNum').value = state.porosity;
}
function refreshPhaseHeaders() {
  document.querySelectorAll('.phase').forEach((row) => {
    const p = state.phases[+row.dataset.i];
    row.querySelector('[data-h=name]').textContent = p.name;
    row.querySelector('[data-h=sub]').textContent = phaseSub(p);
  });
  const bal = document.querySelector('[data-bal]');
  if (bal) bal.innerHTML = `${sig(+state.phases[0].fraction, 4)} ${unit()}<small>remainder</small>`;
}

function onPhaseInput(e) {
  if (e.target.classList.contains('combo-in')) { renderCombo(e.target); return; }
  const row = e.target.closest('.phase');
  const k = e.target.dataset.k;
  if (!row || !k) return;
  const p = state.phases[+row.dataset.i];
  if (k === 'dUnit') { // only the display changes; the density itself stays the same
    p.dUnit = e.target.value;
    row.querySelector('input[data-k="density"]').value = densityShown(p);
    saveHash();
    return;
  }
  if (k === 'name' || k === 'formula') {
    p[k] = e.target.value;
    // a number density display depends on the formula, so refresh it (the mass density is kept)
    if (k === 'formula' && /atoms/.test(p.dUnit || '')) row.querySelector('input[data-k="density"]').value = densityShown(p);
  } else if (k === 'density') {
    let f = NaN;
    try { f = densityFactor(p.dUnit, p.formula); } catch { /* invalid formula: flagged by validatePhases */ }
    p.density = (parseFloat(e.target.value) || 0) * f || 0;
  } else p[k] = parseFloat(e.target.value) || 0;
  if (k === 'fraction') rebalance();
  if (k !== 'name') markModified();
  refreshPhaseHeaders();
  update();
}
function onPhaseClick(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const i = +btn.closest('.phase').dataset.i;
  const act = btn.dataset.act;
  if (act === 'toggle') {
    openPhases.has(i) ? openPhases.delete(i) : openPhases.add(i);
    renderPhases(); update();
  } else if (act === 'del') {
    state.phases.splice(i, 1);
    // keep the other phases' open/closed state; indices after i shift down by one
    const kept = [...openPhases].filter((k) => k !== i).map((k) => (k > i ? k - 1 : k));
    openPhases.clear();
    kept.forEach((k) => openPhases.add(k));
    markModified(); renderPhases(); update();
  } else if (act === 'cell') {
    openCell(i);
  } else if (act === 'sugg') {
    state.phases[i].density = +btn.dataset.v;
    btn.closest('.phase').querySelector('input[data-k="density"]').value = densityShown(state.phases[i]);
    markModified(); refreshPhaseHeaders(); update();
  }
}
// ---------------------------------------------------------------- material search combobox
function renderCombo(input) {
  const list = input.nextElementSibling, q = input.value.trim();
  const hits = searchMaterials(q);
  let html = '';
  // a typed formula that isn't in the library can be used directly
  let formulaOk = false;
  try { formulaOk = !!q && !/\s/.test(q) && !!P.parseFormula(q); } catch { /* not a formula */ }
  if (formulaOk && !hits.some((i) => MATERIALS[i][1] === q)) {
    const d = suggestedDensity(q);
    html += `<button type="button" class="combo-opt" role="option" data-formula="${esc(q)}">
      <span class="co-main"><b>Use formula <span class="mono">${esc(q)}</span></b><small>${d ? `tabulated density ${d} g/cm³` : 'keeps the current density'}</small></span></button>`;
  }
  let group = '';
  for (const i of hits) {
    const [name, formula, density, g] = MATERIALS[i];
    if (!q && g !== group) { html += `<div class="combo-grp">${esc(g)}</div>`; group = g; }
    html += `<button type="button" class="combo-opt" role="option" data-m="${i}">
      <span class="co-main"><b>${esc(name)}</b><small class="mono">${esc(formula)}</small></span><span class="co-d">${density} g/cm³</span></button>`;
  }
  if (!html) html = '<div class="combo-empty">No match. Type a chemical formula to use it directly.</div>';
  list.innerHTML = html;
  list.hidden = false;
  input.setAttribute('aria-expanded', 'true');
  setComboActive(list, 0);
}
function setComboActive(list, k) {
  const opts = [...list.querySelectorAll('.combo-opt')];
  opts.forEach((o, n) => o.classList.toggle('active', n === k));
  if (opts[k]) opts[k].scrollIntoView({ block: 'nearest' });
}
function closeCombo(input) {
  input.nextElementSibling.hidden = true;
  input.setAttribute('aria-expanded', 'false');
}
function chooseComboOption(opt) {
  const i = +opt.closest('.phase').dataset.i, p = state.phases[i];
  if (opt.dataset.m !== undefined) {
    const [name, formula, density] = MATERIALS[+opt.dataset.m];
    Object.assign(p, { name, formula, density });
  } else {
    const f = opt.dataset.formula;
    Object.assign(p, { name: f, formula: f, density: suggestedDensity(f) ?? p.density });
  }
  markModified(); renderPhases(); update();
}
function onComboKey(e) {
  const input = e.target;
  if (!input.classList.contains('combo-in')) return;
  const list = input.nextElementSibling;
  if (list.hidden && (e.key === 'ArrowDown' || e.key === 'Enter')) { renderCombo(input); e.preventDefault(); return; }
  const opts = [...list.querySelectorAll('.combo-opt')];
  const k = opts.findIndex((o) => o.classList.contains('active'));
  if (e.key === 'ArrowDown') { e.preventDefault(); setComboActive(list, Math.min(k + 1, opts.length - 1)); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); setComboActive(list, Math.max(k - 1, 0)); }
  else if (e.key === 'Enter') { e.preventDefault(); if (opts[k]) chooseComboOption(opts[k]); }
  else if (e.key === 'Escape') { e.stopPropagation(); closeCombo(input); }
}

// ---------------------------------------------------------------- unit-cell dialog
let cellTarget = 0;
function openCell(i) {
  cellTarget = i;
  $('cellFormula').value = state.phases[i].formula;
  calcCell();
  $('cellDlg').showModal();
}
function calcCell() {
  try {
    const v = (id) => parseFloat($(id).value);
    const rho = P.cellDensity(P.parseFormula($('cellFormula').value), v('cellZ'), v('cellA'), v('cellB'), v('cellC'), v('cellAl'), v('cellBe'), v('cellGa'));
    if (!isFinite(rho) || rho <= 0) throw new Error('Check the cell parameters');
    $('cellOut').textContent = `${rho.toFixed(3)} g/cm³`;
    $('cellOut').dataset.v = rho.toFixed(4);
    $('cellApply').disabled = false;
  } catch (err) {
    $('cellOut').textContent = err.message;
    $('cellApply').disabled = true;
  }
}

// ---------------------------------------------------------------- holder
function renderContainer() {
  $('container').innerHTML = CONTAINERS.map((c) => `<option value="${c.id}">${esc(c.label)}</option>`).join('');
  $('container').value = state.container;
  const c = CONTAINERS.find((x) => x.id === 'custom');
  $('cFormula').value = state.cFormula ?? c.formula;
  $('cDensity').value = state.cDensity ?? c.density;
  $('cThick').value = state.cThick ?? c.t;
  $('containerCustom').hidden = state.container !== 'custom';
}
function holder(E = state.energy) {
  const c = CONTAINERS.find((x) => x.id === state.container) || CONTAINERS[0];
  if (c.id === 'none') return { T: 1, label: null };
  const custom = c.id === 'custom';
  const formula = custom ? (state.cFormula ?? c.formula) : c.formula;
  const density = custom ? +(state.cDensity ?? c.density) : c.density;
  const t = custom ? +(state.cThick ?? c.t) : c.t;
  const mu = P.compoundMassAtten(P.parseFormula(formula), E) * density;
  return { T: P.transmission(mu, t), label: c.label };
}
const holderT = (E) => { try { return holder(E).T; } catch { return 1; } };

// ---------------------------------------------------------------- compute + results
function compute(E = state.energy) {
  const phases = state.phases.map((p) => ({ formula: p.formula, density: +p.density, fraction: Math.max(0, +p.fraction) / 100 }));
  return P.sampleAtten({ phases, basis: state.basis, porosity: Math.min(state.porosity, 99.9) / 100 }, E);
}

function validatePhases() {
  let ok = true;
  document.querySelectorAll('.phase').forEach((row) => {
    const i = +row.dataset.i, p = state.phases[i];
    let msg = '';
    try { P.parseFormula(p.formula); } catch (e) { msg = e.message; }
    const fIn = row.querySelector('input[data-k="formula"]');
    fIn.classList.toggle('invalid', !!msg);
    row.querySelector('input[data-k="density"]').classList.toggle('invalid', !(p.density > 0));
    if (!msg && !(p.density > 0)) msg = 'Density must be greater than 0';
    const err = row.querySelector('[data-err]');
    err.hidden = !msg; err.textContent = msg;
    if (msg) {
      ok = false;
      if (!openPhases.has(i)) { openPhases.add(i); row.classList.add('open'); row.querySelector('.ph-edit').hidden = false; row.querySelector('.ph-toggle').setAttribute('aria-expanded', true); }
    }
    const sd = msg ? null : suggestedDensity(p.formula);
    row.querySelector('[data-sugg]').innerHTML = sd && Math.abs(sd - p.density) > 1e-6
      ? `<button type="button" class="linkish" data-act="sugg" data-v="${sd}">Use tabulated ${sd} g/cm³</button>` : '';
  });
  return ok;
}

let last = null;
function update() {
  saveHash();
  const alerts = [];
  const okPhases = validatePhases();
  const rest = state.phases.slice(1).reduce((a, p) => a + (+p.fraction || 0), 0);
  const fracOk = !balanced() || rest <= 100;
  if (!fracOk) alerts.push(['bad', `The added phases sum to ${sig(rest, 4)} %, which is more than 100 %. Reduce their fractions.`]);
  if (!okPhases) alerts.push(['bad', 'Fix the highlighted composition fields to see results.']);

  let h;
  try { h = holder(); } catch (e) { alerts.push(['bad', `Sample holder: ${e.message}`]); h = { T: 1, label: null }; }
  $('holderMeta').textContent = h.label ? `transmits ${fmtPct(h.T)}` : '';

  if (!okPhases || !fracOk) { renderAlerts(alerts); blankResults(); return; }

  const r = compute();
  const mu = r.mu;
  const tCur = state.thickness;
  const Ttot = P.transmission(mu, tCur) * h.T;
  const target = state.target / 100;
  const needSample = target / h.T;
  const tReq = needSample < 1 && mu > 0 ? P.thicknessFor(mu, needSample) : NaN;

  $('outT').textContent = fmtPct(Ttot);
  $('meterT').style.width = `${Math.max(0, Math.min(100, Ttot * 100))}%`;
  $('outThick').textContent = isFinite(tReq) ? fmtLen(tReq) : '–';
  $('mbT').textContent = $('outT').textContent;
  $('mbThick').textContent = $('outThick').textContent;
  $('mbTargetLbl').textContent = `Thickness for ${+state.target} %`;
  document.querySelectorAll('#quickT button').forEach((b) => b.classList.toggle('on', +b.dataset.t === state.target));

  if (h.T < 1 && target >= h.T) alerts.push(['bad', `The holder alone transmits only ${fmtPct(h.T)}, so ${fmtPct(target)} in total is not reachable. Lower the target or use thinner windows.`]);
  if (mu <= 0) alerts.push(['bad', 'The sample does not attenuate (zero density or 100 % porosity).']);

  renderCompBar(r);
  physicsAlerts(r, tReq, alerts);
  renderAlerts(alerts);
  renderStats(r, h);
  renderBars(r);
  renderSetup(h, Ttot);
  last = { r, h, tReq };
  renderCharts();
}

function physicsAlerts(r, tReq, alerts) {
  const E = state.energy, mu = r.mu;
  const fluo = [], near = [];
  for (const [sym, contrib] of Object.entries(r.byElement)) {
    if (contrib / mu < 0.005) continue;
    for (const { edge, E: Ee } of P.edges(sym)) {
      if ((edge === 'K' || edge === 'L3') && Ee >= 2 && E > Ee && E / Ee < 3) fluo.push(`${sym} ${edge} (${Ee.toFixed(2)} keV)`);
      if (E < Ee && Ee - E < 0.2) near.push(`${sym} ${edge} edge at ${Ee.toFixed(3)} keV`);
    }
  }
  if (fluo.length) alerts.push(['warn', `<b>Fluorescence:</b> the beam is above the ${fluo.join(', ')} absorption edge${fluo.length > 1 ? 's' : ''}. Expect a flat fluorescence background.`]);
  if (near.length) alerts.push(['info', `The energy is just below the ${near.join(', ')}. Attenuation changes sharply here, so check the exact beam energy.`]);
  if (isFinite(tReq) && tReq < 20 && E < 17) {
    const alt = SOURCES.filter((s) => s.E > E + 1 && s.id !== 'custom').map((s) => {
      const need = state.target / 100 / holderT(s.E);
      return { s, t: need < 1 ? P.thicknessFor(compute(s.E).mu, need) : NaN };
    }).filter((x) => isFinite(x.t)).sort((a, b) => b.t - a.t)[0];
    if (alt && alt.t > tReq * 1.5) alerts.push(['info', `The sample has to be very thin. With <b>${alt.s.label}</b> (${alt.s.E.toFixed(2)} keV) the same transmission needs ${fmtLen(alt.t)}.`]);
  }
}

// stacked bar of true volume fractions (phases + voids), coloured like the phase rows
function renderCompBar(r) {
  const segs = r.byPhase.map((p, i) => [p.phi, `var(--ph-${(i % 5) + 1})`, state.phases[i].name]);
  if (state.porosity > 0) segs.push([state.porosity / 100, null, 'Voids']);
  $('compBar').innerHTML = segs.filter(([f]) => f > 0).map(([f, c, n]) =>
    `<span class="${c ? '' : 'void'}" style="flex-grow:${f};${c ? `background:${c}` : ''}" title="${esc(n)}: ${sig(f * 100, 3)} vol %"></span>`).join('');
}

function renderAlerts(alerts) {
  $('alerts').innerHTML = alerts.map(([k, m]) => `<div class="alert ${k}">${ICONS[k]}<div>${m}</div></div>`).join('');
}
function blankResults() {
  for (const id of ['outT', 'outThick', 'mbT', 'mbThick']) $(id).textContent = '–';
  $('meterT').style.width = '0';
  $('stats').innerHTML = ''; $('elBars').innerHTML = ''; $('compBar').innerHTML = '';
  $('chartT').innerHTML = ''; $('chartE').innerHTML = '';
  for (const id of ['suT', 'suTr']) $(id).textContent = '–';
  last = null;
}

function renderSetup(h, Ttot) {
  const src = SOURCES.find((x) => x.id === state.source);
  $('suSrc').textContent = state.source === 'custom' ? 'Synch.' : src.label;
  $('suE').textContent = `${sig(state.energy, 4)} keV`;
  $('suT').textContent = `t = ${fmtLen(state.thickness)}`;
  $('suTr').textContent = isFinite(Ttot) ? `transmitted T = ${fmtPct(Ttot)}` : '–';
  // sample drawn wider for thicker samples: 18 px per decade, 1 µm → 8 px, 10 mm → 80 px
  const sw = Math.max(6, Math.min(84, 8 + 18 * Math.log10(Math.max(state.thickness, 1e-3))));
  const x0 = 290 - sw / 2, x1 = 290 + sw / 2;
  const attr = (id, o) => { for (const [k, v] of Object.entries(o)) $(id).setAttribute(k, v); };
  attr('suSample', { x: x0, width: sw });
  attr('suWinL', { x: x0 - 6 });
  attr('suWinR', { x: x1 });
  attr('suDim', { d: `M${x0} 184v8M${x1} 184v8M${x0} 188h${sw}` });
  attr('suBeamI', { width: x0 - 6 - 80 });
  const hw = Math.max(47, sw / 2 + 12);
  attr('suSampleHit', { x: 290 - hw, width: 2 * hw });
  // transmitted beam thins out with the transmission
  const w = isFinite(Ttot) ? Math.max(1.5, 12 * Ttot) : 12;
  attr('suBeamT', { x: x1 + 6, width: 564 - x1 - 6, y: 120 - w / 2, height: w });
  $('suHolder').classList.toggle('off', !h.label);
  $('suHolderLbl').textContent = h.label ? 'holder walls' : 'no holder';
  syncSetupPop();
}

// ---------------------------------------------------------------- setup diagram popover
let popKind = null;
function setupPopBody(kind) {
  if (kind === 'source') {
    return `<h4>X-ray beam</h4>
      <div class="chips" data-k="src">${SOURCES.map((s) => `<button type="button" role="radio" data-id="${s.id}">${s.id === 'custom' ? 'Synchrotron / custom' : s.label}${s.id === 'custom' ? '' : `<small>${s.E.toFixed(2)} keV</small>`}</button>`).join('')}</div>
      <div class="row2">
        <label class="field"><span>Energy</span><div class="input-unit"><input type="number" data-k="energy" step="0.001" min="1" max="100" inputmode="decimal"><em>keV</em></div></label>
        <label class="field"><span>Wavelength</span><div class="input-unit"><input type="number" data-k="wavelength" step="0.0001" min="0.124" max="12.4" inputmode="decimal"><em>Å</em></div></label>
      </div>`;
  }
  if (kind === 'sample') {
    const groups = {};
    for (const x of PRESETS) (groups[x.group] ||= []).push(x);
    return `<h4>Sample</h4>
      <label class="field"><span>Material</span><select data-k="preset">
        <option value="" disabled>Custom sample</option>
        ${Object.entries(groups).map(([g, list]) => `<optgroup label="${esc(g)}">${list.map((x) => `<option value="${x.id}">${esc(x.title)}</option>`).join('')}</optgroup>`).join('')}
      </select></label>
      <label class="field"><span>Thickness</span><div class="input-unit"><input type="number" data-k="thickness" min="0" step="any" inputmode="decimal">
        <select data-k="thickUnit" aria-label="Thickness unit"><option value="1">µm</option><option value="1000">mm</option></select></div></label>
      <div class="por">
        <div class="por-row">
          <span class="por-lbl">Porosity <small>pores, or 100 − packing for powders</small></span>
          <div class="input-unit xs"><input type="number" data-k="porosity" min="0" max="99" step="0.5" aria-label="Porosity"><em>%</em></div>
        </div>
        <input type="range" data-k="porosity" min="0" max="95" step="0.5" aria-label="Porosity slider">
      </div>
      <label class="field"><span>Holder</span><select data-k="container">${CONTAINERS.map((c) => `<option value="${c.id}">${esc(c.label)}</option>`).join('')}</select></label>
      <button type="button" class="linkish" data-k="editComp">Edit composition and phases →</button>`;
  }
  return `<h4>Transmitted beam</h4>
    <label class="field"><span>Transmission</span><div class="input-unit"><input type="number" data-k="target" min="0.01" max="99.9" step="any" inputmode="decimal"><em>%</em></div></label>
    <div class="quick" data-k="quick">${[37, 50, 20, 10].map((t) => `<button type="button" data-t="${t}">${t} %${t === 37 ? ' optimal' : ''}</button>`).join('')}</div>
    <p class="su-pop-out">The sample thickness is set to give this transmission: <b data-k="outThick"></b></p>`;
}
// keeps the open popover in step with the state, without touching the field being typed in
function syncSetupPop() {
  if (!popKind) return;
  const pop = $('suPop');
  const set = (k, v) => { const el = pop.querySelector(`[data-k="${k}"]`); if (el && el !== document.activeElement) el.value = v; };
  if (popKind === 'source') {
    pop.querySelectorAll('[data-k="src"] button').forEach((b) => b.setAttribute('aria-checked', b.dataset.id === state.source));
    set('energy', +state.energy.toFixed(4));
    set('wavelength', +(P.HC_KEV_A / state.energy).toFixed(5));
  } else if (popKind === 'sample') {
    set('preset', state.preset || '');
    set('thickUnit', String(state.thickUnit));
    set('thickness', +(state.thickness / state.thickUnit).toPrecision(6));
    pop.querySelectorAll('[data-k="porosity"]').forEach((el) => { if (el !== document.activeElement) el.value = state.porosity; });
    set('container', state.container);
  } else {
    set('target', state.target);
    pop.querySelectorAll('[data-k="quick"] button').forEach((b) => b.classList.toggle('on', +b.dataset.t === state.target));
    pop.querySelector('[data-k="outThick"]').textContent = $('outThick').textContent;
  }
}
function openSetupPop(hot) {
  const pop = $('suPop'), fig = $('setup');
  if (popKind === hot.dataset.edit) { closeSetupPop(); return; }
  popKind = hot.dataset.edit;
  document.querySelectorAll('.su-hot').forEach((g) => g.classList.toggle('active', g === hot));
  pop.innerHTML = `<button type="button" class="su-pop-x" aria-label="Close">×</button>${setupPopBody(popKind)}`;
  pop.setAttribute('aria-label', pop.querySelector('h4').textContent);
  pop.hidden = false;
  syncSetupPop();
  // anchor below the clicked part (above it if the window has no room below), kept inside the figure
  const f = fig.getBoundingClientRect(), r = hot.getBoundingClientRect(), h = pop.offsetHeight;
  const left = Math.max(0, Math.min(f.width - pop.offsetWidth, r.left + r.width / 2 - f.left - pop.offsetWidth / 2));
  const above = innerHeight - r.bottom < h + 12 && r.top - 70 > h;
  pop.style.left = `${left}px`;
  pop.style.top = `${above ? r.top - f.top - h - 6 : r.bottom - f.top + 6}px`;
  (pop.querySelector('input') || pop.querySelector('select')).focus({ preventScroll: true });
  pop.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
function closeSetupPop() {
  if (!popKind) return;
  const hot = document.querySelector('.su-hot.active');
  popKind = null;
  $('suPop').hidden = true;
  document.querySelectorAll('.su-hot').forEach((g) => g.classList.remove('active'));
  return hot;
}
// the diagram's transmission sets the target and resizes the sample to reach it
function setTransmission(v) {
  if (!(v > 0 && v < 100)) return;
  state.target = v; $('target').value = v;
  update();
  if (last && isFinite(last.tReq)) { state.thickness = +last.tReq.toPrecision(4); renderThickness(); update(); }
}
function onSetupPopInput(e) {
  const k = e.target.dataset.k, v = parseFloat(e.target.value);
  if (k === 'energy') setEnergy(v, 'energy');
  else if (k === 'wavelength') { if (v > 0) setEnergy(P.HC_KEV_A / v, 'wavelength'); }
  else if (k === 'thickness') { if (v >= 0) { state.thickness = v * state.thickUnit; renderThickness(); update(); } }
  else if (k === 'porosity') {
    state.porosity = Math.max(0, Math.min(99, v || 0));
    $('porosity').value = $('porosityNum').value = state.porosity;
    markModified(); update();
  } else if (k === 'target') setTransmission(v);
}
function onSetupPopChange(e) {
  const k = e.target.dataset.k, v = e.target.value;
  if (k === 'preset') applyPreset(v);
  else if (k === 'thickUnit') { state.thickUnit = +v; renderThickness(); syncSetupPop(); }
  else if (k === 'container') { state.container = v; renderContainer(); update(); }
}
function onSetupPopClick(e) {
  const b = e.target.closest('button'); if (!b) return;
  if (b.classList.contains('su-pop-x')) { closeSetupPop()?.focus(); return; }
  if (b.closest('[data-k="src"]')) {
    setSource(b.dataset.id);
    if (b.dataset.id === 'custom') $('suPop').querySelector('[data-k="energy"]').select();
  } else if (b.closest('[data-k="quick"]')) {
    setTransmission(+b.dataset.t);
  } else if (b.dataset.k === 'editComp') {
    closeSetupPop();
    state.phases.forEach((_, i) => openPhases.add(i));
    renderPhases();
    const sec = $('picker').closest('.sec');
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    sec.classList.remove('flash'); void sec.offsetWidth; sec.classList.add('flash');
    document.querySelector('.phase .combo-in')?.focus({ preventScroll: true });
  }
}

function renderStats(r, h) {
  const mu = r.mu;
  const stats = [
    ['Optimal thickness 1/µ', fmtLen(1e4 / mu)],
    ['Linear attenuation µ', `${sig(mu)} <small>cm⁻¹</small>`],
    ['Mass attenuation µ/ρ', `${sig(r.rho > 0 ? mu / r.rho : 0)} <small>cm²/g</small>`],
    ['Effective density', `${sig(r.rho)} <small>g/cm³</small>`],
    ['Holder transmission', h.label ? fmtPct(h.T) : '<small>no holder</small>'],
    ['Wavelength', `${sig(P.HC_KEV_A / state.energy, 4)} <small>Å</small>`],
  ];
  $('stats').innerHTML = stats.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
}

function renderBars(r) {
  const tot = r.mu;
  let rows = Object.entries(r.byElement).map(([k, v]) => [k, v / tot]).sort((a, b) => b[1] - a[1]);
  if (rows.length > 7) rows = [...rows.slice(0, 6), ['Other', rows.slice(6).reduce((a, x) => a + x[1], 0)]];
  $('elBars').innerHTML = rows.map(([k, f]) => `
    <div class="bar-row" title="${k}: ${(f * 100).toFixed(2)} % of the attenuation">
      <span class="el"><b>${k}</b>${P.element(k) ? `<small>${P.element(k).name}</small>` : ''}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(f * 100, 0.4)}%"></div></div>
      <span class="pct">${f >= 0.001 ? sig(f * 100, 3) : '< 0.1'} %</span>
    </div>`).join('');
}

// ---------------------------------------------------------------- charts
function renderCharts() {
  if (!last) return;
  const { r, h, tReq } = last;
  const mu = r.mu, tOpt = 1e4 / mu, tCur = state.thickness;

  let lo = tOpt / 50, hi = tOpt * 12;
  for (const t of [tCur, tReq]) if (isFinite(t) && t > 0) { lo = Math.min(lo, t / 3); hi = Math.max(hi, t * 2); }
  const data = [];
  for (let i = 0; i <= 240; i++) {
    const t = lo * (hi / lo) ** (i / 240);
    data.push([t, P.transmission(mu, t) * h.T * 100]);
  }
  const Tcur = P.transmission(mu, tCur) * h.T * 100;
  const wide = $('chartT').clientWidth > 640;
  const thickLeft = !(tReq > tCur); // put labels on opposite sides so close points don't collide
  lineChart($('chartT'), {
    ariaLabel: 'Transmission versus sample thickness',
    data, xLog: true, xDomain: [lo, hi], yDomain: [0, 100], area: true, height: wide ? 340 : 270,
    xFmt: (v) => fmtLen(v).replace(' ', ' '), yFmt: (v) => `${v}%`,
    xTitle: 'Sample thickness',
    vRefs: [{ x: tOpt, cls: 'ref', label: '1/µ', lblCls: 'lbl' }],
    points: [
      ...(isFinite(tReq) ? [{ x: tReq, y: state.target, cls: 'dot-thick', guide: 'guide-thick', label: `${fmtLen(tReq)} → ${+state.target} %`, side: thickLeft ? 'left' : 'right', dy: -9 }] : []),
      { x: tCur, y: Tcur, cls: 'dot-trans', guide: 'guide-trans', label: `${fmtLen(tCur)} → ${fmtPct(Tcur / 100)}`, side: thickLeft ? 'right' : 'left', dy: Tcur > 85 ? 18 : -9 },
    ],
    tip: (x, y) => `<span>t</span> <b>${fmtLen(x)}</b> &nbsp;<span>T</span> <b>${fmtPct(y / 100)}</b>`,
  });

  if (!$('chartE').closest('.tab-body').hidden) renderEnergyChart(r, tOpt);
}

function renderEnergyChart(r, tOpt) {
  const E0 = 4, E1 = 30;
  const grid = [];
  for (let i = 0; i <= 260; i++) grid.push(E0 * (E1 / E0) ** (i / 260));
  for (const sym of Object.keys(r.byElement)) for (const { E } of P.edges(sym)) if (E > E0 && E < E1) grid.push(E * 0.9995, E * 1.0005);
  grid.push(state.energy);
  grid.sort((a, b) => a - b);
  const eData = grid.map((E) => [E, 1e4 / compute(E).mu]);
  const ys = eData.map((d) => d[1]).filter((v) => isFinite(v) && v > 0);
  const yLo = 10 ** Math.floor(Math.log10(Math.min(...ys))), yHi = 10 ** Math.ceil(Math.log10(Math.max(...ys)));
  const refs = SOURCES.filter((s) => s.id !== 'custom').map((s) => ({
    x: s.E, label: s.id,
    cls: `src-line${state.source === s.id ? ' on' : ''}`, lblCls: `src-lbl${state.source === s.id ? ' on' : ''}`,
    title: `${s.label} · ${s.E.toFixed(2)} keV: click to select`,
    onClick: () => setSource(s.id),
  }));
  if (state.source === 'custom') refs.push({ x: state.energy, label: `${sig(state.energy, 3)} keV`, cls: 'src-line on', lblCls: 'src-lbl on' });
  lineChart($('chartE'), {
    ariaLabel: 'Optimal sample thickness versus X-ray energy',
    data: eData, xLog: true, yLog: true, xDomain: [E0, E1], yDomain: [yLo, yHi], height: 300,
    xFmt: (v) => `${v}`, yFmt: (v) => fmtLen(v).replace(' ', ' '),
    xTitle: 'Energy [keV]',
    vRefs: refs,
    points: [{ x: state.energy, y: tOpt, cls: 'dot' }],
    tip: (x, y) => `<b>${sig(x, 4)} keV</b> &nbsp;<span>1/µ</span> <b>${fmtLen(y)}</b>`,
  });
}

// ---------------------------------------------------------------- misc UI
function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 1800);
}
function renderThickness() {
  $('thickUnit').value = String(state.thickUnit);
  $('thickness').value = +(state.thickness / state.thickUnit).toPrecision(6);
  $('target').value = state.target;
}
function renderAll() {
  renderBeam(); syncEnergyInputs(); renderPicker(); renderPhases(); renderContainer(); renderThickness(); update();
}
function selectTab(name) {
  document.querySelectorAll('#tabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === name));
  document.querySelectorAll('.tab-body').forEach((b) => { b.hidden = b.dataset.tab !== name; });
  if (name === 'energy') renderCharts();
}

// ---------------------------------------------------------------- wire up
function init() {
  state = loadState();
  if (!state.base) state.base = state.preset || 'custom';

  // beam
  $('srcbar').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.classList.contains('more-btn')) { $('morePanel').hidden = !$('morePanel').hidden; renderBeam(); return; }
    setSource(b.dataset.id);
  });
  $('moreSources').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setSource(b.dataset.id); });
  $('energy').addEventListener('input', (e) => setEnergy(parseFloat(e.target.value), 'energy'));
  $('wavelength').addEventListener('input', (e) => { const l = parseFloat(e.target.value); if (l > 0) setEnergy(P.HC_KEV_A / l, 'wavelength'); });
  $('energy').addEventListener('blur', () => syncEnergyInputs());
  $('wavelength').addEventListener('blur', () => syncEnergyInputs());

  // sample picker
  $('pickerBtn').addEventListener('click', () => setPicker($('pickerMenu').hidden));
  $('pickerMenu').addEventListener('click', (e) => { const o = e.target.closest('.opt'); if (o) { setPicker(false); applyPreset(o.dataset.id); $('pickerBtn').focus(); } });
  $('pickerMenu').addEventListener('keydown', (e) => {
    const opts = [...$('pickerMenu').querySelectorAll('.opt')], i = opts.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); opts[Math.min(i + 1, opts.length - 1)].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); opts[Math.max(i - 1, 0)].focus(); }
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('#picker')) setPicker(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('pickerMenu').hidden) { setPicker(false); $('pickerBtn').focus(); } });

  // phases
  $('phases').addEventListener('input', onPhaseInput);
  $('phases').addEventListener('click', onPhaseClick);
  $('phases').addEventListener('keydown', onComboKey);
  // open the list on click or typing only, so focusing the field (e.g. after "Add phase") doesn't cover other controls
  $('phases').addEventListener('click', (e) => { if (e.target.classList.contains('combo-in')) renderCombo(e.target); });
  $('phases').addEventListener('focusout', (e) => { if (e.target.classList.contains('combo-in')) setTimeout(() => closeCombo(e.target), 120); });
  // mousedown (not click) so the input keeps focus until the choice is applied
  $('phases').addEventListener('mousedown', (e) => {
    const opt = e.target.closest('.combo-opt');
    if (opt) { e.preventDefault(); chooseComboOption(opt); }
  });
  $('addPhase').addEventListener('click', () => {
    state.phases.push({ name: `Phase ${state.phases.length + 1}`, formula: 'SiO2', density: 2.2, fraction: 1 });
    openPhases.add(state.phases.length - 1);
    markModified(); renderPhases(); update();
    document.querySelector(`.phase[data-i="${state.phases.length - 1}"] .combo-in`).focus();
  });
  $('basisSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    state.basis = b.dataset.v; markModified(); renderPhases(); update();
  });
  const setPor = (v) => { state.porosity = Math.max(0, Math.min(99, parseFloat(v) || 0)); markModified(); update(); };
  $('porosity').addEventListener('input', (e) => { $('porosityNum').value = e.target.value; setPor(e.target.value); });
  $('porosityNum').addEventListener('input', (e) => { $('porosity').value = e.target.value; setPor(e.target.value); });

  // holder
  $('container').addEventListener('change', (e) => { state.container = e.target.value; $('containerCustom').hidden = state.container !== 'custom'; update(); });
  $('cFormula').addEventListener('input', (e) => { state.cFormula = e.target.value; update(); });
  $('cDensity').addEventListener('input', (e) => { state.cDensity = parseFloat(e.target.value) || 0; update(); });
  $('cThick').addEventListener('input', (e) => { state.cThick = parseFloat(e.target.value) || 0; update(); });

  // results
  $('thickness').addEventListener('input', (e) => { const v = parseFloat(e.target.value); if (v >= 0) { state.thickness = v * state.thickUnit; update(); } });
  $('thickUnit').addEventListener('change', (e) => { state.thickUnit = +e.target.value; renderThickness(); });
  $('target').addEventListener('input', (e) => { const v = parseFloat(e.target.value); if (v > 0 && v < 100) { state.target = v; update(); } });
  $('quickT').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    state.target = +b.dataset.t; $('target').value = state.target; update();
  });
  $('tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) selectTab(b.dataset.tab); });

  // setup diagram
  const setup = $('setup');
  setup.addEventListener('click', (e) => {
    const g = e.target.closest('.su-hot');
    if (g) openSetupPop(g);
    else if (!e.target.closest('#suPop')) closeSetupPop();
  });
  setup.addEventListener('keydown', (e) => {
    const g = e.target.closest('.su-hot');
    if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openSetupPop(g); }
  });
  $('suPop').addEventListener('input', onSetupPopInput);
  $('suPop').addEventListener('change', onSetupPopChange);
  $('suPop').addEventListener('click', onSetupPopClick);
  document.addEventListener('click', (e) => { if (!e.target.closest('#setup')) closeSetupPop(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && popKind) closeSetupPop()?.focus(); });

  // dialogs & top bar
  $('cellDlg').addEventListener('input', calcCell);
  $('cellApply').addEventListener('click', () => {
    const v = +$('cellOut').dataset.v;
    if (v > 0) { state.phases[cellTarget].density = v; markModified(); renderPhases(); update(); }
  });
  $('aboutBtn').addEventListener('click', () => $('aboutDlg').showModal());
  $('shareBtn').addEventListener('click', async () => {
    history.replaceState(null, '', `#s=${encodeState()}`);
    try { await navigator.clipboard.writeText(location.href); toast('Link copied to clipboard'); }
    catch { toast('Copy the address bar to share this setup'); }
  });
  $('themeBtn').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    const next = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('saxs-theme', next); } catch (e) { /* storage unavailable */ }
  });

  // mobile summary bar
  $('mobibar').addEventListener('click', () => document.querySelector('.main').scrollIntoView({ behavior: 'smooth' }));
  new IntersectionObserver(([en]) => $('mobibar').classList.toggle('away', en.isIntersecting), { threshold: 0.05 })
    .observe(document.querySelector('.kpis'));

  let rt;
  new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(renderCharts, 60); }).observe($('chartT'));

  if (!MAIN_SOURCES.includes(state.source)) $('morePanel').hidden = false;
  renderAll();
}

init();
