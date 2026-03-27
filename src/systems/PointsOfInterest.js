/**
 * PointsOfInterest.js — Aethoria v0.6
 *
 * Scatters interactive exploration content across the 256×256 world:
 *
 *  RUIN        — collapsed stone structure, has a loot chest inside
 *  SHRINE      — ancient altar, grants a buff when interacted with
 *  GRAVE       — fallen warrior's grave, drops rare loot + codex entry
 *  CAMP        — abandoned bandit camp, always has enemies + chest
 *  CRYSTAL_NODE— Void crystal formation, harvest for materials
 *  STANDING_STONE — ancient monolith, reveals map area + lore
 *  WELL        — healing well, restores HP when used (cooldown)
 *  MERCHANT_CART — stranded merchant, random rare stock (limited)
 *
 * POIs are placed deterministically by seed so the world always looks
 * the same. They persist which ones have been discovered/looted.
 */

import { THREE } from '../engine/Renderer.js';
import { CONFIG } from '../config.js';
import { LORE   } from './LoreDatabase.js';

// ── POI type definitions ──────────────────────────────────────────────────────

export const POI_TYPES = {
  RUIN: {
    label:      'Ancient Ruin',
    icon:       '🏚',
    color:      '#aa9977',
    interactMsg:'E to search the ruin',
    range:      2.5,
    respawn:    false,
  },
  SHRINE: {
    label:      'Old Shrine',
    icon:       '✦',
    color:      '#ffdd44',
    interactMsg:'E to pray at the shrine',
    range:      2.0,
    respawn:    true,
    respawnSec: 300,
  },
  GRAVE: {
    label:      "Warrior's Grave",
    icon:       '†',
    color:      '#888888',
    interactMsg:'E to pay respects',
    range:      2.0,
    respawn:    false,
  },
  CRYSTAL_NODE: {
    label:      'Void Crystal Node',
    icon:       '◈',
    color:      '#cc44ff',
    interactMsg:'E to harvest crystals',
    range:      1.8,
    respawn:    true,
    respawnSec: 180,
  },
  STANDING_STONE: {
    label:      'Standing Stone',
    icon:       '▲',
    color:      '#4488ff',
    interactMsg:'E to read the inscription',
    range:      2.0,
    respawn:    false,
  },
  HEALING_WELL: {
    label:      'Ancient Well',
    icon:       '◎',
    color:      '#44ccaa',
    interactMsg:'E to drink from the well',
    range:      2.0,
    respawn:    true,
    respawnSec: 120,
  },
  MERCHANT_CART: {
    label:      'Stranded Merchant',
    icon:       '🛒',
    color:      '#ffaa44',
    interactMsg:'E to trade',
    range:      3.0,
    respawn:    false,
  },
};

// ── Buff definitions from shrines ────────────────────────────────────────────

