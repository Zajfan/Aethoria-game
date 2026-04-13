/**
 * TownBuilder.js — Hearthmoor town structures
 *
 * Builds all 3D geometry for the starting town: town hall, elder's tower,
 * forge, tavern, herb shop, market stalls, residential houses, gate towers,
 * lamp posts, barrels, crates, and a central fountain.
 *
 * All meshes are added to scene3d and tracked for disposal.
 * No tile data is modified — purely visual 3D layer on top of the world.
 */

import { THREE }   from '../engine/Renderer.js';
import { CONFIG }  from '../config.js';

// ── Material helpers ──────────────────────────────────────────────────────────

function mat(color, emissive = 0x000000, emInt = 0) {
  return new THREE.MeshLambertMaterial({
    color,
    emissive:          new THREE.Color(emissive),
    emissiveIntensity: emInt,
  });
}

const MATS = {
  stone:      mat(0x9a9080),
  stoneDark:  mat(0x6a6055),
  stoneLight: mat(0xc0b8a8),
  wood:       mat(0x8b5e3c),
  woodDark:   mat(0x5a3a20),
  woodLight:  mat(0xb8845a),
  thatch:     mat(0xc8a04a),
  slate:      mat(0x4a5060),
  brick:      mat(0xaa5533),
  brickDark:  mat(0x7a3820),
  plaster:    mat(0xe8d8b0),
  window:     mat(0x8ab8d0, 0x4488aa, 0.4),
  windowLit:  mat(0xffcc66, 0xddaa22, 0.8),
  door:       mat(0x4a2e10),
  ironDark:   mat(0x222222),
  iron:       mat(0x444444),
  gold:       mat(0xddaa22, 0xaa7700, 0.3),
  awningRed:  mat(0xcc2222),
  awningBlue: mat(0x2244cc),
  awningGrn:  mat(0x228833),
  awningYel:  mat(0xccaa11),
  awningOrg:  mat(0xcc6611),
  lampGlow:   mat(0xffdd88, 0xffaa33, 1.2),
  barrel:     mat(0x7a5030),
  barrelBand: mat(0x333333),
  water:      mat(0x2288aa, 0x1166aa, 0.3),
  flagRed:    mat(0xcc2222),
  flagBlue:   mat(0x2244aa),
  flagGold:   mat(0xddaa22),
  signBoard:  mat(0x9a7040),
  haybale:    mat(0xe8c84a),
  cloth:      mat(0x886644),
};

// ── Primitive builders ────────────────────────────────────────────────────────

function mkBox(w, h, d, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function mkCyl(rTop, rBot, h, sides, material) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, sides), material);
  m.castShadow = true;
  return m;
}

/** Square-pyramid roof (w × d footprint, h tall). */
function mkRoof(w, d, h, material) {
  // CylinderGeometry(0, r, h, 4) gives a square pyramid; rotate 45° to align axes
  const r  = Math.sqrt(w * w + d * d) / 2;
  const geo = new THREE.CylinderGeometry(0, r, h, 4);
  geo.rotateY(Math.PI / 4);
  // Scale x/z to match w×d
  geo.scale(w / (r * Math.sqrt(2)), 1, d / (r * Math.sqrt(2)));
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  return m;
}

/** Flat slab with a peg on top — used as a flag pole finial. */
function mkCone(r, h, sides, material) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, sides), material);
  m.castShadow = true;
  return m;
}

// ── Compound building helpers ─────────────────────────────────────────────────

/**
 * Add a mesh to a group, positioned at (x, y, z).
 */
function add(group, mesh, x, y, z, ry = 0) {
  mesh.position.set(x, y, z);
  if (ry) mesh.rotation.y = ry;
  group.add(mesh);
  return mesh;
}

/**
 * Window pane: a thin dark-blue rectangle set slightly proud of a wall face.
 */
function mkWindow(w, h, lit = false) {
  return mkBox(w, h, 0.07, lit ? MATS.windowLit : MATS.window);
}

/** Simple doorway rectangle. */
function mkDoor(w, h) {
  return mkBox(w, h, 0.07, MATS.door);
}

/** Flag: pole + coloured pennant. */
function mkFlag(poleH, pennantMat) {
  const g = new THREE.Group();
  add(g, mkCyl(0.04, 0.04, poleH, 6, MATS.iron), 0, poleH / 2, 0);
  const flag = mkBox(0.6, 0.35, 0.04, pennantMat);
  flag.position.set(0.35, poleH - 0.18, 0);
  g.add(flag);
  return g;
}

