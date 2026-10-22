// Beam sources, material library and sample presets.

// Kα energies are the intensity-weighted mean (2·Kα1 + Kα2)/3, since lab sources
// usually don't resolve the doublet.
export const SOURCES = [
  { id: 'Cu', label: 'Cu Kα', E: 8.041, note: 'Most common lab source' },
  { id: 'Mo', label: 'Mo Kα', E: 17.444, note: 'High energy lab source' },
  { id: 'Ga', label: 'Ga Kα', E: 9.243, note: 'Liquid-metal jet' },
  { id: 'Ag', label: 'Ag Kα', E: 22.104, note: 'Hard lab source' },
  { id: 'In', label: 'In Kα', E: 24.141, note: 'Liquid-metal jet' },
  { id: 'Cr', label: 'Cr Kα', E: 5.411, note: 'Soft lab source' },
  { id: 'Co', label: 'Co Kα', E: 6.925, note: 'Fe-rich samples' },
  { id: 'custom', label: 'Synchrotron', E: 12.0, note: 'Any energy' },
];

// name, formula, density [g/cm³], group
export const MATERIALS = [
  // Polymers
  ['Generic polymer (C:H:O 60:20:20 at.)', 'C0.6H0.2O0.2', 1.5, 'Polymers'],
  ['Polyethylene (PE)', '(C2H4)n', 0.94, 'Polymers'],
  ['Polypropylene (PP)', '(C3H6)n', 0.90, 'Polymers'],
  ['Polystyrene (PS)', '(C8H8)n', 1.05, 'Polymers'],
  ['PMMA', '(C5H8O2)n', 1.18, 'Polymers'],
  ['PET', '(C10H8O4)n', 1.38, 'Polymers'],
  ['PEEK', '(C19H12O3)n', 1.30, 'Polymers'],
  ['Polyamide 6 (Nylon 6)', '(C6H11NO)n', 1.14, 'Polymers'],
  ['PVDF', '(C2H2F2)n', 1.78, 'Polymers'],
  ['PTFE (Teflon)', '(C2F4)n', 2.20, 'Polymers'],
  ['PVC', '(C2H3Cl)n', 1.38, 'Polymers'],
  ['PDMS (silicone)', '(C2H6OSi)n', 0.97, 'Polymers'],
  ['Epoxy (DGEBA-based, cured)', 'C21H25ClO5', 1.16, 'Polymers'],
  ['Kapton (polyimide)', '(C22H10N2O5)n', 1.42, 'Polymers'],
  ['Natural rubber', '(C5H8)n', 0.92, 'Polymers'],
  ['Cellulose', '(C6H10O5)n', 1.50, 'Polymers'],
  ['Polylactide (PLA)', '(C3H4O2)n', 1.25, 'Polymers'],
  // Solvents & soft matter
  ['Water', 'H2O', 0.997, 'Liquids & biological'],
  ['Heavy water (D₂O)', 'D2O', 1.107, 'Liquids & biological'],
  ['Toluene', 'C7H8', 0.867, 'Liquids & biological'],
  ['Ethanol', 'C2H6O', 0.789, 'Liquids & biological'],
  ['Chloroform', 'CHCl3', 1.49, 'Liquids & biological'],
  ['Hexane', 'C6H14', 0.655, 'Liquids & biological'],
  ['DMF', 'C3H7NO', 0.944, 'Liquids & biological'],
  ['Protein (average)', 'C5H8NO2', 1.35, 'Liquids & biological'],
  ['Lipid (DPPC)', 'C40H80NO8P', 1.0, 'Liquids & biological'],
  ['Collagen (approx.)', 'C57H91N19O16', 1.35, 'Liquids & biological'],
  ['Hydroxyapatite (bone mineral)', 'Ca10(PO4)6(OH)2', 3.16, 'Liquids & biological'],
  // Metals
  ['Aluminium', 'Al', 2.699, 'Metals & alloys'],
  ['Magnesium', 'Mg', 1.738, 'Metals & alloys'],
  ['Titanium', 'Ti', 4.506, 'Metals & alloys'],
  ['Iron', 'Fe', 7.874, 'Metals & alloys'],
  ['Nickel', 'Ni', 8.908, 'Metals & alloys'],
  ['Copper', 'Cu', 8.96, 'Metals & alloys'],
  ['Zinc', 'Zn', 7.14, 'Metals & alloys'],
  ['Zirconium', 'Zr', 6.52, 'Metals & alloys'],
  ['Silver', 'Ag', 10.49, 'Metals & alloys'],
  ['Tungsten', 'W', 19.25, 'Metals & alloys'],
  ['Gold', 'Au', 19.30, 'Metals & alloys'],
  ['Platinum', 'Pt', 21.45, 'Metals & alloys'],
  ['Stainless steel 316 (approx.)', 'Fe0.65Cr0.18Ni0.12Mo0.012Mn0.02Si0.01', 8.0, 'Metals & alloys'],
  ['Ti-6Al-4V', 'Ti0.862Al0.102V0.036', 4.43, 'Metals & alloys'],
  ['Ti95Si5 (at. %, approx.)', 'Ti95Si5', 4.39, 'Metals & alloys'],
  ['Silicon (Si)', 'Si', 2.33, 'Metals & alloys'],
  ['Ni3Al (γ′ precipitate)', 'Ni3Al', 7.5, 'Metals & alloys'],
  ['Al2Cu (θ precipitate)', 'Al2Cu', 4.35, 'Metals & alloys'],
  ['MgZn2 (η precipitate)', 'MgZn2', 5.2, 'Metals & alloys'],
  ['Fe3C (cementite)', 'Fe3C', 7.69, 'Metals & alloys'],
  ['TiC', 'TiC', 4.93, 'Metals & alloys'],
  ['NbC', 'NbC', 7.82, 'Metals & alloys'],
  // Oxides & ceramics
  ['Silica (amorphous)', 'SiO2', 2.20, 'Oxides & ceramics'],
  ['Quartz', 'SiO2', 2.65, 'Oxides & ceramics'],
  ['Alumina', 'Al2O3', 3.95, 'Oxides & ceramics'],
  ['TiO2 (anatase)', 'TiO2', 3.89, 'Oxides & ceramics'],
  ['TiO2 (rutile)', 'TiO2', 4.25, 'Oxides & ceramics'],
  ['ZnO', 'ZnO', 5.61, 'Oxides & ceramics'],
  ['ZrO2', 'ZrO2', 5.68, 'Oxides & ceramics'],
  ['Y2O3', 'Y2O3', 5.01, 'Oxides & ceramics'],
  ['CeO2', 'CeO2', 7.22, 'Oxides & ceramics'],
  ['Fe3O4 (magnetite)', 'Fe3O4', 5.17, 'Oxides & ceramics'],
  ['Fe2O3 (hematite)', 'Fe2O3', 5.26, 'Oxides & ceramics'],
  ['CoFe2O4', 'CoFe2O4', 5.29, 'Oxides & ceramics'],
  ['BaTiO3', 'BaTiO3', 6.02, 'Oxides & ceramics'],
  ['CaCO3 (calcite)', 'CaCO3', 2.71, 'Oxides & ceramics'],
  ['Clay (montmorillonite, approx.)', 'Al2Si4O10(OH)2', 2.35, 'Oxides & ceramics'],
  ['Borosilicate glass', 'Si0.28B0.04Na0.03Al0.01O0.64', 2.23, 'Oxides & ceramics'],
  ['Graphite', 'C', 2.26, 'Oxides & ceramics'],
  ['Carbon black / amorphous C', 'C', 1.8, 'Oxides & ceramics'],
  // Nanoparticles / semiconductors
  ['CsPbBr3 (perovskite)', 'CsPbBr3', 4.84, 'Nanocrystals'],
  ['CsPbI3 (perovskite)', 'CsPbI3', 5.38, 'Nanocrystals'],
  ['MAPbI3 (perovskite)', 'CH6NPbI3', 4.16, 'Nanocrystals'],
  ['CdSe', 'CdSe', 5.82, 'Nanocrystals'],
  ['CdS', 'CdS', 4.82, 'Nanocrystals'],
  ['PbS', 'PbS', 7.60, 'Nanocrystals'],
  ['InP', 'InP', 4.81, 'Nanocrystals'],
  ['ZnS', 'ZnS', 4.09, 'Nanocrystals'],
  ['Gold nanoparticles', 'Au', 19.30, 'Nanocrystals'],
  ['Silver nanoparticles', 'Ag', 10.49, 'Nanocrystals'],
];

