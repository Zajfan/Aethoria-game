/**
 * PointsOfInterest.js — Aethoria v1.0
 *
 * Scatters ~260 interactive exploration POIs across the 4096×4096 world:
 *
 *  RUIN           — collapsed stone structure with loot chest
 *  SHRINE         — ancient altar granting stat buffs
 *  GRAVE          — fallen warrior's grave, drops loot + lore scroll
 *  CRYSTAL_NODE   — Void crystal formation, harvestable material
 *  STANDING_STONE — ancient monolith, reveals map area + lore
 *  HEALING_WELL   — restores HP (cooldown)
 *  MERCHANT_CART  — stranded merchant with rare stock
 *  CAMPFIRE       — rest point, restores HP + clears status effects
 *  WATCHTOWER     — climb for large map reveal + exploration XP
 *  NOTICE_BOARD   — generates 2 procedural quests (cooldown)
 *  BURIED_CHEST   — rich loot cache, better than a ruin
 *  ANCIENT_ALTAR  — sacrifice 100 gold for a powerful random buff
 *  SHIPWRECK      — coastal wreck with unique sea-salvage loot
 *  ABANDONED_CAMP — enemy ambush site + loot
 *  PORTAL_STONE   — activatable fast-travel node
 *
 * Placement: ~70 fixed named POIs at strategic locations +
 *            ~190 procedurally scattered POIs across 10 zones.
 * All positions are deterministic (seeded RNG — seed 42).
 */

import { THREE } from '../engine/Renderer.js';
import { CONFIG } from '../config.js';
import { LORE   } from './LoreDatabase.js';

// World scale constant — tiles are TS world units wide
const TS = CONFIG.WORLD_3D.TILE_SIZE;   // = 4

// Helper: tile coord → world centre of that tile
function tw(t) { return t * TS + TS / 2; }

// ── POI type definitions ──────────────────────────────────────────────────────

export const POI_TYPES = {
  RUIN: {
    label:      'Ancient Ruin',
    icon:       '🏚',
    color:      '#aa9977',
    interactMsg:'E to search the ruin',
    range:      2.5 * TS,
    respawn:    false,
  },
  SHRINE: {
    label:      'Old Shrine',
    icon:       '✦',
    color:      '#ffdd44',
    interactMsg:'E to pray at the shrine',
    range:      2.0 * TS,
    respawn:    true,
    respawnSec: 300,
  },
  GRAVE: {
    label:      "Warrior's Grave",
    icon:       '†',
    color:      '#888888',
    interactMsg:'E to pay respects',
    range:      2.0 * TS,
    respawn:    false,
  },
  CRYSTAL_NODE: {
    label:      'Void Crystal Node',
    icon:       '◈',
    color:      '#cc44ff',
    interactMsg:'E to harvest crystals',
    range:      1.8 * TS,
    respawn:    true,
    respawnSec: 180,
  },
  STANDING_STONE: {
    label:      'Standing Stone',
    icon:       '▲',
    color:      '#4488ff',
    interactMsg:'E to read the inscription',
    range:      2.0 * TS,
    respawn:    false,
  },
  HEALING_WELL: {
    label:      'Ancient Well',
    icon:       '◎',
    color:      '#44ccaa',
    interactMsg:'E to drink from the well',
    range:      2.0 * TS,
    respawn:    true,
    respawnSec: 120,
  },
  MERCHANT_CART: {
    label:      'Stranded Merchant',
    icon:       '🛒',
    color:      '#ffaa44',
    interactMsg:'E to trade',
    range:      3.0 * TS,
    respawn:    false,
  },
  CAMPFIRE: {
    label:      'Campfire',
    icon:       '🔥',
    color:      '#ff8833',
    interactMsg:'E to rest at the campfire',
    range:      2.2 * TS,
    respawn:    true,
    respawnSec: 240,
  },
  WATCHTOWER: {
    label:      'Watchtower',
    icon:       '⬛',
    color:      '#aabbcc',
    interactMsg:'E to climb the tower',
    range:      3.0 * TS,
    respawn:    false,
  },
  NOTICE_BOARD: {
    label:      'Notice Board',
    icon:       '📋',
    color:      '#ddcc88',
    interactMsg:'E to read notices',
    range:      2.5 * TS,
    respawn:    true,
    respawnSec: 600,
  },
  BURIED_CHEST: {
    label:      'Buried Chest',
    icon:       '⬡',
    color:      '#ccaa44',
    interactMsg:'E to excavate the chest',
    range:      2.0 * TS,
    respawn:    false,
  },
  ANCIENT_ALTAR: {
    label:      'Ancient Altar',
    icon:       '⚶',
    color:      '#dd44aa',
    interactMsg:'E to make an offering (100 gold)',
    range:      2.5 * TS,
    respawn:    true,
    respawnSec: 600,
  },
  SHIPWRECK: {
    label:      'Shipwreck',
    icon:       '⚓',
    color:      '#6688aa',
    interactMsg:'E to salvage the wreck',
    range:      3.0 * TS,
    respawn:    false,
  },
  ABANDONED_CAMP: {
    label:      'Abandoned Camp',
    icon:       '⛺',
    color:      '#886644',
    interactMsg:'E to search the camp',
    range:      2.5 * TS,
    respawn:    false,
  },
  PORTAL_STONE: {
    label:      'Portal Stone',
    icon:       '◉',
    color:      '#44ffcc',
    interactMsg:'E to activate the portal',
    range:      2.5 * TS,
    respawn:    false,
  },
};

// ── Buff definitions from shrines & altars ────────────────────────────────────

const SHRINE_BUFFS = [
  { id:'atk_boost',   name:'+8 Attack',       stat:'attack',    amount:8,    dur:180 },
  { id:'def_boost',   name:'+8 Defense',      stat:'defense',   amount:8,    dur:180 },
  { id:'spd_boost',   name:'+20% Speed',      stat:'speedMult', amount:0.2,  dur:120 },
  { id:'hp_regen',    name:'HP Regen',         stat:'hpRegen',   amount:3,    dur:240 },
  { id:'xp_boost',    name:'+30% XP',          stat:'xpMult',    amount:0.3,  dur:300 },
];

const ALTAR_BUFFS = [
  { id:'power_surge', name:'+20 Attack',       stat:'attack',    amount:20,   dur:300 },
  { id:'iron_ward',   name:'+20 Defense',      stat:'defense',   amount:20,   dur:300 },
  { id:'void_sight',  name:'+50% XP',          stat:'xpMult',    amount:0.5,  dur:600 },
  { id:'gale_step',   name:'+40% Speed',       stat:'speedMult', amount:0.4,  dur:240 },
  { id:'vitality',    name:'Restore Full HP',  stat:'heal',      amount:1.0,  dur:0   },
  { id:'war_fury',    name:'+15 ATK & +15 DEF',stat:'attack',    amount:15,   dur:360, also:'defense' },
];