/** Lamp post: pole + lantern cube with glow. */
function mkLampPost(h = 3.0) {
  const g = new THREE.Group();
  add(g, mkCyl(0.05, 0.07, h, 6, MATS.ironDark), 0, h / 2, 0);
  // Arm
  const arm = mkBox(0.6, 0.05, 0.05, MATS.ironDark);
  arm.position.set(0.3, h - 0.1, 0);
  g.add(arm);
  // Lantern
  const lantern = mkBox(0.22, 0.28, 0.22, MATS.ironDark);
  lantern.position.set(0.6, h - 0.12, 0);
  g.add(lantern);
  const glow = mkBox(0.14, 0.20, 0.14, MATS.lampGlow);
  glow.position.set(0.6, h - 0.12, 0);
  g.add(glow);
  const light = new THREE.PointLight(0xffcc66, 0.7, 6);
  light.position.set(0.6, h - 0.12, 0);
  g.add(light);
  return g;
}

/** Barrel. */
function mkBarrel() {
  const g = new THREE.Group();
  add(g, mkCyl(0.28, 0.28, 0.6, 10, MATS.barrel), 0, 0.3, 0);
  add(g, mkCyl(0.30, 0.30, 0.06, 10, MATS.barrelBand), 0, 0.15, 0);
  add(g, mkCyl(0.30, 0.30, 0.06, 10, MATS.barrelBand), 0, 0.45, 0);
  return g;
}

/** Crate. */
function mkCrate(size = 0.55) {
  const g = new THREE.Group();
  add(g, mkBox(size, size, size, MATS.woodLight), 0, size / 2, 0);
  // Cross planks
  add(g, mkBox(size + 0.02, 0.05, 0.05, MATS.woodDark), 0, size * 0.7, 0);
  add(g, mkBox(0.05, 0.05, size + 0.02, MATS.woodDark), 0, size * 0.7, 0);
  return g;
}

/** Hay bale. */
function mkHaybale() {
  const g = new THREE.Group();
  add(g, mkCyl(0.45, 0.45, 0.7, 12, MATS.haybale), 0, 0.35, 0);
  return g;
}

/** Market stall: awning + table. */
function mkStall(awningMat, label = '') {
  const g = new THREE.Group();
  // Frame pillars
  [[-1.0, 0], [1.0, 0], [-1.0, 1.8], [1.0, 1.8]].forEach(([x, z]) => {
    add(g, mkBox(0.1, 2.8, 0.1, MATS.wood), x, 1.4, z);
  });
  // Awning
  add(g, mkBox(2.4, 0.12, 2.2, awningMat), 0, 2.82, 0.8);
  // Table
  add(g, mkBox(2.0, 0.1, 0.9, MATS.woodDark), 0, 0.9, 0.5);
  add(g, mkBox(0.08, 0.9, 0.08, MATS.wood), -0.9, 0.45, 0.05);
  add(g, mkBox(0.08, 0.9, 0.08, MATS.wood),  0.9, 0.45, 0.05);
  add(g, mkBox(0.08, 0.9, 0.08, MATS.wood), -0.9, 0.45, 0.9);
  add(g, mkBox(0.08, 0.9, 0.08, MATS.wood),  0.9, 0.45, 0.9);
  // Sign board
  if (label) {
    add(g, mkBox(1.2, 0.4, 0.06, MATS.signBoard), 0, 2.0, -0.05);
  }
  return g;
}

// ── Specific buildings ────────────────────────────────────────────────────────

/** Small residential house. */
function buildHouse(wallMat = MATS.plaster, roofMat = MATS.thatch, lit = true) {
  const g = new THREE.Group();
  const W = 3.2, D = 3.0, WH = 2.4;
  // Walls
  add(g, mkBox(W, WH, D, wallMat), 0, WH / 2, 0);
  // Roof
  const roof = mkRoof(W + 0.3, D + 0.3, 1.5, roofMat);
  roof.position.set(0, WH + 0.7, 0);
  g.add(roof);
  // Door
  add(g, mkDoor(0.7, 1.2), 0, 0.6, D / 2 + 0.01);
  // Windows
  add(g, mkWindow(0.55, 0.5, lit), -0.9, 1.4, D / 2 + 0.01);
  add(g, mkWindow(0.55, 0.5, lit),  0.9, 1.4, D / 2 + 0.01);
  return g;
}

