// Core physics: mass attenuation coefficients, formula parsing, composite samples.
import { ELEMENTS } from './xsdata.js';

// Deuterium: same electronic cross section per atom as H, but twice the mass.
// Stored per gram, so scale H's cm²/g values by m_H/m_D.
{
  const H = ELEMENTS.H, f = Math.log(H.m / 2.0141);
  ELEMENTS.D = { ...H, name: 'deuterium', m: 2.0141, d: 0.000169,
    p: [H.p[0], H.p[1].map((v) => v + f), H.p[2]],
    s: [H.s[0], H.s[1].map((v) => v + f), H.s[2], H.s[3].map((v) => v + f), H.s[4]] };
}

export const AMU_G = 1.66053907e-24;      // g per amu
export const HC_KEV_A = 12.398419843;      // keV·Å

// ---------- cubic spline in log-log space (Numerical Recipes "splint") ----------
// Tables contain repeated energies at absorption edges; we pick the interval
// [x_lo, x_hi) of non-zero width that contains x, so values just above an edge
// use the post-edge branch.
function splint(xs, ys, y2, x) {
  const n = xs.length;
  if (x <= xs[0]) return ys[0] + (x - xs[0]) * (ys[1] - ys[0]) / (xs[1] - xs[0]);
  if (x >= xs[n - 1]) return ys[n - 1] + (x - xs[n - 1]) * (ys[n - 1] - ys[n - 2]) / (xs[n - 1] - xs[n - 2]);
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) {
    const k = (hi + lo) >> 1;
    if (xs[k] > x) hi = k; else lo = k;
  }
  // lo is the last index with xs[lo] <= x; hi = lo + 1 has xs[hi] > x (strictly).
  const h = xs[hi] - xs[lo];
  const a = (xs[hi] - x) / h, b = (x - xs[lo]) / h;
  return a * ys[lo] + b * ys[hi] + ((a * a * a - a) * y2[lo] + (b * b * b - b) * y2[hi]) * h * h / 6;
}

/** Mass attenuation coefficient µ/ρ [cm²/g] of an element at energy E [keV]. */
export function massAtten(sym, EkeV, parts = false) {
  const el = ELEMENTS[sym];
  if (!el) throw new Error(`Unknown element "${sym}"`);
  const lx = Math.log(EkeV * 1000);
  const [pe, pv, p2] = el.p;
  const [se, cv, c2, iv, i2] = el.s;
  const photo = Math.exp(splint(pe, pv, p2, lx));
  const coh = Math.exp(splint(se, cv, c2, lx));
  const incoh = Math.exp(splint(se, iv, i2, lx));
  return parts ? { photo, coh, incoh, total: photo + coh + incoh } : photo + coh + incoh;
}

export const element = (sym) => ELEMENTS[sym];
export const elementSymbols = Object.keys(ELEMENTS);

