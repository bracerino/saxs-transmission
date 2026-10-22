# SAXS Transmission Calculator

A static web app for estimating the X-ray transmission of SAXS/WAXS samples, and the
sample thickness needed for a target transmission.

- **Beam:** Cu, Mo, Ga, Ag, In, Cr, or Co Kα, or any synchrotron energy from 1 to 100 keV
- **Sample:** any number of phases, each with a chemical formula, a density, and a vol % or wt % fraction, plus porosity (or powder packing)
- **Presets:** nanoparticles in polymer, semicrystalline polymer, porous Ti, ODS steel, Al alloys, Ni superalloys, nanoparticle dispersions, powders, mesoporous silica
- **Holder:** Kapton, mica or Si₃N₄ windows, quartz or borosilicate capillaries, or a custom holder
- **Outputs:** transmission, required thickness, optimal thickness 1/µ, per-element absorption breakdown, and fluorescence warnings
- **Density from unit cell** (Z, a, b, c, α, β, γ)
- **Shareable links:** the whole configuration is stored in the URL

## Physics

µ = (1 − P) · Σᵢ φᵢ ρᵢ Σⱼ wᵢⱼ (µ/ρ)ⱼ(E), T = exp(−µt), t = −ln(T)/µ

Total cross sections (photoabsorption + coherent + incoherent) come from Elam, Ravel &
Sieber, *Radiat. Phys. Chem.* 63 (2002) 121, via the
[xraydb](https://github.com/xraypy/XrayDB) database. They are interpolated with log-log
cubic splines and agree with NIST XCOM to better than 0.1 % at the tabulated points.

## Run locally

The page uses ES modules, so it has to be served over HTTP rather than opened as a file:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Publish on GitHub Pages

```bash
git init && git add . && git commit -m "SAXS transmission calculator"
git branch -M main
git remote add origin https://github.com/<user>/saxs-transmission.git
git push -u origin main
```

Then open **Settings → Pages → Build and deployment**, choose *Deploy from a branch*, then
`main` and `/ (root)`. The site goes live at `https://<user>.github.io/saxs-transmission/`.
No build step is needed.

## Files

| File | Purpose |
|---|---|
| `index.html`, `css/style.css` | Page and styling (light and dark) |
| `js/physics.js` | Cross sections, formula parser, composite model |
| `js/presets.js` | Sources, material library, sample presets, holders (edit to add your own) |
| `js/charts.js` | Dependency-free SVG charts |
| `js/app.js` | UI logic |
| `js/xsdata.js` | Generated cross-section tables for elements H–Cf |

## License

MIT © 2026 Miroslav Lebeda. See [LICENSE](LICENSE).

The X-ray cross-section data are from Elam, Ravel & Sieber (2002), distributed with [xraydb](https://github.com/xraypy/XrayDB).