/** Medium building (2-storey look). */
function buildMediumBuilding(wallMat, roofMat, details = {}) {
  const g = new THREE.Group();
  const W = 5.0, D = 4.0, WH = 3.5;
  add(g, mkBox(W, WH, D, wallMat), 0, WH / 2, 0);
  // Ledge between stories
  add(g, mkBox(W + 0.2, 0.18, D + 0.2, MATS.stoneDark), 0, WH * 0.48, 0);
  // Roof
  const roof = mkRoof(W + 0.35, D + 0.35, 1.8, roofMat);
  roof.position.set(0, WH + 0.85, 0);
  g.add(roof);
  // Door
  add(g, mkDoor(0.9, 1.5), 0, 0.75, D / 2 + 0.01);
  // Windows ground floor
  add(g, mkWindow(0.7, 0.65, true), -1.5, 1.1, D / 2 + 0.01);
  add(g, mkWindow(0.7, 0.65, true),  1.5, 1.1, D / 2 + 0.01);
  // Windows upper floor
  add(g, mkWindow(0.6, 0.55, true), -1.5, 2.5, D / 2 + 0.01);
  add(g, mkWindow(0.6, 0.55, false),  0.0, 2.5, D / 2 + 0.01);
  add(g, mkWindow(0.6, 0.55, true),  1.5, 2.5, D / 2 + 0.01);
  if (details.sign) {
    add(g, mkBox(1.8, 0.5, 0.08, MATS.signBoard), 0, 1.9, D / 2 + 0.06);
  }
  return g;
}

/** Town Hall — stone, grand entrance steps, banner poles. */
function buildTownHall() {
  const g = new THREE.Group();
  const W = 8.0, D = 6.0, WH = 5.0;
  // Main body
  add(g, mkBox(W, WH, D, MATS.stone), 0, WH / 2, 0);
  // Stone trim
  add(g, mkBox(W + 0.3, 0.25, D + 0.3, MATS.stoneDark), 0, WH, 0);
  add(g, mkBox(W + 0.3, 0.25, D + 0.3, MATS.stoneDark), 0, WH * 0.5, 0);
  // Roof
  const roof = mkRoof(W + 0.5, D + 0.5, 2.5, MATS.slate);
  roof.position.set(0, WH + 1.15, 0);
  g.add(roof);
  // Grand doorway arch (tall door + arch header)
  add(g, mkDoor(1.4, 2.2), 0, 1.1, D / 2 + 0.01);
  add(g, mkBox(1.6, 0.4, 0.1, MATS.stoneDark), 0, 2.3, D / 2 + 0.01);
  // Windows flanking door
  add(g, mkWindow(0.9, 1.0, true), -2.5, 1.8, D / 2 + 0.01);
  add(g, mkWindow(0.9, 1.0, true),  2.5, 1.8, D / 2 + 0.01);
  // Upper windows
  add(g, mkWindow(0.8, 0.8, false), -2.5, 3.5, D / 2 + 0.01);
  add(g, mkWindow(0.8, 0.8, false),  0.0, 3.5, D / 2 + 0.01);
  add(g, mkWindow(0.8, 0.8, false),  2.5, 3.5, D / 2 + 0.01);
  // Steps
  add(g, mkBox(3.5, 0.2, 1.2, MATS.stoneLight), 0, 0.1, D / 2 + 0.6);
  add(g, mkBox(2.8, 0.2, 0.6, MATS.stoneLight), 0, 0.3, D / 2 + 0.3);
  // Banner poles flanking entrance
  const flag1 = mkFlag(4.5, MATS.flagGold);
  flag1.position.set(-3.5, WH, 0);
  g.add(flag1);
  const flag2 = mkFlag(4.5, MATS.flagGold);
  flag2.position.set(3.5, WH, 0);
  g.add(flag2);
  return g;
}