// Seeded PRNG for deterministic scatter placement
function _seededRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// ── Mesh builders ─────────────────────────────────────────────────────────────

function makeMat(color, emissive = 0, intensity = 0) {
  return new THREE.MeshLambertMaterial({
    color,
    emissive: new THREE.Color(emissive),
    emissiveIntensity: intensity,
  });
}

function buildRuinMesh() {
  const g = new THREE.Group();
  const stone = makeMat(0x7a7060);
  const dark  = makeMat(0x4a4035);

  // Broken wall sections
  [[0,0.35,-0.4,0.7,0.04], [0.3,0.25,0.1,0.55,0.5], [-0.4,0.20,0.2,0.4,0.6]].forEach(([x,y,z,h,r]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.5+Math.random()*0.3, h, 0.5), stone);
    m.position.set(x, y, z); m.rotation.y = r; m.castShadow = true; g.add(m);
  });
  // Rubble on ground
  for (let i = 0; i < 5; i++) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + Math.random()*0.1, 0), dark);
    r.position.set((Math.random()-0.5)*1.2, 0.08, (Math.random()-0.5)*1.2);
    r.rotation.set(Math.random()*2,Math.random()*2,Math.random()*2);
    r.castShadow = true; g.add(r);
  }
  return g;
}

function buildShrineMesh() {
  const g = new THREE.Group();
  const base  = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.8), makeMat(0x8a7a60));
  const pillar= new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.8, 0.25), makeMat(0xa09070));
  const altar = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.18, 0.55), makeMat(0x7a6a50));
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.30, 5),
    new THREE.MeshLambertMaterial({ color:0xffcc44, emissive:new THREE.Color(0xff8800), emissiveIntensity:1.0, transparent:true, opacity:0.9 }));

  base.position.y   = 0.13;
  pillar.position.y = 0.65;
  altar.position.y  = 1.12;
  flame.position.y  = 1.38;

  [base, pillar, altar, flame].forEach(m => { m.castShadow = true; g.add(m); });

  // Glow light
  const light = new THREE.PointLight(0xffcc44, 0.8, 4.5);
  light.position.y = 1.5; g.add(light);
  g._shrineLight = light;

  return g;
}

function buildCrystalNodeMesh() {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({
    color: 0xaa44ff, emissive: new THREE.Color(0x660099), emissiveIntensity: 0.7,
  });
  const heights = [0.7, 1.1, 0.85, 0.55, 0.95];
  const angles  = [0, 1.2, 2.4, 3.6, 4.8];
  heights.forEach((h, i) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.09, h, 5), mat);
    m.position.set(Math.cos(angles[i])*0.25, h/2, Math.sin(angles[i])*0.25);
    m.rotation.z = (Math.random()-0.5)*0.3;
    m.castShadow = true; g.add(m);
  });
  const light = new THREE.PointLight(0xaa44ff, 1.0, 5);
  light.position.y = 0.8; g.add(light);
  return g;
}

function buildStandingStoneMesh() {
  const g = new THREE.Group();
  const stone = makeMat(0x607090);
  const rune  = makeMat(0x4488ff, 0x2244cc, 0.6);
  const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.2, 0.35), stone);
  pillar.position.y = 1.1; pillar.castShadow = true; g.add(pillar);
  // Rune glyphs (thin boxes)
  for (let i = 0; i < 4; i++) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.10, 0.04), rune);
    r.position.set(0, 0.5 + i*0.4, 0.19); g.add(r);
  }
  const light = new THREE.PointLight(0x4488ff, 0.5, 4);
  light.position.y = 1.5; g.add(light);
  return g;
}

function buildWellMesh() {
  const g = new THREE.Group();
  const stone = makeMat(0x888070);
  const water = new THREE.MeshLambertMaterial({ color:0x2288aa, transparent:true, opacity:0.8 });
  // Cylindrical well wall
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.70, 12, 1, true), stone);
  wall.position.y = 0.35; wall.castShadow = true; g.add(wall);
  const top = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.55, 12), stone);
  top.rotation.x = -Math.PI/2; top.position.y = 0.71; g.add(top);
  // Water inside
  const waterMesh = new THREE.Mesh(new THREE.CircleGeometry(0.40, 12), water);
  waterMesh.rotation.x = -Math.PI/2; waterMesh.position.y = 0.50; g.add(waterMesh);
  // Rope post + crossbar
  const post1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.08), stone);
  post1.position.set(-0.50, 0.85, 0); g.add(post1);
  const post2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.08), stone);
  post2.position.set( 0.50, 0.85, 0); g.add(post2);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.08, 0.08), stone);
  beam.position.y = 1.35; g.add(beam);
  return g;
}

function buildMerchantCartMesh() {
  const g = new THREE.Group();
  const wood = makeMat(0x8b5e3c);
  const canvas= makeMat(0xddbb88);
  // Cart body
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.9), wood);
  body.position.y = 0.55; body.castShadow = true; g.add(body);
  // Wheels
  [-0.65, 0.65].forEach(x => {
    [-0.40, 0.40].forEach(z => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 12), wood);
      w.position.set(x, 0.28, z); w.rotation.z = Math.PI/2; w.castShadow = true; g.add(w);
    });
  });
  // Canopy
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 1.1), canvas);
  canopy.position.y = 1.10; g.add(canopy);
  // Flag
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.02), makeMat(0xff8844));
  flag.position.set(0.85, 1.38, 0); g.add(flag);
  return g;
}

function buildCampfireMesh() {
  const g = new THREE.Group();
  // Stone ring
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.10, 0), makeMat(0x777060));
    s.position.set(Math.cos(a) * 0.35, 0.08, Math.sin(a) * 0.35); g.add(s);
  }
  // Logs
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.55, 6), makeMat(0x5a3a20));
    log.position.set(Math.cos(a) * 0.15, 0.06, Math.sin(a) * 0.15);
    log.rotation.z = Math.PI / 3; log.rotation.y = a; g.add(log);
  }
  // Flame
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.40, 6),
    new THREE.MeshLambertMaterial({ color:0xff6600, emissive:new THREE.Color(0xff2200), emissiveIntensity:1.2, transparent:true, opacity:0.85 }));
  flame.position.y = 0.28; g.add(flame);
  const light = new THREE.PointLight(0xff6600, 1.2, 5 * TS);
  light.position.y = 0.5; g.add(light);
  g._fireLight = light;
  return g;
}