const SHRINE_BUFFS = [
  { id:'atk_boost',  name:'+8 Attack',     stat:'attack',   amount:8,  dur:180 },
  { id:'def_boost',  name:'+8 Defense',    stat:'defense',  amount:8,  dur:180 },
  { id:'spd_boost',  name:'+20% Speed',    stat:'speedMult',amount:0.2,dur:120 },
  { id:'hp_regen',   name:'HP Regen',      stat:'hpRegen',  amount:3,  dur:240 },
  { id:'xp_boost',   name:'+30% XP',       stat:'xpMult',   amount:0.3,dur:300 },
];

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
    const seed = CONFIG.WORLD_SEED;
    const cx = Math.floor(W / 2);
    const cz = Math.floor(H / 2);

    // POI placement blueprint — (type, tx, tz) offsets from centre
    const blueprint = [
      // Near town (within 30 tiles)
      { type:'HEALING_WELL',   ox:-15, oz:-18 },
      { type:'SHRINE',          ox: 22, oz: 10 },
      { type:'STANDING_STONE',  ox:-20, oz: 15 },
      { type:'RUIN',            ox: 28, oz:-20 },
      { type:'GRAVE',           ox:-10, oz: 28 },
      // Elandor plains (30-80 tiles NW)
      { type:'RUIN',            ox:-38, oz:-35 },
      { type:'SHRINE',          ox:-55, oz:-20 },
      { type:'MERCHANT_CART',   ox:-42, oz:-48 },
      { type:'CRYSTAL_NODE',    ox:-60, oz:-55 },
      { type:'STANDING_STONE',  ox:-25, oz:-60 },
      { type:'RUIN',            ox:-70, oz:-30 },
      { type:'GRAVE',           ox:-45, oz:-65 },
      // Whispering marshes (30-70 tiles SE)
      { type:'CRYSTAL_NODE',    ox: 40, oz: 45 },
      { type:'SHRINE',          ox: 55, oz: 38 },
      { type:'RUIN',            ox: 38, oz: 60 },
      { type:'STANDING_STONE',  ox: 65, oz: 55 },
      { type:'HEALING_WELL',    ox: 48, oz: 70 },
      { type:'GRAVE',           ox: 72, oz: 42 },
      // Ashveil peaks (far NE)
      { type:'RUIN',            ox: 60, oz:-45 },
      { type:'CRYSTAL_NODE',    ox: 72, oz:-60 },
      { type:'SHRINE',          ox: 80, oz:-38 },
      { type:'STANDING_STONE',  ox: 55, oz:-70 },
      { type:'GRAVE',           ox: 88, oz:-52 },
      // Shattered coast (far SW)
      { type:'RUIN',            ox:-48, oz: 55 },
      { type:'SHRINE',          ox:-62, oz: 65 },
      { type:'MERCHANT_CART',   ox:-55, oz: 72 },
      { type:'CRYSTAL_NODE',    ox:-70, oz: 60 },
      { type:'STANDING_STONE',  ox:-38, oz: 78 },
    ];

    const FLAT_TILES = new Set([
      CONFIG.TILES.GRASS, CONFIG.TILES.SAND,
      CONFIG.TILES.FOREST, CONFIG.TILES.PATH,
    ]);

    for (const bp of blueprint) {
      const tx = Math.max(4, Math.min(W-4, cx + bp.ox));
      const tz = Math.max(4, Math.min(H-4, cz + bp.oz));

      // Find nearest walkable tile
      let bestTx = tx, bestTz = tz, found = false;
      outer:
      for (let r = 0; r <= 5; r++) {
        for (let dz = -r; dz <= r; dz++) {
          for (let dx = -r; dx <= r; dx++) {
            if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
            const nx = tx + dx, nz = tz + dz;
            if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
            if (FLAT_TILES.has(mapData[nz]?.[nx])) {
              bestTx = nx; bestTz = nz; found = true;
              break outer;
            }
          }
        }
      }
      if (!found) continue;

      this._spawnPOI(bp.type, bestTx, bestTz);
    }

    // E key interaction
    this._setupKeyHandler();
  }

  _spawnPOI(typeKey, tx, tz) {
    const def  = POI_TYPES[typeKey];
    if (!def) return;

    let mesh;
    switch (typeKey) {
      case 'RUIN':           mesh = buildRuinMesh();         break;
      case 'SHRINE':         mesh = buildShrineMesh();       break;
      case 'CRYSTAL_NODE':   mesh = buildCrystalNodeMesh();  break;
      case 'STANDING_STONE': mesh = buildStandingStoneMesh();break;
      case 'HEALING_WELL':   mesh = buildWellMesh();         break;
      case 'MERCHANT_CART':  mesh = buildMerchantCartMesh(); break;
      default: mesh = buildRuinMesh();
    }

    mesh.position.set(tx + 0.5, 0, tz + 0.5);
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
      const dist = Math.hypot(px - (poi.tx + 0.5), pz - (poi.tz + 0.5));
      if (dist < poi.def.range) return poi;
    }
    return null;
  }

  _interact(poi) {
    const player = this._player;
    if (!player) return;

    switch (poi.typeKey) {
      case 'RUIN':
        this._interactRuin(poi); break;
      case 'SHRINE':
        this._interactShrine(poi); break;
      case 'GRAVE':
        this._interactGrave(poi); break;
      case 'CRYSTAL_NODE':
        this._interactCrystal(poi); break;
      case 'STANDING_STONE':
        this._interactStone(poi); break;
      case 'HEALING_WELL':
        this._interactWell(poi); break;
      case 'MERCHANT_CART':
        this._interactMerchant(poi); break;
    }
  }

  _interactRuin(poi) {
    poi.used = true;
    poi.labelEl.style.display = 'none';
    // Drop loot
    const loot = ['gold', Math.random() > 0.5 ? 'gem' : 'crystal', Math.random() > 0.6 ? 'scroll' : 'potion'];
    loot.forEach(itemKey => {
      this._bus.emit('spawnLoot', {
        x: poi.tx + 0.5 + (Math.random()-0.5)*1.5, y: 0.3,
        z: poi.tz + 0.5 + (Math.random()-0.5)*1.5, itemKey,
      });
    });
    this._bus.emit('chestOpened', { x: poi.tx + 0.5, z: poi.tz + 0.5 });
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
    this._bus.emit('spawnLoot', { x: poi.tx + 0.5, y: 0.3, z: poi.tz + 0.5, itemKey:'scroll' });
    this._bus.emit('scrollPickedUp', { scroll });
    this._bus.emit('hudLog', { msg: "† You found something left at the grave.", color:'#888888' });
  }

  _interactCrystal(poi) {
    poi.cooldown = poi.def.respawnSec;
    const qty = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < qty; i++) {
      this._bus.emit('spawnLoot', {
        x: poi.tx + 0.5 + (Math.random()-0.5)*1.0, y: 0.3,
        z: poi.tz + 0.5 + (Math.random()-0.5)*1.0, itemKey:'crystal',
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
    this._bus.emit('healBurst', { x: poi.tx + 0.5, z: poi.tz + 0.5 });
  }

  _interactMerchant(poi) {
    // Open a temporary shop via HUD event
    this._bus.emit('merchantCartOpen', {
      stock: poi.stock,
      tx: poi.tx, tz: poi.tz,
    });
    this._bus.emit('hudLog', { msg: '🛒 A stranded merchant offers rare wares.', color:'#ffaa44' });
  }

  _getCurrentRegion() {
    // Rough region detection for standing stone codex unlock
    if (!this._player) return 'HEARTHMOOR';
    const tx = Math.floor(this._player.position.x);
    const tz = Math.floor(this._player.position.z);
    const cx = 128, cz = 128;
    const dx = tx - cx, dz = tz - cz;
    if (Math.hypot(dx, dz) < 22) return 'HEARTHMOOR';
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

      // Label projection
      const dist = Math.hypot(px - (poi.tx + 0.5), pz - (poi.tz + 0.5));
      const show = dist < 6.0 && (!poi.used || poi.def.respawn) && poi.cooldown === 0;
      poi.labelEl.style.display = show ? 'block' : 'none';
      if (!show) continue;

      projVec.set(poi.tx + 0.5, 1.5, poi.tz + 0.5);
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