/** Elder Lyra's tower — tall stone spire. */
function buildElderTower() {
  const g = new THREE.Group();
  // Base
  add(g, mkCyl(1.6, 1.9, 1.5, 8, MATS.stone), 0, 0.75, 0);
  // Shaft
  add(g, mkCyl(1.2, 1.6, 8.0, 8, MATS.stone), 0, 5.5, 0);
  // Battlements ring
  add(g, mkCyl(1.4, 1.4, 0.6, 8, MATS.stoneDark), 0, 9.8, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const merlon = mkBox(0.4, 0.6, 0.4, MATS.stone);
    merlon.position.set(Math.cos(a) * 1.3, 10.3, Math.sin(a) * 1.3);
    g.add(merlon);
  }
  // Pointed roof
  const spire = mkCone(0.5, 3.5, 8, MATS.slate);
  spire.position.set(0, 12.2, 0);
  g.add(spire);
  // Glowing windows
  for (let floor = 0; floor < 3; floor++) {
    const y = 2.5 + floor * 2.5;
    const a = floor * Math.PI / 3;
    const win = mkWindow(0.5, 0.7, true);
    win.position.set(Math.cos(a) * 1.21, y, Math.sin(a) * 1.21);
    win.rotation.y = -a;
    g.add(win);
  }
  // Door
  add(g, mkDoor(0.7, 1.3), 0, 0.65, 1.91);
  // Arcane light inside tower
  const light = new THREE.PointLight(0x9966ff, 0.6, 8);
  light.position.set(0, 4, 0);
  g.add(light);
  return g;
}

/** Gareth's Forge — brick building with chimney and fire glow. */
function buildForge() {
  const g = new THREE.Group();
  const W = 4.5, D = 3.5, WH = 3.0;
  add(g, mkBox(W, WH, D, MATS.brick), 0, WH / 2, 0);
  add(g, mkBox(W + 0.2, 0.15, D + 0.2, MATS.brickDark), 0, WH, 0);
  const roof = mkRoof(W + 0.3, D + 0.3, 1.5, MATS.slate);
  roof.position.set(0, WH + 0.7, 0);
  g.add(roof);
  // Chimney (offset to back-right)
  add(g, mkBox(0.8, 3.5, 0.8, MATS.brickDark), 1.2, WH + 1.0, -1.0);
  // Fire glow at chimney top
  const fire = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 8, 6),
    mat(0xff6600, 0xff3300, 1.5),
  );
  fire.position.set(1.2, WH + 2.9, -1.0);
  g.add(fire);
  const fireLight = new THREE.PointLight(0xff6600, 1.2, 8);
  fireLight.position.set(1.2, WH + 3.2, -1.0);
  g.add(fireLight);
  // Door (wide — forge entrance)
  add(g, mkDoor(1.2, 1.8), 0, 0.9, D / 2 + 0.01);
  // Windows
  add(g, mkWindow(0.6, 0.55, true), -1.4, 1.6, D / 2 + 0.01);
  add(g, mkWindow(0.6, 0.55, true),  1.4, 1.6, D / 2 + 0.01);
  // Anvil outside
  add(g, mkBox(0.55, 0.25, 0.35, MATS.iron), 1.5, 0.75, D / 2 + 0.9);
  add(g, mkBox(0.35, 0.5,  0.3,  MATS.ironDark), 1.5, 0.37, D / 2 + 0.9);
  // Sign
  add(g, mkBox(1.6, 0.45, 0.08, MATS.signBoard), 0, 2.0, D / 2 + 0.06);
  return g;
}

/** Tavern — warm timber-framed building with a hanging sign. */
function buildTavern() {
  const g = new THREE.Group();
  const W = 6.0, D = 5.0, WH = 4.0;
  add(g, mkBox(W, WH, D, MATS.plaster), 0, WH / 2, 0);
  // Timber frame cross-bracing (decorative)
  add(g, mkBox(W + 0.1, 0.12, 0.12, MATS.wood), 0, WH * 0.5, D / 2);
  add(g, mkBox(0.12, WH * 0.5, 0.12, MATS.wood), -W / 2, WH * 0.75, D / 2);
  add(g, mkBox(0.12, WH * 0.5, 0.12, MATS.wood),  W / 2, WH * 0.75, D / 2);
  // Roof
  const roof = mkRoof(W + 0.4, D + 0.4, 2.0, MATS.thatch);
  roof.position.set(0, WH + 0.95, 0);
  g.add(roof);
  // Hanging sign arm
  add(g, mkBox(0.08, 0.08, 1.0, MATS.woodDark), -W / 2 + 0.5, WH - 0.3, D / 2 + 0.5);
  add(g, mkBox(0.9, 0.45, 0.07, MATS.signBoard), -W / 2 + 0.5, WH - 0.9, D / 2 + 0.5);
  // Door (double)
  add(g, mkDoor(1.4, 2.0), 0, 1.0, D / 2 + 0.01);
  // Windows ground
  add(g, mkWindow(0.85, 0.8, true), -2.0, 1.2, D / 2 + 0.01);
  add(g, mkWindow(0.85, 0.8, true),  2.0, 1.2, D / 2 + 0.01);
  // Windows upper
  add(g, mkWindow(0.7, 0.7, true), -2.0, 2.8, D / 2 + 0.01);
  add(g, mkWindow(0.7, 0.7, false),  0.0, 2.8, D / 2 + 0.01);
  add(g, mkWindow(0.7, 0.7, true),  2.0, 2.8, D / 2 + 0.01);
  // Warm interior light
  const light = new THREE.PointLight(0xffaa44, 0.5, 10);
  light.position.set(0, 1.5, 0);
  g.add(light);
  return g;
}