function buildWatchtowerMesh() {
  const g = new THREE.Group();
  const stone = makeMat(0x706858);
  const dark  = makeMat(0x4a4035);
  // Base
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 0.9), stone);
  base.position.y = 0.13; g.add(base);
  // Tower body
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3.0, 0.7), stone);
  tower.position.y = 1.75; tower.castShadow = true; g.add(tower);
  // Battlements (4 corners)
  [[-0.25,-0.25],[0.25,-0.25],[0.25,0.25],[-0.25,0.25]].forEach(([bx,bz]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.35, 0.22), stone);
    b.position.set(bx, 3.45, bz); g.add(b);
  });
  // Flag
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 4), dark);
  pole.position.set(0, 3.8, 0); g.add(pole);
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.02), makeMat(0xcc2222));
  flag.position.set(0.2, 4.05, 0); g.add(flag);
  // Arrow slit lights
  const light = new THREE.PointLight(0xffeecc, 0.4, 3 * TS);
  light.position.y = 2.0; g.add(light);
  return g;
}

function buildNoticeBoardMesh() {
  const g = new THREE.Group();
  const wood = makeMat(0x7a5530);
  const paper= makeMat(0xeedd99);
  // Posts
  [-0.35, 0.35].forEach(x => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.1), wood);
    p.position.set(x, 0.75, 0); p.castShadow = true; g.add(p);
  });
  // Board
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.65, 0.08), wood);
  board.position.y = 1.15; g.add(board);
  // Papers pinned on board
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.02),
      new THREE.MeshLambertMaterial({ color: [0xeedd99,0xddeecc,0xeeddbb,0xffe0cc][i] }));
    p.position.set(-0.28 + (i % 2) * 0.38, 1.10 + (i < 2 ? 0.12 : -0.12), 0.06); g.add(p);
  }
  const light = new THREE.PointLight(0xffee88, 0.3, 2 * TS);
  light.position.y = 1.5; g.add(light);
  return g;
}

function buildBuriedChestMesh() {
  const g = new THREE.Group();
  const wood  = makeMat(0x6a4520);
  const metal = makeMat(0x888855);
  const gold  = new THREE.MeshLambertMaterial({ color:0xddaa22, emissive:new THREE.Color(0x886600), emissiveIntensity:0.5 });
  // Dirt mound
  const mound = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 4), makeMat(0x7a6040));
  mound.scale.y = 0.35; mound.position.y = 0.12; g.add(mound);
  // Chest partially sticking out
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.38, 0.40), wood);
  chest.position.y = 0.18; chest.rotation.y = 0.3; g.add(chest);
  // Metal bands
  [-0.10, 0.10].forEach(y => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.05, 0.42), metal);
    b.position.set(0, 0.18 + y, 0); b.rotation.y = 0.3; g.add(b);
  });
  // Golden lock
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.06), gold);
  lock.position.set(0, 0.28, 0.22); lock.rotation.y = 0.3; g.add(lock);
  const light = new THREE.PointLight(0xddaa22, 0.6, 2.5 * TS);
  light.position.y = 0.5; g.add(light);
  return g;
}

function buildAncientAltarMesh() {
  const g = new THREE.Group();
  const stone = makeMat(0x5a4838);
  const glow  = new THREE.MeshLambertMaterial({ color:0xdd44aa, emissive:new THREE.Color(0xaa0066), emissiveIntensity:0.9, transparent:true, opacity:0.95 });
  // Stepped base
  const s1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 1.0), stone); s1.position.y = 0.09; g.add(s1);
  const s2 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 0.80), stone); s2.position.y = 0.27; g.add(s2);
  const top= new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.15, 0.65), stone); top.position.y = 0.42; g.add(top);
  // Glowing bowl
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.18, 8), glow);
  bowl.position.y = 0.57; g.add(bowl);
  // Rune carvings on sides
  [-0.3, 0.3].forEach(x => {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.20, 0.04), makeMat(0xdd44aa, 0x880044, 0.6));
    r.position.set(x, 0.35, 0.35); g.add(r);
  });
  const light = new THREE.PointLight(0xdd44aa, 1.2, 5 * TS);
  light.position.y = 0.8; g.add(light);
  g._altarLight = light;
  return g;
}

function buildShipwreckMesh() {
  const g = new THREE.Group();
  const wood = makeMat(0x4a3018);
  const dark = makeMat(0x2a1808);
  // Hull sections
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.9), wood);
  hull.position.set(0, 0.2, 0); hull.rotation.y = 0.4; hull.castShadow = true; g.add(hull);
  const bow = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.7), dark);
  bow.position.set(1.2, 0.15, 0.1); bow.rotation.y = 0.4; g.add(bow);
  // Broken mast
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.8, 6), wood);
  mast.position.set(-0.3, 0.9, 0.1); mast.rotation.z = 0.6; g.add(mast);
  // Sail remnant
  const sail = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.55, 0.02), makeMat(0xbbaa88, 0, 0));
  sail.position.set(-0.8, 1.3, 0.1); sail.rotation.z = 0.6; sail.rotation.y = 0.4; g.add(sail);
  // Barnacles / rubble
  for (let i = 0; i < 6; i++) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08 + Math.random()*0.06, 0), dark);
    r.position.set((Math.random()-0.5)*2, 0.06, (Math.random()-0.5)*0.8); g.add(r);
  }
  return g;
}

function buildAbandonedCampMesh() {
  const g = new THREE.Group();
  const wood = makeMat(0x6a4520);
  const cloth= makeMat(0x886644);
  // Tent frame
  const pole1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 5), wood);
  pole1.position.set(-0.4, 0.7, 0); g.add(pole1);
  const pole2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 5), wood);
  pole2.position.set( 0.4, 0.7, 0); g.add(pole2);
  // Ragged canvas
  const canvas1 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.04, 0.75), cloth);
  canvas1.position.set(0, 1.35, -0.2); canvas1.rotation.x = 0.5; g.add(canvas1);
  const canvas2 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.04, 0.65), cloth);
  canvas2.position.set(0, 1.35, 0.25); canvas2.rotation.x = -0.4; g.add(canvas2);
  // Cold fire pit
  const pit = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 10), makeMat(0x333222));
  pit.position.set(0.8, 0.03, 0.5); g.add(pit);
  // Scattered debris
  for (let i = 0; i < 4; i++) {
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.15,0.06,0.12), makeMat(0x556644));
    d.position.set((Math.random()-0.5)*1.8, 0.04, (Math.random()-0.5)*1.2); g.add(d);
  }
  return g;
}

function buildPortalStoneMesh() {
  const g = new THREE.Group();
  const stone  = makeMat(0x4a5870);
  const glow   = new THREE.MeshLambertMaterial({ color:0x44ffcc, emissive:new THREE.Color(0x00cc88), emissiveIntensity:0.9 });
  const rune   = makeMat(0x44ffcc, 0x00cc88, 0.8);
  // Two tall pillars
  [-0.5, 0.5].forEach(x => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.6, 0.35), stone);
    p.position.set(x * TS * 0.1, 1.3, 0); p.castShadow = true;
    // Rune lines
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 0.04), rune);
      r.position.set(x * TS * 0.1, 0.6 + i * 0.55, 0.20); g.add(r);
    }
    g.add(p);
  });
  // Arch lintel
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.30, 0.30), stone);
  lintel.position.y = 2.75; g.add(lintel);
  // Portal energy disc (inactive — dim)
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), glow);
  disc.position.y = 1.3; disc.rotation.y = Math.PI / 2; g.add(disc);
  g._portalDisc = disc;
  const light = new THREE.PointLight(0x44ffcc, 0.8, 4 * TS);
  light.position.y = 1.5; g.add(light);
  g._portalLight = light;
  return g;
}

