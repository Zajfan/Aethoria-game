/**
 * DungeonScene3D.js
 * Procedural 3D dungeon scene for the Aethoria RPG.
 *
 * Replaces DungeonScene.js with a Three.js implementation.
 * Rooms are carved procedurally and represented as InstancedMesh geometry.
 * Bosses spawn in the deepest rooms; an exit portal sits at the far end.
 */

import { THREE }    from '../engine/Renderer.js';
import { CONFIG }   from '../config.js';
import { Enemy3D }  from '../entities/Enemy3D.js';
import { Boss3D }   from '../entities/Boss3D.js';
import { Player3D } from '../entities/Player3D.js';

// Dungeon dimensions (tiles)
const DW = 60;
const DH = 60;

// Tile constants
const FLOOR = 0;
const WALL  = 1;

// Geometry constants
const FLOOR_H = 0.18;
const WALL_H  = 1.8;
const CEIL_H  = 0.18;
const CEIL_Y  = WALL_H + 0.09;

// ── Procedural dungeon generator ───────────────────────────────────────────────

function generateDungeon(W, H) {
  const data  = Array.from({ length: H }, () => new Uint8Array(W).fill(WALL));
  const rooms = [];

  for (let attempt = 0; attempt < 18; attempt++) {
    const rw = 5 + Math.floor(Math.random() * 6);
    const rh = 4 + Math.floor(Math.random() * 5);
    const rx = 1 + Math.floor(Math.random() * (W - rw - 2));
    const ry = 1 + Math.floor(Math.random() * (H - rh - 2));

    // Check overlap (with 1-tile gap)
    let overlaps = false;
    for (const r of rooms) {
      if (rx <= r.x2 + 1 && rx + rw >= r.x1 - 1 &&
          ry <= r.y2 + 1 && ry + rh >= r.y1 - 1) {
        overlaps = true;
        break;
      }
    }
    if (overlaps) continue;

    for (let y = ry; y < ry + rh; y++)
      for (let x = rx; x < rx + rw; x++)
        data[y][x] = FLOOR;

    rooms.push({ x1: rx, y1: ry, x2: rx + rw - 1, y2: ry + rh - 1,
                 cx: rx + (rw >> 1), cy: ry + (rh >> 1) });
  }

  // Connect rooms with L-shaped corridors
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1];
    const b = rooms[i];
    let x = a.cx, y = a.cy;
    // Horizontal segment
    while (x !== b.cx) {
      data[y][x] = FLOOR;
      x += x < b.cx ? 1 : -1;
    }
    // Vertical segment
    while (y !== b.cy) {
      data[y][x] = FLOOR;
      y += y < b.cy ? 1 : -1;
    }
    data[y][x] = FLOOR;
  }

  return { data, rooms };
}

// ── Dungeon mesh builder ───────────────────────────────────────────────────────