/** Mira's herb shop — small cosy building with garden fence. */
function buildHerbShop() {
  const g = new THREE.Group();
  const W = 3.8, D = 3.2, WH = 2.6;
  add(g, mkBox(W, WH, D, mat(0xd8e8c0)), 0, WH / 2, 0);
  const roof = mkRoof(W + 0.3, D + 0.3, 1.4, mat(0x556633));
  roof.position.set(0, WH + 0.65, 0);
  g.add(roof);
  add(g, mkDoor(0.7, 1.2), 0, 0.6, D / 2 + 0.01);
  add(g, mkWindow(0.65, 0.55, true), -1.0, 1.4, D / 2 + 0.01);
  add(g, mkWindow(0.65, 0.55, true),  1.0, 1.4, D / 2 + 0.01);
  // Garden fence posts
  for (let i = -3; i <= 3; i++) {
    add(g, mkBox(0.1, 0.7, 0.1, MATS.woodLight), i * 0.9, 0.35, D / 2 + 1.5);
    if (i < 3) add(g, mkBox(0.85, 0.08, 0.08, MATS.woodLight), i * 0.9 + 0.45, 0.55, D / 2 + 1.5);
  }
  for (let i = -1; i <= 2; i++) {
    add(g, mkBox(0.1, 0.7, 0.1, MATS.woodLight), -2.7, 0.35, D / 2 + 0.65 + i * 0.9);
    add(g, mkBox(0.1, 0.7, 0.1, MATS.woodLight),  2.7, 0.35, D / 2 + 0.65 + i * 0.9);
  }
  // Herb planters
  add(g, mkBox(0.8, 0.25, 0.4, MATS.stoneDark), -1.0, 0.125, D / 2 + 1.0);
  add(g, mkBox(0.8, 0.25, 0.4, MATS.stoneDark),  1.0, 0.125, D / 2 + 1.0);
  add(g, mkBox(0.6, 0.12, 0.3, mat(0x44aa22, 0x226600, 0.2)), -1.0, 0.31, D / 2 + 1.0);
  add(g, mkBox(0.6, 0.12, 0.3, mat(0x66cc33, 0x336600, 0.2)),  1.0, 0.31, D / 2 + 1.0);
  return g;
}

/** Stone gate tower. */
function buildGateTower() {
  const g = new THREE.Group();
  // Shaft
  add(g, mkBox(2.2, 7.0, 2.2, MATS.stone), 0, 3.5, 0);
  // Battlements
  add(g, mkBox(2.5, 0.5, 2.5, MATS.stoneDark), 0, 7.25, 0);
  const pos = [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]];
  pos.forEach(([x, z]) => {
    const m = mkBox(0.45, 0.8, 0.45, MATS.stone);
    m.position.set(x, 7.9, z);
    g.add(m);
  });
  // Arrow slits
  add(g, mkWindow(0.2, 0.7, false), 0, 3.5, 1.12);
  add(g, mkWindow(0.2, 0.7, false), 0, 5.5, 1.12);
  // Torch bracket
  const torchFire = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 6, 4),
    mat(0xff8800, 0xff4400, 1.5),
  );
  torchFire.position.set(1.2, 6.5, 0);
  g.add(torchFire);
  const torchLight = new THREE.PointLight(0xff8800, 0.8, 7);
  torchLight.position.copy(torchFire.position);
  g.add(torchLight);
  return g;
}