// ── PointsOfInterest class ────────────────────────────────────────────────────

export class PointsOfInterest {
  /**
   * @param {THREE.Scene} scene3d
   * @param {THREE.Camera} camera
   * @param {EventBus} eventBus
   */
  constructor(scene3d, camera, eventBus) {
    this._scene   = scene3d;
    this._camera  = camera;
    this._bus     = eventBus;
    this._pois    = [];      // all spawned POI objects
    this._labels  = [];      // DOM label elements
    this._keyHandler = null;
  }

  // ── Spawning ───────────────────────────────────────────────────────────────

  /**
   * Place POIs deterministically across the map.
   * @param {number[][]} mapData  tile ID grid
   * @param {number} W  @param {number} H  map dimensions
   */
  spawnAll(mapData, W, H) {
    const cx = Math.floor(W / 2);
    const cz = Math.floor(H / 2);

    const FLAT_TILES = new Set([
      CONFIG.TILES.GRASS, CONFIG.TILES.SAND,
      CONFIG.TILES.FOREST, CONFIG.TILES.PATH,
    ]);

    // ── Fixed named POIs at strategic locations (offsets from map centre) ──────
    const FIXED = [
      // ── Near Hearthmoor (within ±400 tiles) ──────────────────────────────
      { type:'HEALING_WELL',    ox: -30, oz:-36 },
      { type:'SHRINE',          ox:  44, oz: 20 },
      { type:'STANDING_STONE',  ox: -40, oz: 30 },
      { type:'RUIN',            ox:  56, oz:-40 },
      { type:'GRAVE',           ox: -20, oz: 56 },
      { type:'CAMPFIRE',        ox:  80, oz: 50 },
      { type:'NOTICE_BOARD',    ox: -60, oz:-50 },
      { type:'PORTAL_STONE',    ox: 200, oz:-80 },
      { type:'WATCHTOWER',      ox:-180, oz:-60 },
      { type:'CAMPFIRE',        ox:-100, oz: 80 },
      { type:'BURIED_CHEST',    ox: 120, oz:-120 },
      { type:'ANCIENT_ALTAR',   ox:-220, oz: 160 },
      { type:'NOTICE_BOARD',    ox: 240, oz: 140 },
      { type:'HEALING_WELL',    ox:-200, oz:-200 },
      { type:'SHRINE',          ox: 300, oz:-200 },
      // ── Elandor Plains (NW — ox -400 to -1200, oz -400 to -1200) ─────────
      { type:'RUIN',            ox:-480, oz:-380 },
      { type:'SHRINE',          ox:-600, oz:-280 },
      { type:'MERCHANT_CART',   ox:-520, oz:-620 },
      { type:'CRYSTAL_NODE',    ox:-700, oz:-660 },
      { type:'STANDING_STONE',  ox:-380, oz:-760 },
      { type:'RUIN',            ox:-880, oz:-420 },
      { type:'GRAVE',           ox:-560, oz:-820 },
      { type:'HEALING_WELL',    ox:-820, oz:-580 },
      { type:'WATCHTOWER',      ox:-720, oz:-320 },
      { type:'CAMPFIRE',        ox:-480, oz:-520 },
      { type:'NOTICE_BOARD',    ox:-880, oz:-720 },
      { type:'BURIED_CHEST',    ox:-640, oz:-440 },
      { type:'PORTAL_STONE',    ox:-900, oz:-500 },
      { type:'ABANDONED_CAMP',  ox:-560, oz:-360 },
      { type:'ANCIENT_ALTAR',   ox:-780, oz:-880 },
      { type:'SHRINE',          ox:-1000,oz:-400 },
      { type:'RUIN',            ox:-1100,oz:-700 },
      { type:'STANDING_STONE',  ox:-820, oz:-960 },
      { type:'CAMPFIRE',        ox:-960, oz:-840 },
      // ── Whispering Marshes (SE — ox +400 to +1200, oz +400 to +1200) ─────
      { type:'CRYSTAL_NODE',    ox: 500, oz: 560 },
      { type:'SHRINE',          ox: 680, oz: 480 },
      { type:'RUIN',            ox: 480, oz: 760 },
      { type:'STANDING_STONE',  ox: 820, oz: 700 },
      { type:'HEALING_WELL',    ox: 600, oz: 900 },
      { type:'GRAVE',           ox: 900, oz: 540 },
      { type:'MERCHANT_CART',   ox: 720, oz: 980 },
      { type:'CRYSTAL_NODE',    ox:1000, oz: 760 },
      { type:'CAMPFIRE',        ox: 460, oz: 440 },
      { type:'ABANDONED_CAMP',  ox: 700, oz: 660 },
      { type:'NOTICE_BOARD',    ox: 900, oz: 860 },
      { type:'ANCIENT_ALTAR',   ox:1100, oz: 600 },
      { type:'PORTAL_STONE',    ox: 800, oz:1100 },
      { type:'WATCHTOWER',      ox: 560, oz: 860 },
      { type:'BURIED_CHEST',    ox:1000, oz:1000 },
      // ── Ashveil Peaks (NE — ox +400 to +1600, oz -400 to -1600) ──────────
      { type:'RUIN',            ox: 760, oz:-560 },
      { type:'CRYSTAL_NODE',    ox: 900, oz:-760 },
      { type:'SHRINE',          ox:1000, oz:-480 },
      { type:'STANDING_STONE',  ox: 700, oz:-880 },
      { type:'GRAVE',           ox:1100, oz:-660 },
      { type:'MERCHANT_CART',   ox: 820, oz:-1000 },
      { type:'CAMPFIRE',        ox: 580, oz:-680 },
      { type:'ABANDONED_CAMP',  ox: 960, oz:-580 },
      { type:'WATCHTOWER',      ox:1200, oz:-800 },
      { type:'CRYSTAL_NODE',    ox:1300, oz:-500 },
      { type:'BURIED_CHEST',    ox: 840, oz:-1100 },
      { type:'PORTAL_STONE',    ox:1400, oz:-900 },
      // ── Shattered Coast (SW — ox -400 to -1600, oz +400 to +1600) ────────
      { type:'RUIN',            ox:-600, oz: 700 },
      { type:'SHRINE',          ox:-780, oz: 820 },
      { type:'MERCHANT_CART',   ox:-700, oz: 900 },
      { type:'CRYSTAL_NODE',    ox:-880, oz: 760 },
      { type:'STANDING_STONE',  ox:-480, oz: 980 },
      { type:'GRAVE',           ox:-980, oz: 920 },
      { type:'SHIPWRECK',       ox:-600, oz:1100 },
      { type:'SHIPWRECK',       ox:-820, oz:1300 },
      { type:'CAMPFIRE',        ox:-540, oz: 780 },
      { type:'NOTICE_BOARD',    ox:-760, oz:1060 },
      { type:'PORTAL_STONE',    ox:-900, oz:1200 },
      { type:'WATCHTOWER',      ox:-480, oz: 640 },
      // ── Deep wilderness — mid-distances (±1200 to ±1800) ─────────────────
      { type:'STANDING_STONE',  ox:   0, oz:-1400 },  // Far north sentinel
      { type:'SHRINE',          ox:-1200,oz:   0  },  // Far west shrine
      { type:'PORTAL_STONE',    ox:1600, oz:  200 },  // East portal
      { type:'PORTAL_STONE',    ox:-400, oz:-1600 },  // North portal
      { type:'ANCIENT_ALTAR',   ox:   0, oz: 1400 },  // Far south altar
      { type:'WATCHTOWER',      ox: 1400,oz: 1000 },  // SE wilderness tower
      { type:'WATCHTOWER',      ox:-1400,oz: -800 },  // NW wilderness tower
      { type:'RUIN',            ox:1200, oz:-1200 },  // Far NE ruin
      { type:'RUIN',            ox:-1200,oz: 1200 },  // Far SW ruin
      { type:'SHIPWRECK',       ox:-1200,oz:  900 },  // Coastal wreck far SW
      { type:'BURIED_CHEST',    ox:1500, oz: -300 },  // East treasure
      { type:'BURIED_CHEST',    ox:-300, oz: 1500 },  // South treasure
      { type:'CRYSTAL_NODE',    ox:1400, oz:-400  },  // Ashveil deep crystal
      { type:'CRYSTAL_NODE',    ox: -400,oz: 1400 },  // Shattered deep crystal
    ];

    // ── Procedural scatter zones (~190 additional POIs) ───────────────────────
    // Each zone: { ox, oz, r, n, types[] }
    // ox/oz = zone centre offset from map centre; r = radius; n = count
    const SCATTER_ZONES = [
      // Hearthmoor surroundings
      { ox:    0, oz:    0, r: 380, n: 18, excR: 100,
        types: ['RUIN','SHRINE','GRAVE','CAMPFIRE','NOTICE_BOARD','HEALING_WELL','BURIED_CHEST','ABANDONED_CAMP'] },
      // Elandor Plains core
      { ox: -750, oz: -700, r: 750, n: 28,
        types: ['RUIN','SHRINE','GRAVE','CAMPFIRE','STANDING_STONE','HEALING_WELL','CRYSTAL_NODE','ABANDONED_CAMP','BURIED_CHEST','NOTICE_BOARD','WATCHTOWER'] },
      // Whispering Marshes core
      { ox:  700, oz:  720, r: 650, n: 26,
        types: ['CRYSTAL_NODE','SHRINE','RUIN','GRAVE','CAMPFIRE','ABANDONED_CAMP','HEALING_WELL','STANDING_STONE','BURIED_CHEST','MERCHANT_CART'] },
      // Ashveil Peaks core
      { ox:  950, oz: -950, r: 600, n: 22,
        types: ['RUIN','CRYSTAL_NODE','SHRINE','GRAVE','CAMPFIRE','ABANDONED_CAMP','BURIED_CHEST','STANDING_STONE'] },
      // Shattered Coast core
      { ox: -850, oz: 1000, r: 600, n: 20,
        types: ['RUIN','SHRINE','GRAVE','SHIPWRECK','CAMPFIRE','ABANDONED_CAMP','CRYSTAL_NODE','BURIED_CHEST','STANDING_STONE'] },
      // Far north wilderness
      { ox:    0, oz:-1500, r: 550, n: 18,
        types: ['RUIN','GRAVE','CAMPFIRE','ABANDONED_CAMP','STANDING_STONE','CRYSTAL_NODE','BURIED_CHEST'] },
      // Far east wilderness
      { ox: 1500, oz:    0, r: 550, n: 18,
        types: ['RUIN','SHRINE','GRAVE','CAMPFIRE','CRYSTAL_NODE','ABANDONED_CAMP','BURIED_CHEST'] },
      // Far south wilderness
      { ox:    0, oz: 1500, r: 550, n: 18,
        types: ['RUIN','GRAVE','CAMPFIRE','SHIPWRECK','STANDING_STONE','ABANDONED_CAMP','BURIED_CHEST'] },
      // Far west wilderness
      { ox:-1500, oz:    0, r: 550, n: 18,
        types: ['RUIN','SHRINE','GRAVE','CAMPFIRE','ABANDONED_CAMP','CRYSTAL_NODE','BURIED_CHEST'] },
      // Corner wilderness: NE
      { ox: 1500, oz:-1500, r: 500, n: 14,
        types: ['RUIN','GRAVE','CAMPFIRE','CRYSTAL_NODE','ABANDONED_CAMP','STANDING_STONE'] },
      // Corner wilderness: SW
      { ox:-1500, oz: 1500, r: 500, n: 14,
        types: ['RUIN','GRAVE','CAMPFIRE','SHIPWRECK','ABANDONED_CAMP','CRYSTAL_NODE'] },
    ];

    const rng = _seededRng(CONFIG.WORLD_SEED ?? 42);

    // Helper: find nearest walkable tile within radius 6
    const findWalkable = (tx, tz) => {
      for (let r = 0; r <= 6; r++) {
        for (let dz = -r; dz <= r; dz++) {
          for (let dx = -r; dx <= r; dx++) {
            if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
            const nx = tx + dx, nz = tz + dz;
            if (nx < 4 || nz < 4 || nx >= W-4 || nz >= H-4) continue;
            if (FLAT_TILES.has(mapData[nz]?.[nx])) return { tx: nx, tz: nz };
          }
        }
      }
      return null;
    };

    // Place fixed POIs
    for (const bp of FIXED) {
      const tx = cx + bp.ox;
      const tz = cz + bp.oz;
      const found = findWalkable(tx, tz);
      if (found) this._spawnPOI(bp.type, found.tx, found.tz);
    }

    // Place scattered POIs
    for (const zone of SCATTER_ZONES) {
      for (let i = 0; i < zone.n; i++) {
        // Random point in circle using rejection sampling (seeded)
        let rx, rz, tries = 0;
        do {
          const angle = rng() * Math.PI * 2;
          const dist  = rng() * zone.r;
          rx = Math.round(cx + zone.ox + Math.cos(angle) * dist);
          rz = Math.round(cz + zone.oz + Math.sin(angle) * dist);
          tries++;
        } while (zone.excR && Math.hypot(rx - cx, rz - cz) < zone.excR && tries < 20);

        const found = findWalkable(rx, rz);
        if (!found) continue;

        // Pick type from zone pool
        const type = zone.types[Math.floor(rng() * zone.types.length)];
        // Avoid placing on top of existing POI
        const tooClose = this._pois.some(p =>
          Math.hypot(p.tx - found.tx, p.tz - found.tz) < 12,
        );
        if (!tooClose) this._spawnPOI(type, found.tx, found.tz);
      }
    }

    // E key interaction
    this._setupKeyHandler();
  }