// Sample holders / windows. thickness = total traversed thickness (both walls) in µm.
export const CONTAINERS = [
  { id: 'none', label: 'None (free-standing)', formula: '', density: 0, t: 0 },
  { id: 'kapton', label: 'Kapton windows 2 × 25 µm', formula: '(C22H10N2O5)n', density: 1.42, t: 50 },
  { id: 'kapton13', label: 'Kapton windows 2 × 13 µm', formula: '(C22H10N2O5)n', density: 1.42, t: 26 },
  { id: 'quartz', label: 'Quartz capillary, 10 µm wall', formula: 'SiO2', density: 2.2, t: 20 },
  { id: 'boro', label: 'Borosilicate capillary, 10 µm wall', formula: 'Si0.28B0.04Na0.03Al0.01O0.64', density: 2.23, t: 20 },
  { id: 'mica', label: 'Mica windows 2 × 10 µm', formula: 'KAl3Si3O10(OH)2', density: 2.83, t: 20 },
  { id: 'sin', label: 'Si₃N₄ membranes 2 × 1 µm', formula: 'Si3N4', density: 3.17, t: 2 },
  { id: 'custom', label: 'Custom…', formula: '(C22H10N2O5)n', density: 1.42, t: 50 },
];

// Sample presets. Phase fractions are % of the solid (vol% or wt% per `basis`);
// porosity is vol% of the whole sample.
export const PRESETS = [
  {
    id: 'np-polymer', group: 'Polymers', icon: '◉', title: 'Nanoparticles in polymer',
    desc: 'Perovskite nanocrystals dispersed in a polymer film',
    basis: 'vol', porosity: 0, thickness: 300, target: 33,
    phases: [
      { name: 'Polymer matrix', formula: 'C0.6H0.2O0.2', density: 1.5, fraction: 95 },
      { name: 'CsPbBr3 nanocrystals', formula: 'CsPbBr3', density: 4.84, fraction: 5 },
    ],
  },
  {
    id: 'semicryst', group: 'Polymers', icon: '≋', title: 'Semicrystalline polymer',
    desc: 'Bulk polymer film (lamellar stacks, crystallites)',
    basis: 'vol', porosity: 0, thickness: 1000, target: 37,
    phases: [{ name: 'Polyethylene', formula: '(C2H4)n', density: 0.94, fraction: 100 }],
  },
  {
    id: 'ti-pores', group: 'Metals & alloys', icon: '◌', title: 'Porous titanium',
    desc: 'Ti with nano-/micro-pores (e.g. additively manufactured)',
    basis: 'vol', porosity: 5, thickness: 30, target: 37,
    phases: [{ name: 'Titanium', formula: 'Ti', density: 4.506, fraction: 100 }],
  },
  {
    id: 'fe-np', group: 'Metals & alloys', icon: '⬢', title: 'Steel with nanoparticles',
    desc: 'Fe matrix with oxide dispersoids (ODS steel)',
    basis: 'vol', porosity: 0, thickness: 20, target: 37,
    phases: [
      { name: 'Iron matrix', formula: 'Fe', density: 7.874, fraction: 99.5 },
      { name: 'Y2O3 nanoparticles', formula: 'Y2O3', density: 5.01, fraction: 0.5 },
    ],
  },
  {
    id: 'al-prec', group: 'Metals & alloys', icon: '▣', title: 'Al alloy with precipitates',
    desc: 'Age-hardened Al–Cu (θ′ / GP zones)',
    basis: 'vol', porosity: 0, thickness: 150, target: 37,
    phases: [
      { name: 'Aluminium matrix', formula: 'Al', density: 2.699, fraction: 97 },
      { name: 'Al2Cu precipitates', formula: 'Al2Cu', density: 4.35, fraction: 3 },
    ],
  },
  {
    id: 'ni-sup', group: 'Metals & alloys', icon: '◈', title: 'Ni superalloy',
    desc: 'γ matrix with γ′ (Ni3Al) precipitates',
    basis: 'vol', porosity: 0, thickness: 15, target: 37,
    phases: [
      { name: 'γ matrix (Ni)', formula: 'Ni', density: 8.908, fraction: 40 },
      { name: 'γ′ precipitates', formula: 'Ni3Al', density: 7.5, fraction: 60 },
    ],
  },
  {
    id: 'np-solution', group: 'Dispersions & powders', icon: '◍', title: 'Nanoparticles in solution',
    desc: 'Colloidal Au nanoparticles in water, in a capillary',
    basis: 'vol', porosity: 0, thickness: 1000, target: 37, container: 'quartz',
    phases: [
      { name: 'Water', formula: 'H2O', density: 0.997, fraction: 99.99 },
      { name: 'Au nanoparticles', formula: 'Au', density: 19.3, fraction: 0.01 },
    ],
  },

  {
    id: 'powder', group: 'Dispersions & powders', icon: '⁘', title: 'Powder in capillary',
    desc: 'Loosely packed oxide powder (~50 % packing)',
    basis: 'vol', porosity: 50, thickness: 1000, target: 37, container: 'boro',
    phases: [{ name: 'TiO2 (anatase)', formula: 'TiO2', density: 3.89, fraction: 100 }],
  },
  {
    id: 'meso-silica', group: 'Dispersions & powders', icon: '⬡', title: 'Mesoporous silica',
    desc: 'SBA-15 / MCM-41 type, high porosity',
    basis: 'vol', porosity: 60, thickness: 1000, target: 37, container: 'kapton',
    phases: [{ name: 'Amorphous silica', formula: 'SiO2', density: 2.2, fraction: 100 }],
  },

  {
    id: 'custom', group: 'Custom', icon: '+', title: 'Start from scratch',
    desc: 'Single phase, define everything yourself',
    basis: 'vol', porosity: 0, thickness: 100, target: 37,
    phases: [{ name: 'My material', formula: 'SiO2', density: 2.2, fraction: 100 }],
  },
];