/** Central fountain — tiered stone basin. */
function buildFountain() {
  const g = new THREE.Group();
  // Base basin
  add(g, mkCyl(2.2, 2.5, 0.5, 12, MATS.stoneLight), 0, 0.25, 0);
  add(g, mkCyl(2.1, 2.1, 0.1, 12, MATS.water), 0, 0.48, 0);
  // Middle tier
  add(g, mkCyl(1.0, 1.2, 0.4, 12, MATS.stoneLight), 0, 0.85, 0);
  add(g, mkCyl(0.92, 0.92, 0.08, 12, MATS.water), 0, 1.02, 0);
  // Centre column + top
  add(g, mkCyl(0.15, 0.15, 1.0, 8, MATS.stone), 0, 1.35, 0);
  add(g, mkCyl(0.3, 0.3, 0.2, 8, MATS.stoneLight), 0, 1.9, 0);
  // Water shimmer light
  const wLight = new THREE.PointLight(0x44aacc, 0.4, 5);
  wLight.position.set(0, 0.7, 0);
  g.add(wLight);
  return g;
}

/** Notice board. */
function buildNoticeBoard() {
  const g = new THREE.Group();
  add(g, mkBox(0.1, 1.6, 0.1, MATS.wood), -0.6, 0.8, 0);
  add(g, mkBox(0.1, 1.6, 0.1, MATS.wood),  0.6, 0.8, 0);
  add(g, mkBox(1.4, 0.06, 0.1, MATS.wood),  0.0, 1.7, 0);
  add(g, mkBox(1.3, 1.0,  0.06, MATS.signBoard), 0, 1.1, 0);
  // Pinned notes
  add(g, mkBox(0.4, 0.3, 0.02, mat(0xfff8e0)), -0.3, 1.1, 0.04);
  add(g, mkBox(0.35, 0.28, 0.02, mat(0xffeedd)), 0.25, 1.25, 0.04);
  return g;
}

// ── TownBuilder class ─────────────────────────────────────────────────────────

export class TownBuilder {
  constructor() {
    this._meshes = [];
  }