  _spawnPOI(typeKey, tx, tz) {
    const def  = POI_TYPES[typeKey];
    if (!def) return;

    let mesh;
    switch (typeKey) {
      case 'RUIN':           mesh = buildRuinMesh();          break;
      case 'SHRINE':         mesh = buildShrineMesh();        break;
      case 'CRYSTAL_NODE':   mesh = buildCrystalNodeMesh();   break;
      case 'STANDING_STONE': mesh = buildStandingStoneMesh(); break;
      case 'HEALING_WELL':   mesh = buildWellMesh();          break;
      case 'MERCHANT_CART':  mesh = buildMerchantCartMesh();  break;
      case 'CAMPFIRE':       mesh = buildCampfireMesh();      break;
      case 'WATCHTOWER':     mesh = buildWatchtowerMesh();    break;
      case 'NOTICE_BOARD':   mesh = buildNoticeBoardMesh();   break;
      case 'BURIED_CHEST':   mesh = buildBuriedChestMesh();   break;
      case 'ANCIENT_ALTAR':  mesh = buildAncientAltarMesh();  break;
      case 'SHIPWRECK':      mesh = buildShipwreckMesh();     break;
      case 'ABANDONED_CAMP': mesh = buildAbandonedCampMesh(); break;
      case 'PORTAL_STONE':   mesh = buildPortalStoneMesh();   break;
      default: mesh = buildRuinMesh();
    }

    mesh.position.set(tw(tx), 0, tw(tz));
    mesh.scale.setScalar(TS);
    this._scene.add(mesh);

    // DOM label
    const labelEl = document.createElement('div');
    labelEl.style.cssText = `
      position:fixed; pointer-events:none; z-index:3500;
      font-family:'Courier New',monospace; font-size:10px;
      color:${def.color}; text-shadow:0 0 6px ${def.color},1px 1px 2px #000;
      transform:translate(-50%,-100%); white-space:nowrap; display:none;
    `;
    labelEl.textContent = `${def.icon} ${def.label}`;
    document.body.appendChild(labelEl);

    const poi = {
      typeKey, tx, tz, mesh, labelEl,
      def, used: false, cooldown: 0,
      // For merchants: generate stock on spawn
      stock: typeKey === 'MERCHANT_CART' ? this._generateMerchantStock() : null,
    };
    this._pois.push(poi);
    return poi;
  }