function buildDungeonMesh(scene3d, data, W, H) {
  const floorTiles = [];
  const wallTiles  = [];
  const ceilTiles  = [];

  for (let z = 0; z < H; z++) {
    for (let x = 0; x < W; x++) {
      if (data[z][x] === FLOOR) {
        floorTiles.push({ x, z });
        ceilTiles.push({ x, z });
      } else {
        wallTiles.push({ x, z });
      }
    }
  }

  const dummy = new THREE.Object3D();
  const meshes = [];

  // Floor InstancedMesh
  if (floorTiles.length) {
    const geo = new THREE.BoxGeometry(1, FLOOR_H, 1);
    const mat = new THREE.MeshLambertMaterial({ color: 0x2a2a35 });
    const im  = new THREE.InstancedMesh(geo, mat, floorTiles.length);
    im.receiveShadow = true;
    floorTiles.forEach(({ x, z }, i) => {
      dummy.position.set(x + 0.5, -FLOOR_H / 2, z + 0.5);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    scene3d.add(im);
    meshes.push(im);
  }

  // Wall InstancedMesh
  if (wallTiles.length) {
    const geo = new THREE.BoxGeometry(1, WALL_H, 1);
    const mat = new THREE.MeshLambertMaterial({ color: 0x181820 });
    const im  = new THREE.InstancedMesh(geo, mat, wallTiles.length);
    im.castShadow = im.receiveShadow = true;
    wallTiles.forEach(({ x, z }, i) => {
      dummy.position.set(x + 0.5, WALL_H / 2, z + 0.5);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    scene3d.add(im);
    meshes.push(im);
  }

  // Ceiling InstancedMesh (slightly darker)
  if (ceilTiles.length) {
    const geo = new THREE.BoxGeometry(1, CEIL_H, 1);
    const mat = new THREE.MeshLambertMaterial({ color: 0x161618 });
    const im  = new THREE.InstancedMesh(geo, mat, ceilTiles.length);
    im.receiveShadow = true;
    ceilTiles.forEach(({ x, z }, i) => {
      dummy.position.set(x + 0.5, CEIL_Y, z + 0.5);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    scene3d.add(im);
    meshes.push(im);
  }

  return meshes;
}

// ── Room lights ───────────────────────────────────────────────────────────────

function addRoomLights(scene3d, rooms) {
  const lights = [];
  const ROOM_COLORS = [0x8844ff, 0x4488ff, 0x44bbff, 0xff4488, 0xffaa22];
  rooms.forEach((room, i) => {
    const col   = ROOM_COLORS[i % ROOM_COLORS.length];
    const light = new THREE.PointLight(col, 1.4, 14);
    light.position.set(room.cx + 0.5, WALL_H * 0.6, room.cy + 0.5);
    light.castShadow = false; // performance: only if few lights
    scene3d.add(light);
    lights.push(light);
  });
  return lights;
}

// ── Tile utility ──────────────────────────────────────────────────────────────

function findFloorTile(data, W, H, prefX, prefZ) {
  let best = null, bestD = Infinity;
  for (let z = 0; z < H; z++) {
    for (let x = 0; x < W; x++) {
      if (data[z][x] !== FLOOR) continue;
      const d = Math.hypot(x - prefX, z - prefZ);
      if (d < bestD) { bestD = d; best = { x, z }; }
    }
  }
  return best || { x: 2, z: 2 };
}

// ── DungeonScene3D class ─────────────────────────────────────────────────────

export class DungeonScene3D {
  /**
   * @param {import('../engine/Renderer.js').Renderer}         renderer
   * @param {import('../engine/Camera.js').Camera}             camera
   * @param {import('../engine/InputManager.js').InputManager} inputManager
   * @param {import('../engine/EventBus.js').EventBus}         eventBus
   */
  constructor(renderer, camera, inputManager, eventBus) {
    this.renderer    = renderer;
    this.camera      = camera;
    this.input       = inputManager;
    this.eventBus    = eventBus;

    this.scene3d     = null;
    this.player      = null;
    this.enemies     = [];
    this.bosses      = [];
    this._meshes     = [];
    this._lights     = [];
    this._lootMeshes = [];
    this._floatTexts = [];

    this._exitPortal   = null;
    this._exitLight    = null;
    this._exitLabelEl  = null;
    this._exitPos      = null;
    this._exitUsed     = false;

    this._mapData  = null;
    this._rooms    = null;
    this._totalTime = 0;

    this._raycaster = new THREE.Raycaster();
    this._disposed  = false;

    this.hud = null; // set externally

    this._onCanvasClick = this._onCanvasClick.bind(this);
    this._overlay = () => document.getElementById('ui-overlay') || document.body;
  }

  // ── Initialization ──────────────────────────────────────────────────────────

  /**
   * @param {object|null} savedPlayerData  Player stats to restore on entry
   */
  async create(savedPlayerData = null) {
    // Three.js scene – very dark atmosphere
    this.scene3d = new THREE.Scene();
    this.scene3d.background = new THREE.Color(0x080810);
    this.scene3d.fog         = new THREE.FogExp2(0x080810, 0.045);

    // Very dim ambient
    const ambient = new THREE.AmbientLight(0x0a0a18, 0.5);
    this.scene3d.add(ambient);
    this._lights.push(ambient);

    // Generate dungeon
    const { data, rooms } = generateDungeon(DW, DH);
    this._mapData = data;
    this._rooms   = rooms;

    // Build geometry
    this._meshes = buildDungeonMesh(this.scene3d, data, DW, DH);

    // Room point lights
    const roomLights = addRoomLights(this.scene3d, rooms);
    this._lights.push(...roomLights);

    // Spawn player at entrance (first room or near top-left floor)
    const spawnTile = findFloorTile(data, DW, DH, 5, 5);
    this.player = new Player3D(
      this.scene3d, this._makeWorldAdapter(),
      this.camera.threeCamera, this.input, this.eventBus,
    );
    this.player.position.set(spawnTile.x + 0.5, 0, spawnTile.z + 0.5);
    this.player.group.position.copy(this.player.position);
    this.camera.snapTo(this.player.position);

    // Restore player state
    if (savedPlayerData) {
      Object.assign(this.player.stats, savedPlayerData.stats   || {});
      this.player.inventory   = { ...(savedPlayerData.inventory || {}) };
      this.player.equipment   = { ...(savedPlayerData.equipment || {}) };
      this.player.skills      = { ...(savedPlayerData.skills    || {}) };
      this.player.playerClass = savedPlayerData.playerClass || null;
    }
    if (!this.player.playerClass) {
      this.player.applyClass(localStorage.getItem('aethoria_class') || 'WARRIOR');
    }

    // Spawn 20 regular enemies spread across rooms
    this._spawnEnemies();

    // Spawn 3-5 bosses in far rooms
    this._spawnBosses();

    // Exit portal at last room
    this._buildExitPortal();

    // Events
    this._setupEvents();

    // Click handler
    this.renderer.canvas.addEventListener('click', this._onCanvasClick);

    // Show dungeon entry message
    setTimeout(() => {
      this.hud?.logMsg('You descend into darkness…', '#cc88ff');
      this.eventBus.emit('questProgress', { type: 'DUNGEON' });
    }, 400);
  }

  // ── World adapter for collision (player needs isBlocked) ──────────────────

  _makeWorldAdapter() {
    const data = () => this._mapData;
    return {
      isBlocked: (tx, tz) => {
        const d = data();
        if (!d) return false;
        if (tz < 0 || tz >= DH || tx < 0 || tx >= DW) return true;
        return d[tz][tx] === WALL;
      },
    };
  }

  // ── Enemy/boss spawning ───────────────────────────────────────────────────

  _spawnEnemies() {
    const types   = Object.keys(CONFIG.ENEMY_TYPES);
    const floorTs = [];
    for (let z = 1; z < DH - 1; z++)
      for (let x = 1; x < DW - 1; x++)
        if (this._mapData[z][x] === FLOOR) floorTs.push({ x, z });

    for (let i = 0; i < 20 && floorTs.length; i++) {
      const idx  = Math.floor(Math.random() * floorTs.length);
      const tile = floorTs.splice(idx, 1)[0];
      const type = types[i % types.length];
      const e    = new Enemy3D(
        this.scene3d, tile.x + 0.5, tile.z + 0.5,
        type, this.eventBus, this._makeWorldAdapter(),
      );
      e.setCamera(this.camera.threeCamera);
      this.enemies.push(e);
    }
  }

  _spawnBosses() {
    const bossKeys  = Object.keys(CONFIG.BOSS_TYPES);
    const bossCount = 3 + Math.floor(Math.random() * 3); // 3-5
    // Use rooms near the far corner
    const farRooms  = [...this._rooms].sort(
      (a, b) => (b.cx + b.cy) - (a.cx + a.cy),
    ).slice(0, bossCount);

    farRooms.forEach((room, i) => {
      const key = bossKeys[i % bossKeys.length];
      const b   = new Boss3D(
        this.scene3d, room.cx + 0.5, room.cy + 0.5,
        key, this.eventBus, this._makeWorldAdapter(),
      );
      b.setCamera(this.camera.threeCamera);
      this.bosses.push(b);
    });
  }

  // ── Exit portal ───────────────────────────────────────────────────────────

  _buildExitPortal() {
    const exitTile = findFloorTile(this._mapData, DW, DH, DW - 6, DH - 6);
    const px = exitTile.x + 0.5;
    const pz = exitTile.z + 0.5;

    const geo = new THREE.TorusGeometry(1.0, 0.12, 8, 32);
    const mat = new THREE.MeshLambertMaterial({
      color:    0x4444ff,
      emissive: new THREE.Color(0x001133),
    });
    this._exitPortal = new THREE.Mesh(geo, mat);
    this._exitPortal.position.set(px, 1.0, pz);
    this._exitPortal.rotation.x = Math.PI / 2;
    this.scene3d.add(this._exitPortal);

    this._exitLight = new THREE.PointLight(0x4444ff, 2.0, 8);
    this._exitLight.position.set(px, 1.3, pz);
    this.scene3d.add(this._exitLight);

    this._exitLabelEl = document.createElement('div');
    Object.assign(this._exitLabelEl.style, {
      position:      'absolute',
      pointerEvents: 'none',
      fontFamily:    "'Courier New', monospace",
      fontSize:      '11px',
      color:         '#aaaaff',
      textShadow:    '0 0 6px #4444ff',
      transform:     'translate(-50%,-100%)',
      whiteSpace:    'nowrap',
    });
    this._exitLabelEl.textContent = '[ EXIT ]';
    this._overlay().appendChild(this._exitLabelEl);

    this._exitPos = new THREE.Vector3(px, 0, pz);
  }

  // ── Event wiring ─────────────────────────────────────────────────────────

  _setupEvents() {
    const bus = this.eventBus;

    bus.on('spawnLoot', data => this._spawnLoot(data));

    bus.on('damage', (x, y, amount, color) => {
      const wp = new THREE.Vector3(
        typeof x === 'number' ? x : 0,
        typeof y === 'number' ? y + 1.5 : 1.5,
        0,
      );
      this._showFloatingText3D(wp, String(amount), color || '#ffffff');
    });

    bus.on('levelUp', lv => {
      this.hud?.logMsg('★ Level Up! Level ' + lv, '#ffd700');
    });

    bus.on('bossKilled', name => {
      this.hud?.logMsg('★ ' + name + ' DEFEATED! ★', '#dd88ff');
      this.hud?.logMsg('Now find the exit!', '#aaaaff');
    });

    bus.on('bossPhase', msg => {
      this.hud?.logMsg(msg, '#ff44ff');
    });

    bus.on('playerDead', () => {
      this.hud?.logMsg('You have fallen in the dungeon…', '#ff4444');
      setTimeout(() => this._exitDungeon(), 1600);
    });
  }

  // ── Loot ─────────────────────────────────────────────────────────────────

  _spawnLoot({ x, y, z, itemKey }) {
    const geo = new THREE.OctahedronGeometry(0.16, 0);
    const mat = new THREE.MeshLambertMaterial({
      color:    0xffd700,
      emissive: new THREE.Color(0x221100),
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.35, z);
    mesh.userData.isLoot  = true;
    mesh.userData.itemKey = itemKey;
    this.scene3d.add(mesh);

    const labelEl = document.createElement('div');
    Object.assign(labelEl.style, {
      position:      'absolute',
      pointerEvents: 'none',
      fontFamily:    "'Courier New', monospace",
      fontSize:      '9px',
      color:         '#ffdd88',
      textShadow:    '0 0 4px #000',
      transform:     'translate(-50%,-100%)',
      whiteSpace:    'nowrap',
    });
    labelEl.textContent = CONFIG.ITEMS[itemKey]?.name || itemKey;
    this._overlay().appendChild(labelEl);

    this._lootMeshes.push({ mesh, itemKey, labelEl });
  }

  _updateLootLabels() {
    const cam = this.camera.threeCamera;
    this._lootMeshes.forEach(l => {
      l.mesh.rotation.y += 0.03;
      const wp = l.mesh.position.clone();
      wp.y += 0.4;
      wp.project(cam);
      if (wp.z > 1) { l.labelEl.style.display = 'none'; return; }
      l.labelEl.style.display = 'block';
      l.labelEl.style.left    = ((wp.x *  0.5 + 0.5) * window.innerWidth)  + 'px';
      l.labelEl.style.top     = ((wp.y * -0.5 + 0.5) * window.innerHeight) + 'px';
    });
  }

  // ── Click handling ────────────────────────────────────────────────────────

  _onCanvasClick(e) {
    if (e.button !== 0) return;
    if (this.hud?.anyPanelOpen()) return;

    const rect = this.renderer.canvas.getBoundingClientRect();
    const ndcX =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    const ndcY = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    this._raycaster.setFromCamera({ x: ndcX, y: ndcY }, this.camera.threeCamera);

    const allEntities = [...this.enemies, ...this.bosses].filter(e => !e.isDead);
    const entityMeshes = [];
    allEntities.forEach(en => en.group.traverse(m => { if (m.isMesh) entityMeshes.push(m); }));
    const lootMeshes = this._lootMeshes.map(l => l.mesh);

    const hits = this._raycaster.intersectObjects([...entityMeshes, ...lootMeshes], false);
    if (!hits.length) return;

    const hitMesh = hits[0].object;

    // Enemy / boss?
    for (const en of allEntities) {
      let found = false;
      en.group.traverse(m => { if (m === hitMesh) found = true; });
      if (found) { this.player.setTarget(en); return; }
    }

    // Loot?
    const lootHit = this._lootMeshes.find(l => l.mesh === hitMesh);
    if (lootHit) {
      if (this.player.position.distanceTo(lootHit.mesh.position) <= 70) {
        this.player.addItem(lootHit.itemKey);
        this.eventBus.emit(
          'damage',
          lootHit.mesh.position.x, lootHit.mesh.position.y,
          '+' + (CONFIG.ITEMS[lootHit.itemKey]?.name || lootHit.itemKey), '#88ff88',
        );
        this.scene3d.remove(lootHit.mesh);
        lootHit.mesh.geometry.dispose();
        lootHit.mesh.material.dispose();
        lootHit.labelEl?.parentNode?.removeChild(lootHit.labelEl);
        this._lootMeshes = this._lootMeshes.filter(l => l !== lootHit);
      }
    }
  }

  // ── Floating text ─────────────────────────────────────────────────────────

  _showFloatingText3D(worldPos3, text, color) {
    const wp = worldPos3.clone().project(this.camera.threeCamera);
    if (wp.z > 1) return;
    const sx = (wp.x *  0.5 + 0.5) * window.innerWidth;
    const sy = (wp.y * -0.5 + 0.5) * window.innerHeight;

    const el = document.createElement('div');
    Object.assign(el.style, {
      position:      'absolute',
      left:          sx + 'px',
      top:           sy + 'px',
      transform:     'translate(-50%,-50%)',
      fontFamily:    "'Courier New', monospace",
      fontSize:      '14px',
      fontWeight:    'bold',
      color:         color || '#ffffff',
      textShadow:    '1px 1px 3px #000',
      pointerEvents: 'none',
      zIndex:        '200',
    });
    el.textContent = String(text);
    this._overlay().appendChild(el);
    this._floatTexts.push({ el, startY: sy, age: 0, maxAge: 1.0 });
  }

  _updateFloatingTexts(delta) {
    for (let i = this._floatTexts.length - 1; i >= 0; i--) {
      const ft = this._floatTexts[i];
      ft.age += delta;
      const t = ft.age / ft.maxAge;
      ft.el.style.top     = (ft.startY - 50 * t) + 'px';
      ft.el.style.opacity = String(Math.max(0, 1 - t * 1.5));
      if (ft.age >= ft.maxAge) {
        ft.el.parentNode?.removeChild(ft.el);
        this._floatTexts.splice(i, 1);
      }
    }
  }

  // ── Portal ────────────────────────────────────────────────────────────────

  _updateExitPortal(delta) {
    if (!this._exitPortal) return;
    this._exitPortal.rotation.z += delta * 1.1;
    if (this._exitLight) {
      this._exitLight.intensity = 1.8 + Math.sin(this._totalTime * 2.8) * 0.5;
    }

    // DOM label position
    if (this._exitLabelEl && this._exitPos) {
      const wp = new THREE.Vector3(this._exitPos.x, 2.6, this._exitPos.z);
      wp.project(this.camera.threeCamera);
      if (wp.z > 1) { this._exitLabelEl.style.display = 'none'; return; }
      this._exitLabelEl.style.display = 'block';
      this._exitLabelEl.style.left    = ((wp.x *  0.5 + 0.5) * window.innerWidth)  + 'px';
      this._exitLabelEl.style.top     = ((wp.y * -0.5 + 0.5) * window.innerHeight) + 'px';
    }

    // Exit collision
    if (!this._exitUsed && this._exitPos) {
      if (this.player.position.distanceTo(this._exitPos) < 1.8) this._exitDungeon();
    }
  }

  _exitDungeon() {
    if (this._exitUsed) return;
    this._exitUsed = true;
    this.hud?.logMsg('Emerging from the dungeon…', '#aaaaff');
    this.eventBus.emit('exitDungeon', {
      savedPlayer: {
        stats:       { ...this.player.stats },
        inventory:   { ...this.player.inventory },
        equipment:   { ...this.player.equipment },
        skills:      { ...(this.player.skills || {}) },
        playerClass: this.player.playerClass,
        _fromDungeon: true,
      },
    });
  }

  // ── Main update ───────────────────────────────────────────────────────────

  /** @param {number} delta seconds */
  update(delta) {
    if (this._disposed || !this.player) return;
    this._totalTime += delta;

    this.player.camera = this.camera.threeCamera;
    this.player.update(delta);

    this.camera.follow(this.player.position);
    this.camera.update(delta, this.input);

    // Enemies
    this.enemies.forEach(e => {
      e.setCamera(this.camera.threeCamera);
      e.update(delta, this.player);
    });
    this.bosses.forEach(b => {
      b.setCamera(this.camera.threeCamera);
      b.update(delta, this.player);
    });

    this._updateLootLabels();
    this._updateFloatingTexts(delta);
    this._updateExitPortal(delta);

    this.hud?.update?.(this);

    this.renderer.render(this.scene3d, this.camera.threeCamera);
    this.input.update();
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  dispose() {
    if (this._disposed) return;
    this._disposed = true;

    this.renderer.canvas.removeEventListener('click', this._onCanvasClick);

    this.player?.dispose();
    this.enemies.forEach(e => e.dispose?.());
    this.bosses.forEach(b => b.dispose?.());
    this.enemies = [];
    this.bosses  = [];

    this._meshes.forEach(m => {
      this.scene3d.remove(m);
      if (m.isInstancedMesh) m.dispose();
      else { m.geometry?.dispose(); m.material?.dispose(); }
    });
    this._meshes = [];

    this._lights.forEach(l => {
      this.scene3d.remove(l);
      l.dispose?.();
    });
    this._lights = [];

    this._lootMeshes.forEach(l => {
      this.scene3d.remove(l.mesh);
      l.mesh.geometry.dispose();
      l.mesh.material.dispose();
      l.labelEl?.parentNode?.removeChild(l.labelEl);
    });
    this._lootMeshes = [];

    this._floatTexts.forEach(ft => ft.el.parentNode?.removeChild(ft.el));
    this._floatTexts = [];

    if (this._exitPortal) {
      this.scene3d.remove(this._exitPortal);
      this._exitPortal.geometry.dispose();
      this._exitPortal.material.dispose();
    }
    if (this._exitLight) {
      this.scene3d.remove(this._exitLight);
      this._exitLight.dispose();
    }
    this._exitLabelEl?.parentNode?.removeChild(this._exitLabelEl);
  }
}