  /**
   * Spawn all town structures.
   * @param {THREE.Scene} scene3d
   * @param {number} cx  World-space centre X (= MAP_W / 2)
   * @param {number} cz  World-space centre Z (= MAP_H / 2)
   */
  build(scene3d, cx, cz) {
    const TS = CONFIG.WORLD_3D.TILE_SIZE;  // 4 world units per tile
    const place = (group, ox, oz, ry = 0) => {
      // cx/cz are tile coords; scale to world space and spread offsets by TS
      group.position.set(cx * TS + TS / 2 + ox * TS, 0, cz * TS + TS / 2 + oz * TS);
      group.scale.setScalar(TS);  // buildings grow with the world
      group.rotation.y = ry;
      group.traverse(child => {
        if (child.isMesh) {
          child.castShadow    = true;
          child.receiveShadow = true;
        }
        // PointLight.distance is in world space — multiply by TS so light radius scales
        if (child.isLight && child.isPointLight && child.distance > 0) {
          child.distance *= TS;
        }
      });
      scene3d.add(group);
      this._meshes.push(group);
    };

    // ── Northern district ─────────────────────────────────────────────────
    // Town Hall — faces south (front door toward market square)
    place(buildTownHall(),    0,  -20, Math.PI);

    // Elder Lyra's Tower — NW corner
    place(buildElderTower(), -18, -18);

    // Gareth's Forge — NE area, faces south
    place(buildForge(),       15, -14, Math.PI);

    // ── Market square (centre) ────────────────────────────────────────────
    // Central fountain
    place(buildFountain(),   0,  -2);

    // Notice board
    place(buildNoticeBoard(), -5, -5, Math.PI * 0.25);

    // Market stalls — row facing south, slightly east of centre
    place(mkStall(MATS.awningRed,  'Baker'),       -12, 3, Math.PI);
    place(mkStall(MATS.awningBlue, 'Herbalist'),    -7, 3, Math.PI);
    place(mkStall(MATS.awningGrn,  'Weapons'),      -2, 3, Math.PI);
    place(mkStall(MATS.awningYel,  'Armour'),         3, 3, Math.PI);
    place(mkStall(MATS.awningOrg,  'Merchant'),       8, 3, Math.PI);

    // Second row of stalls — perpendicular, eastern side of market
    place(mkStall(MATS.awningBlue, 'Potions'),     14,  0, Math.PI * 0.5);
    place(mkStall(MATS.awningRed,  'Scrolls'),     14,  5, Math.PI * 0.5);

    // ── Eastern district ──────────────────────────────────────────────────
    // Tavern — large, east side
    place(buildTavern(),      16,  10, Math.PI);

    // Guard barracks — plain stone building NE
    place(buildMediumBuilding(MATS.stone, MATS.slate), 16, -5, Math.PI);

    // ── Western district ──────────────────────────────────────────────────
    // Mira's herb shop
    place(buildHerbShop(),   -16,   7, Math.PI);

    // ── Residential houses ────────────────────────────────────────────────
    const HOUSE_COLORS = [
      [mat(0xe8d0a8), MATS.thatch],   // tan/thatch
      [mat(0xd0c8b0), MATS.slate],    // grey plaster/slate
      [mat(0xc8d8c0), mat(0x556633)], // green-washed
      [mat(0xe0c8b0), MATS.woodDark], // warm plaster
      [mat(0xd8c0a0), MATS.thatch],
      [mat(0xc0b8a8), MATS.stone],
      [mat(0xe8d8b0), MATS.slate],
      [mat(0xd0c0a8), MATS.thatch],
    ];

    const houses = [
      [-14, -10],   // NW residential
      [ -9,  -8],
      [-16,   0],
      [-14,  16],
      [  9,  16],
      [ 14,  18],
      [ -8,  18],
      [  2,  18],
    ];
    houses.forEach(([ox, oz], i) => {
      const [w, r] = HOUSE_COLORS[i % HOUSE_COLORS.length];
      const facing = Math.PI * (0.25 + Math.round(i * 0.5) * 0.5);
      place(buildHouse(w, r), ox, oz, facing);
    });

    // ── Southern gate ─────────────────────────────────────────────────────
    place(buildGateTower(),  -8, 25);
    place(buildGateTower(),   8, 25);
    // Gate arch connecting towers
    const archH = mkBox(10.0 * TS, 0.8 * TS, 1.0 * TS, MATS.stone);
    archH.position.set(cx * TS + TS / 2, 7.2 * TS, cz * TS + TS / 2 + 25 * TS);
    scene3d.add(archH);
    this._meshes.push(archH);
    // Gate portcullis (decorative)
    const portcullis = mkBox(5.5 * TS, 5.5 * TS, 0.15 * TS, MATS.ironDark);
    portcullis.position.set(cx * TS + TS / 2, 3.5 * TS, cz * TS + TS / 2 + 25 * TS);
    scene3d.add(portcullis);
    this._meshes.push(portcullis);

    // ── Lamp posts ────────────────────────────────────────────────────────
    const lampPositions = [
      [ -6,  -8], [  6,  -8],   // near town hall
      [-10,   1], [ 10,   1],   // market square sides
      [ -5,  10], [  5,  10],   // south market
      [-10,  20], [ 10,  20],   // near gate
      [ -3, -14], [  3, -14],   // north path
    ];
    lampPositions.forEach(([ox, oz]) => {
      place(mkLampPost(3.0), ox, oz);
    });

    // ── Decorative clutter ────────────────────────────────────────────────
    // Barrels near forge
    [[17, -12], [18, -13], [17.5, -11]].forEach(([ox, oz]) => {
      place(mkBarrel(), ox, oz);
    });

    // Crates near market
    [[-11, 6], [-10, 6.8], [10, 6], [11, 6.5]].forEach(([ox, oz]) => {
      place(mkCrate(), ox, oz);
    });

    // Hay bales near gate
    [[-12, 22], [-11, 22.8], [12, 22], [11, 22.6]].forEach(([ox, oz]) => {
      place(mkHaybale(), ox, oz);
    });

    // Barrels near tavern
    [[19, 8], [20, 9], [19, 10]].forEach(([ox, oz]) => {
      place(mkBarrel(), ox, oz);
    });
  }

  /** Remove all spawned meshes from the scene and free geometry/materials. */
  dispose(scene3d) {
    for (const obj of this._meshes) {
      scene3d.remove(obj);
      obj.traverse(child => {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material?.dispose();
      });
    }
    this._meshes = [];
  }
}