  _generateMerchantStock() {
    const rareItems = ['runesword','voidstaff','dragonhide','runeshield','gem','crystal','rejuvenate'];
    const stock = [];
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      stock.push(rareItems[Math.floor(Math.random() * rareItems.length)]);
    }
    return [...new Set(stock)];
  }

  // ── Interaction ────────────────────────────────────────────────────────────

  _setupKeyHandler() {
    this._keyHandler = (e) => {
      if (e.key !== 'e' && e.key !== 'E') return;
      const nearby = this._getNearbyPOI();
      if (nearby) this._interact(nearby);
    };
    window.addEventListener('keydown', this._keyHandler);
  }

  _getNearbyPOI() {
    if (!this._player) return null;
    const px = this._player.position.x;
    const pz = this._player.position.z;
    for (const poi of this._pois) {
      if (poi.used && !poi.def.respawn) continue;
      if (poi.cooldown > 0) continue;
      const dist = Math.hypot(px - tw(poi.tx), pz - tw(poi.tz));
      if (dist < poi.def.range) return poi;
    }
    return null;
  }

  _interact(poi) {
    const player = this._player;
    if (!player) return;

    switch (poi.typeKey) {
      case 'RUIN':           this._interactRuin(poi);       break;
      case 'SHRINE':         this._interactShrine(poi);     break;
      case 'GRAVE':          this._interactGrave(poi);      break;
      case 'CRYSTAL_NODE':   this._interactCrystal(poi);    break;
      case 'STANDING_STONE': this._interactStone(poi);      break;
      case 'HEALING_WELL':   this._interactWell(poi);       break;
      case 'MERCHANT_CART':  this._interactMerchant(poi);   break;
      case 'CAMPFIRE':       this._interactCampfire(poi);   break;
      case 'WATCHTOWER':     this._interactWatchtower(poi); break;
      case 'NOTICE_BOARD':   this._interactNoticeBoard(poi);break;
      case 'BURIED_CHEST':   this._interactBuriedChest(poi);break;
      case 'ANCIENT_ALTAR':  this._interactAltar(poi);      break;
      case 'SHIPWRECK':      this._interactShipwreck(poi);  break;
      case 'ABANDONED_CAMP': this._interactAbandonedCamp(poi);break;
      case 'PORTAL_STONE':   this._interactPortalStone(poi);break;
    }
  }

  _interactRuin(poi) {
    poi.used = true;
    poi.labelEl.style.display = 'none';
    // Drop loot
    const loot = ['gold', Math.random() > 0.5 ? 'gem' : 'crystal', Math.random() > 0.6 ? 'scroll' : 'potion'];
    loot.forEach(itemKey => {
      this._bus.emit('spawnLoot', {
        x: tw(poi.tx) + (Math.random()-0.5)*1.5, y: 0.3,
        z: tw(poi.tz) + (Math.random()-0.5)*1.5, itemKey,
      });
    });
    this._bus.emit('chestOpened', { x: tw(poi.tx), z: tw(poi.tz) });
    this._bus.emit('hudLog', { msg: '📦 You searched the ruin and found something.', color:'#aa9977' });
  }

  _interactShrine(poi) {
    poi.cooldown = poi.def.respawnSec;
    const buff = SHRINE_BUFFS[Math.floor(Math.random() * SHRINE_BUFFS.length)];
    this._bus.emit('shrineBlessing', { buff });
    this._bus.emit('hudLog', { msg: `✦ The shrine grants: ${buff.name} (${buff.dur}s)`, color:'#ffdd44' });
    this._bus.emit('codexUnlocked', { category:'history', id:'hearthmoor_founding' });
    // Visual flash
    this._bus.emit('levelUp', this._player.stats.level);
  }

  _interactGrave(poi) {
    poi.used = true;
    poi.labelEl.style.display = 'none';
    const scroll = LORE.scrolls[Math.floor(Math.random() * LORE.scrolls.length)];
    this._bus.emit('spawnLoot', { x: tw(poi.tx), y: 0.3, z: tw(poi.tz), itemKey:'scroll' });
    this._bus.emit('scrollPickedUp', { scroll });
    this._bus.emit('hudLog', { msg: "† You found something left at the grave.", color:'#888888' });
  }

  _interactCrystal(poi) {
    poi.cooldown = poi.def.respawnSec;
    const qty = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < qty; i++) {
      this._bus.emit('spawnLoot', {
        x: tw(poi.tx) + (Math.random()-0.5)*1.0, y: 0.3,
        z: tw(poi.tz) + (Math.random()-0.5)*1.0, itemKey:'crystal',
      });
    }
    this._bus.emit('hudLog', { msg: `◈ Harvested ${qty} Void Crystal${qty>1?'s':''}.`, color:'#cc44ff' });
  }

  _interactStone(poi) {
    poi.used = true;
    const scrolls = LORE.scrolls;
    const scroll  = scrolls[Math.floor(Math.random() * scrolls.length)];
    this._bus.emit('scrollPickedUp', { scroll });
    this._bus.emit('codexUnlocked',  { category:'regions', id:this._getCurrentRegion() });
    this._bus.emit('hudLog', { msg: '▲ The stone inscription reveals ancient knowledge.', color:'#4488ff' });
    // Pulse nearby map area reveal
    this._bus.emit('mapReveal', { tx: poi.tx, tz: poi.tz, radius: 40 });
  }

  _interactWell(poi) {
    poi.cooldown = poi.def.respawnSec;
    const heal = Math.floor(this._player.stats.maxHp * 0.40);
    this._player.stats.hp = Math.min(this._player.stats.maxHp, (this._player.stats.hp ?? 0) + heal);
    this._player.eventBus?.emit('statsChanged', this._player.stats);
    this._bus.emit('hudLog', { msg: `◎ The ancient water restores +${heal} HP.`, color:'#44ccaa' });
    this._bus.emit('healBurst', { x: tw(poi.tx), z: tw(poi.tz) });
  }

  _interactMerchant(poi) {
    // Open a temporary shop via HUD event
    this._bus.emit('merchantCartOpen', {
      stock: poi.stock,
      tx: poi.tx, tz: poi.tz,
    });
    this._bus.emit('hudLog', { msg: '🛒 A stranded merchant offers rare wares.', color:'#ffaa44' });
  }

  _interactCampfire(poi) {
    poi.cooldown = poi.def.respawnSec;
    const heal = Math.floor((this._player.stats.maxHp ?? 100) * 0.25);
    this._player.stats.hp = Math.min(
      this._player.stats.maxHp ?? 100,
      (this._player.stats.hp ?? 0) + heal,
    );
    // Clear status effects
    if (this._player.statusEffects) this._player.statusEffects.clear?.();
    this._player.eventBus?.emit('statsChanged', this._player.stats);
    this._bus.emit('hudLog', { msg: `🔥 You rest at the campfire. +${heal} HP, status effects cleared.`, color:'#ff8833' });
    this._bus.emit('healBurst', { x: tw(poi.tx), z: tw(poi.tz) });
  }

  _interactWatchtower(poi) {
    poi.used = true;
    this._bus.emit('mapReveal', { tx: poi.tx, tz: poi.tz, radius: 120 });
    this._bus.emit('xpGain', { amount: 200, reason: 'Watchtower surveyed' });
    const scroll = LORE.scrolls?.[Math.floor(Math.random() * (LORE.scrolls?.length ?? 1))];
    if (scroll) this._bus.emit('scrollPickedUp', { scroll });
    this._bus.emit('hudLog', { msg: '⬛ From the top you can see for miles. Area revealed.', color:'#aabbcc' });
    this._bus.emit('codexUnlocked', { category:'regions', id: this._getCurrentRegion() });
  }

  _interactNoticeBoard(poi) {
    poi.cooldown = poi.def.respawnSec;
    // Generate 2 quick quests via the quest system event
    this._bus.emit('noticeBoardOpened', { tx: poi.tx, tz: poi.tz, count: 2 });
    this._bus.emit('hudLog', { msg: '📋 You scan the notice board and find new work.', color:'#ddcc88' });
  }

  _interactBuriedChest(poi) {
    poi.used = true;
    poi.labelEl.style.display = 'none';
    const rarePool = ['runesword','voidstaff','dragonhide','runeshield','gem','crystal',
                      'void_essence','soulstone','amulet_fury','ring_power','dragonscale',
                      'mithril_ore','rejuvenate','elixir'];
    const count = 3 + Math.floor(Math.random() * 3);
    const chosen = [];
    while (chosen.length < count) {
      const item = rarePool[Math.floor(Math.random() * rarePool.length)];
      if (!chosen.includes(item)) chosen.push(item);
    }
    chosen.forEach(itemKey => {
      this._bus.emit('spawnLoot', { x: tw(poi.tx) + (Math.random()-0.5), y:0.3, z: tw(poi.tz) + (Math.random()-0.5), itemKey });
    });
    this._bus.emit('spawnLoot', { x: tw(poi.tx), y:0.3, z: tw(poi.tz), itemKey:'gold' });
    this._bus.emit('hudLog', { msg: `⬡ You dig up a buried chest! Found ${count+1} items.`, color:'#ccaa44' });
    this._bus.emit('chestOpened', { x: tw(poi.tx), z: tw(poi.tz) });
    this._bus.emit('achievement', { name:'Treasure Hunter', desc:'Excavated a buried chest.' });
  }

  _interactAltar(poi) {
    const player = this._player;
    if (!player) return;
    const gold = player.inventory?.gold ?? 0;
    if (gold < 100) {
      this._bus.emit('hudLog', { msg: '⚶ The altar demands 100 gold. You cannot afford the offering.', color:'#dd44aa' });
      return;
    }
    poi.cooldown = poi.def.respawnSec;
    player.inventory.gold = gold - 100;
    player.eventBus?.emit('statsChanged', player.stats);

    const buff = ALTAR_BUFFS[Math.floor(Math.random() * ALTAR_BUFFS.length)];
    if (buff.stat === 'heal') {
      player.stats.hp = player.stats.maxHp ?? 100;
      player.eventBus?.emit('statsChanged', player.stats);
    } else {
      this._bus.emit('shrineBlessing', { buff });
    }
    this._bus.emit('hudLog', { msg: `⚶ The altar accepts your gold. Granted: ${buff.name}.`, color:'#dd44aa' });
    this._bus.emit('levelUp', player.stats.level); // visual flash
  }

  _interactShipwreck(poi) {
    poi.used = true;
    poi.labelEl.style.display = 'none';
    const seaLoot = ['gold','gem','crystal','void_essence','amulet_soul','feather',
                     'dragonhide','soulstone','runeshield','scroll'];
    const count = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const item = seaLoot[Math.floor(Math.random() * seaLoot.length)];
      this._bus.emit('spawnLoot', {
        x: tw(poi.tx) + (Math.random()-0.5)*2, y:0.3,
        z: tw(poi.tz) + (Math.random()-0.5)*2, itemKey: item,
      });
    }
    const scroll = LORE.scrolls?.[Math.floor(Math.random() * (LORE.scrolls?.length ?? 1))];
    if (scroll) this._bus.emit('scrollPickedUp', { scroll });
    this._bus.emit('hudLog', { msg: `⚓ You salvage the wreck. Found ${count} items and a waterlogged journal.`, color:'#6688aa' });
    this._bus.emit('achievement', { name:'Wreck Diver', desc:'Salvaged a shipwreck.' });
  }

  _interactAbandonedCamp(poi) {
    poi.used = true;
    poi.labelEl.style.display = 'none';
    // Trigger enemy ambush
    this._bus.emit('poiAmbush', { x: tw(poi.tx), z: tw(poi.tz), count: 3 + Math.floor(Math.random() * 3) });
    // Drop loot regardless
    const loot = ['gold','hide','bones', Math.random() > 0.5 ? 'potion' : 'antidote'];
    loot.forEach(itemKey => {
      this._bus.emit('spawnLoot', { x: tw(poi.tx) + (Math.random()-0.5)*1.5, y:0.3, z: tw(poi.tz) + (Math.random()-0.5)*1.5, itemKey });
    });
    this._bus.emit('hudLog', { msg: '⛺ Bandits spring from hiding! Watch out.', color:'#886644' });
  }

  _interactPortalStone(poi) {
    if (!poi._activated) {
      poi._activated = true;
      this._bus.emit('portalStoneActivated', { tx: poi.tx, tz: poi.tz });
      this._bus.emit('xpGain', { amount: 300, reason: 'Portal Stone activated' });
      this._bus.emit('mapReveal', { tx: poi.tx, tz: poi.tz, radius: 80 });
      this._bus.emit('hudLog', { msg: '◉ Portal Stone activated. Fast travel network updated.', color:'#44ffcc' });
      // Light up the disc
      if (poi.mesh._portalLight) poi.mesh._portalLight.intensity = 2.0;
    } else {
      // Open fast-travel menu
      this._bus.emit('portalStoneOpen', {
        tx: poi.tx, tz: poi.tz,
        activated: this._pois.filter(p => p.typeKey === 'PORTAL_STONE' && p._activated),
      });
      this._bus.emit('hudLog', { msg: '◉ Fast travel: select a destination.', color:'#44ffcc' });
    }
  }

  _getCurrentRegion() {
    // Rough region detection for standing stone codex unlock
    if (!this._player) return 'HEARTHMOOR';
    const tx = Math.floor(this._player.position.x / TS);
    const tz = Math.floor(this._player.position.z / TS);
    const cx = Math.floor(CONFIG.MAP_WIDTH / 2), cz = Math.floor(CONFIG.MAP_HEIGHT / 2);
    const dx = tx - cx, dz = tz - cz;
    if (Math.hypot(dx, dz) < 44) return 'HEARTHMOOR';
    if (dx < 0 && dz < 0) return 'ELANDOR';
    if (dx > 0 && dz > 0) return 'WHISPERING';
    if (dx > 0 && dz < 0) return 'ASHVEIL';
    return 'SHATTERED';
  }

  // ── Update (label projection + cooldown) ──────────────────────────────────

  setPlayer(player) { this._player = player; }

  update(delta) {
    if (!this._player || !this._camera) return;
    const px = this._player.position.x;
    const pz = this._player.position.z;
    const cam = this._camera;
    const projVec = new THREE.Vector3();

    // Animate shrines + crystals
    const t = Date.now() * 0.001;
    for (const poi of this._pois) {
      // Cooldown tick
      if (poi.cooldown > 0) {
        poi.cooldown -= delta;
        if (poi.cooldown <= 0) poi.cooldown = 0;
      }

      // Shrine flame flicker
      if (poi.typeKey === 'SHRINE' && poi.mesh._shrineLight) {
        poi.mesh._shrineLight.intensity = 0.6 + 0.4 * Math.sin(t * 3.5 + poi.tx);
      }
      // Campfire flicker
      if (poi.typeKey === 'CAMPFIRE' && poi.mesh._fireLight) {
        poi.mesh._fireLight.intensity = 1.0 + 0.5 * Math.sin(t * 6.0 + poi.tz * 0.1);
      }
      // Altar pulse
      if (poi.typeKey === 'ANCIENT_ALTAR' && poi.mesh._altarLight) {
        poi.mesh._altarLight.intensity = 0.9 + 0.5 * Math.sin(t * 2.0 + poi.tx * 0.05);
      }
      // Portal stone spin / pulse
      if (poi.typeKey === 'PORTAL_STONE' && poi.mesh._portalLight) {
        poi.mesh._portalLight.intensity = (poi._activated ? 1.8 : 0.6) + 0.3 * Math.sin(t * 1.5 + poi.tz * 0.05);
      }

      // Label projection
      const dist = Math.hypot(px - (tw(poi.tx)), pz - (tw(poi.tz)));
      const show = dist < 6.0 * TS && (!poi.used || poi.def.respawn) && poi.cooldown === 0;
      poi.labelEl.style.display = show ? 'block' : 'none';
      if (!show) continue;

      projVec.set(tw(poi.tx), 1.5 * TS, tw(poi.tz));
      projVec.project(cam);
      if (projVec.z > 1) { poi.labelEl.style.display = 'none'; continue; }

      const sx = (projVec.x *  0.5 + 0.5) * window.innerWidth;
      const sy = (projVec.y * -0.5 + 0.5) * window.innerHeight;
      poi.labelEl.style.left = sx + 'px';
      poi.labelEl.style.top  = sy + 'px';

      // Show interact hint if very close
      const def = poi.def;
      poi.labelEl.textContent = dist < def.range
        ? `${def.icon} ${def.interactMsg}`
        : `${def.icon} ${def.label}`;
    }
  }

  // ── Serialization ──────────────────────────────────────────────────────────

  serialize() {
    return {
      used:      this._pois.filter(p => p.used).map(p => `${p.typeKey}_${p.tx}_${p.tz}`),
      cooldowns: this._pois.filter(p => p.cooldown > 0).map(p => ({ key:`${p.typeKey}_${p.tx}_${p.tz}`, cd: p.cooldown })),
    };
  }

  deserialize(d) {
    if (!d) return;
    const usedSet = new Set(d.used ?? []);
    const cdMap   = new Map((d.cooldowns ?? []).map(e => [e.key, e.cd]));
    for (const poi of this._pois) {
      const k = `${poi.typeKey}_${poi.tx}_${poi.tz}`;
      if (usedSet.has(k))   { poi.used = true; poi.labelEl.style.display = 'none'; }
      if (cdMap.has(k))     poi.cooldown = cdMap.get(k);
    }
  }

  dispose() {
    if (this._keyHandler) window.removeEventListener('keydown', this._keyHandler);
    for (const poi of this._pois) {
      this._scene.remove(poi.mesh);
      poi.labelEl?.remove();
    }
    this._pois = [];
  }
}
