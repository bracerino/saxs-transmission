# SAXS Transmission Calculator

A static web app (https://bracerino.github.io/saxs-transmission) for estimating the X-ray transmission of SAXS/WAXS samples, and the
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