// ---------- chemical formula parser ----------
// Supports: CsPbBr3, Ca10(PO4)6(OH)2, CuSO4·5H2O, CuSO4*5H2O, (C2H4)n, decimals (Fe0.7Ni0.3)
export function parseFormula(str) {
  const s = String(str).replace(/\s+/g, '').replace(/[·•*.](?=\d*[A-Z(\[])/g, '·');
  if (!s) throw new Error('Empty formula');
  const pieces = s.split('·');
  const total = {};
  for (const piece of pieces) {
    const m = piece.match(/^(\d+(?:\.\d+)?)(.*)$/);
    const mult = m ? parseFloat(m[1]) : 1;
    const body = m ? m[2] : piece;
    const counts = parseGroup(body);
    for (const [k, v] of Object.entries(counts)) total[k] = (total[k] || 0) + v * mult;
  }
  return total;
}

function parseGroup(s) {
  let i = 0;
  const num = () => {
    const m = s.slice(i).match(/^\d+(?:\.\d+)?/);
    if (!m) return 1;
    i += m[0].length;
    return parseFloat(m[0]);
  };
  const parse = () => {
    const out = {};
    while (i < s.length) {
      const c = s[i];
      if (c === '(' || c === '[') {
        i++;
        const inner = parse();
        if (s[i] !== ')' && s[i] !== ']') throw new Error('Unbalanced parentheses');
        i++;
        const n = s[i] === 'n' ? (i++, 1) : num();
        for (const [k, v] of Object.entries(inner)) out[k] = (out[k] || 0) + v * n;
      } else if (c === ')' || c === ']') {
        return out;
      } else if (/[A-Z]/.test(c)) {
        let sym = c; i++;
        if (i < s.length && /[a-z]/.test(s[i])) { sym += s[i]; i++; }
        if (!ELEMENTS[sym]) throw new Error(`Unknown element "${sym}"`);
        const n = num();
        out[sym] = (out[sym] || 0) + n;
      } else {
        throw new Error(`Unexpected "${c}" in formula`);
      }
    }
    return out;
  };
  const r = parse();
  if (i < s.length) throw new Error('Unbalanced parentheses');
  if (!Object.keys(r).length) throw new Error('No elements in formula');
  return r;
}

/** Molar mass [g/mol] and element mass fractions for a parsed formula. */
export function composition(counts) {
  let M = 0;
  for (const [k, n] of Object.entries(counts)) M += n * ELEMENTS[k].m;
  const w = {};
  for (const [k, n] of Object.entries(counts)) w[k] = n * ELEMENTS[k].m / M;
  return { M, w };
}

/** Mass attenuation coefficient [cm²/g] of a compound (mass-fraction mixture rule). */
export function compoundMassAtten(counts, EkeV) {
  const { w } = composition(counts);
  let s = 0;
  for (const [k, wk] of Object.entries(w)) s += wk * massAtten(k, EkeV);
  return s;
}

/** Crystal density [g/cm³] from unit cell: Z formula units, a,b,c [Å], α,β,γ [deg]. */
export function cellDensity(counts, Z, a, b, c, al = 90, be = 90, ga = 90) {
  const r = Math.PI / 180;
  const ca = Math.cos(al * r), cb = Math.cos(be * r), cg = Math.cos(ga * r);
  const V = a * b * c * Math.sqrt(1 - ca * ca - cb * cb - cg * cg + 2 * ca * cb * cg); // Å^3
  const { M } = composition(counts);
  return (Z * M * AMU_G) / (V * 1e-24);
}

/**
 * Composite sample.
 * phases: [{ formula, density, fraction }] — fractions are of the solid part,
 *   interpreted as volume or mass fractions depending on `basis` ('vol'|'wt').
 *   They are normalised to sum to 1.
 * porosity: void volume fraction of the whole sample (0..1), e.g. pores or 1 − packing fraction.
 * Returns linear attenuation coefficient µ [1/cm] plus breakdowns.
 */
export function sampleAtten({ phases, basis = 'vol', porosity = 0 }, EkeV) {
  const parsed = phases.map((p) => {
    const counts = parseFormula(p.formula);
    const mr = compoundMassAtten(counts, EkeV);
    return { ...p, counts, mr, mu: mr * p.density };
  });
  // volume fractions within the solid
  let vf;
  if (basis === 'wt') {
    const v = parsed.map((p) => (p.density > 0 ? p.fraction / p.density : 0));
    const sv = v.reduce((a, b) => a + b, 0);
    vf = v.map((x) => (sv > 0 ? x / sv : 0));
  } else {
    const sf = parsed.reduce((a, p) => a + p.fraction, 0);
    vf = parsed.map((p) => (sf > 0 ? p.fraction / sf : 0));
  }
  const solid = 1 - porosity;
  let mu = 0, rho = 0;
  const byPhase = parsed.map((p, i) => {
    const phi = vf[i] * solid;
    const contrib = phi * p.mu;
    mu += contrib; rho += phi * p.density;
    return { ...p, phi, contrib };
  });
  // per-element contribution to µ
  const byElement = {};
  for (const p of byPhase) {
    const { w } = composition(p.counts);
    for (const [k, wk] of Object.entries(w)) {
      byElement[k] = (byElement[k] || 0) + p.phi * p.density * wk * massAtten(k, EkeV);
    }
  }
  return { mu, rho, byPhase, byElement };
}

// ---------- Beer–Lambert helpers (thickness in µm) ----------
export const transmission = (mu, t_um) => Math.exp(-mu * t_um * 1e-4);
export const thicknessFor = (mu, T) => (-Math.log(T) / mu) * 1e4;

/** Absorption edges [keV] of an element within the tabulated range. */
export function edges(sym) {
  const e = ELEMENTS[sym]?.edges || {};
  return Object.entries(e).map(([k, v]) => ({ edge: k, E: v / 1000 }));
}
