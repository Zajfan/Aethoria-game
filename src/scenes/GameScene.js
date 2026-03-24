/**
 * GameScene.js
 * Main 3D game world scene for the Aethoria RPG.
 *
 * Orchestrates the Three.js scene, all entity systems, and game loop logic.
 * Pure ES-module – no Phaser dependency.
 */

import { THREE }             from '../engine/Renderer.js';
import { CONFIG }            from '../config.js';
import { WorldGen }          from '../systems/WorldGen.js';
import { World3D }           from '../world/World3D.js';
import { Player3D }          from '../entities/Player3D.js';
import { Enemy3D }           from '../entities/Enemy3D.js';
import { Boss3D }            from '../entities/Boss3D.js';
import { NPC3D }             from '../entities/NPC3D.js';
import { QuestSystem }       from '../systems/QuestSystem.js';
import { SaveSystem }        from '../systems/SaveSystem.js';
import { AudioSystem }       from '../systems/AudioSystem.js';
import { TradeSystem }       from '../systems/TradeSystem.js';
import { AchievementSystem } from '../systems/AchievementSystem.js';
import { StorySystem }       from '../systems/StorySystem.js';
import { AIMemory }          from '../systems/AIMemory.js';

// Map dimensions (override config for 3D world)
const MAP_W = 256;
const MAP_H = 256;

// ── Phaser-compat proxy (used by legacy systems that call scene.events / scene.time) ─

class SceneProxy {
  constructor(eventBus) {
    this._bus    = eventBus;
    this._timers = [];

    this.player      = null;
    this.enemies     = [];
    this.tradeSystem = null;
    this.dayNight    = null;

    // Mirrors Phaser's scene.events API
    this.events = {
      emit: (ev, ...args) => eventBus.emit(ev, ...args),
      on:   (ev, cb)      => { eventBus.on(ev, cb);  return this.events; },
      off:  (ev, cb)      => { eventBus.off(ev, cb); return this.events; },
    };

    // Mirrors Phaser's scene.time API
    this.time = {
      addEvent: ({ delay, loop, callback }) => {
        const id = loop ? setInterval(callback, delay) : setTimeout(callback, delay);
        const handle = { remove: () => loop ? clearInterval(id) : clearTimeout(id) };
        this._timers.push(handle);
        return handle;
      },
      delayedCall: (delay, cb) => {
        const id = setTimeout(cb, delay);
        return { remove: () => clearTimeout(id) };
      },
    };
  }

  dispose() {
    this._timers.forEach(h => h.remove());
    this._timers = [];
  }
}

// ── 3D Day/Night cycle (replaces Phaser-based DayNight.js) ────────────────────

class DayNight3D {
  constructor(eventBus, scene3d) {
    this._bus       = eventBus;
    this._scene3d   = scene3d;
    this._world3d   = null;
    this.elapsed    = 0;
    this.cycleSecs  = CONFIG.DAY_CYCLE_SECONDS;
    this.weather    = 'CLEAR';
    this._wTimer    = 0;
    this._pickWeather();
  }

  setWorld3D(world3d) { this._world3d = world3d; }

  /** @param {number} delta seconds */
  update(delta) {
    this.elapsed = (this.elapsed + delta) % this.cycleSecs;
    const t     = this.elapsed / this.cycleSecs;           // 0..1
    const phase = t * Math.PI * 2;
    const sunY  = Math.sin(phase - Math.PI / 2);           // -1 midnight, +1 noon
    const day   = Math.max(0, sunY);                       // 0..1

    if (this._world3d) this._world3d.setTimeOfDay(t);

    // Sky background colour
    const night = new THREE.Color(0x0a0a1a);
    const dawn  = new THREE.Color(0x1a0f22);
    const noon  = new THREE.Color(0x090f20);
    let skyCol;
    if (day < 0.3) {
      skyCol = night.clone().lerp(dawn, day / 0.3);
    } else {
      skyCol = dawn.clone().lerp(noon, (day - 0.3) / 0.7);
    }
    this._scene3d.background = skyCol;

    // Fog density
    let density = 0.008 + (1 - day) * 0.006;
    if (this.weather === 'FOG')   density = 0.038;
    if (this.weather === 'STORM') density = 0.025;
    if (this._scene3d.fog) {
      this._scene3d.fog.density = density;
      this._scene3d.fog.color.copy(skyCol);
    }

    // Weather timer
    this._wTimer -= delta;
    if (this._wTimer <= 0) this._pickWeather();
  }

  _pickWeather() {
    const prev    = this.weather;
    this.weather  = CONFIG.WEATHER_TYPES[Math.floor(Math.random() * CONFIG.WEATHER_TYPES.length)];
    this._wTimer  = 45 + Math.random() * 75;
    if (this.weather !== prev) this._bus.emit('weatherChanged', this.weather);
  }

  isNight() {
    const hour = (this.elapsed / this.cycleSecs) * 24;
    return hour < 6 || hour > 20;
  }

  getTimeString() {
    const t    = this.elapsed / this.cycleSecs;
    const hour = Math.floor(t * 24);
    const min  = Math.floor((t * 24 - hour) * 60);
    const h12  = ((hour % 12) || 12);
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${h12}:${String(min).padStart(2, '0')} ${ampm}`;
  }

  getCurrentWeather() { return this.weather; }
}

// ── 3D World Events (replaces Phaser-based WorldEvents.js) ───────────────────

const EVENTS_3D = [
  { id:'goblin_raid',   name:'Goblin Raid',       color:0xff4422,
    desc:'Goblins are raiding Hearthmoor! Defend the village!', duration:70, effect:'spawn_burst' },
  { id:'merchant_fair', name:'Merchant Festival', color:0xffd700,
    desc:'A grand festival! Merchants offer rare goods at reduced prices.', duration:90, effect:'price_down' },
  { id:'dark_eclipse',  name:'Dark Eclipse',       color:0x330055,
    desc:'The sun dims — the undead grow bold in the darkness.', duration:50, effect:'darken' },
  { id:'plague',        name:'The Grey Plague',    color:0x44aa44,
    desc:'A mysterious sickness spreads through the land.', duration:75, effect:'hp_drain' },
  { id:'crystal_storm', name:'Crystal Storm',      color:0x44ccff,
    desc:'Arcane crystals rain from the sky — riches await the bold!', duration:55, effect:'loot_burst' },
  { id:'void_rift',     name:'Void Rift',          color:0x8800ee,
    desc:'A tear in reality opens near the dungeon.', duration:45, effect:'boss_buff' },
];

class WorldEvents3D {
  constructor(eventBus, scene3d, sceneProxy) {
    this._bus       = eventBus;
    this._scene3d   = scene3d;
    this._proxy     = sceneProxy;
    this.current    = null;
    this._countdown = 80 + Math.random() * 100;  // seconds until first event
    this._plagueTick = null;
    this._spawnFn   = null;  // set by GameScene
  }

  setSpawnFn(fn) { this._spawnFn = fn; }

  /** @param {number} delta seconds */
  update(delta) {
    this._countdown -= delta;
    if (this._countdown <= 0 && !this.current) {
      const ev     = EVENTS_3D[Math.floor(Math.random() * EVENTS_3D.length)];
      this.current = { ...ev, remaining: ev.duration };
      AIMemory.recordWorldEvent(ev.name);
      this._bus.emit('worldEvent', this.current);
      this._apply(ev, true);
      this._countdown = 80 + Math.random() * 100;
    }
    if (this.current) {
      this.current.remaining -= delta;
      if (this.current.remaining <= 0) {
        this._apply(this.current, false);
        this._bus.emit('worldEventEnd', this.current);
        this.current = null;
      }
    }
  }

  _apply(ev, start) {
    const player = this._proxy.player;
    switch (ev.effect) {
      case 'darken':
        if (this._scene3d.fog) this._scene3d.fog.density = start ? 0.045 : 0.015;
        break;

      case 'hp_drain':
        if (start) {
          this._plagueTick = setInterval(() => {
            if (player && !player.isDead && player.stats.hp > 5) player.takeDamage(5);
          }, 5000);
        } else {
          clearInterval(this._plagueTick);
          this._plagueTick = null;
        }
        break;

      case 'price_down':
        this._proxy.tradeSystem?.setPriceBoost(start ? 0.55 : 1.0);
        break;

      case 'boss_buff':
        this._proxy.enemies?.forEach(e => {
          if (!e.isDead) e.stats.atk = start
            ? Math.floor(e.stats.atk * 1.4)
            : Math.floor(e.stats.atk / 1.4);
        });
        break;

      case 'loot_burst':
        if (start && player) {
          const items = ['gold', 'gem', 'herb', 'potion'];
          for (let i = 0; i < 8; i++) {
            setTimeout(() => {
              const angle = Math.random() * Math.PI * 2;
              const dist  = 5 + Math.random() * 8;
              this._bus.emit('spawnLoot', {
                x: player.position.x + Math.cos(angle) * dist,
                y: 0,
                z: player.position.z + Math.sin(angle) * dist,
                itemKey: items[Math.floor(Math.random() * items.length)],
              });
            }, i * 250);
          }
        }
        break;

      case 'spawn_burst':
        if (start && player && this._spawnFn) {
          const types = ['GOBLIN', 'GOBLIN', 'WOLF', 'GOBLIN'];
          for (let i = 0; i < 5; i++) {
            setTimeout(() => {
              const angle = Math.random() * Math.PI * 2;
              const dist  = 10 + Math.random() * 5;
              this._spawnFn({
                x:    player.position.x + Math.cos(angle) * dist,
                z:    player.position.z + Math.sin(angle) * dist,
                type: types[i % types.length],
              });
            }, i * 450);
          }
        }
        break;
    }
  }

  getCurrent() { return this.current; }

  dispose() {
    clearInterval(this._plagueTick);
    this._plagueTick = null;
  }
}

// ── 3D Shard System (replaces Phaser-based ShardSystem.js) ───────────────────

const SHARD_COLORS_3D = [0xffd700, 0x44ff88, 0xcc44ff, 0x44ccff, 0xff4444];
const SHARD_POSITIONS = (cx, cy) => [
  { id: 1, tx: cx + 2,  tz: cy - 8,  label: 'Shard I'   },
  { id: 2, tx: cx + 18, tz: cy + 15, label: 'Shard II'  },
  { id: 3, tx: cx + 48, tz: cy - 12, label: 'Shard III' },
  { id: 4, tx: cx - 30, tz: cy - 20, label: 'Shard IV'  },
  { id: 5, tx: cx + 40, tz: cy + 30, label: 'Shard V'   },
];

class ShardSystem3D {
  constructor(eventBus, scene3d, threeCamera) {
    this._bus       = eventBus;
    this._scene3d   = scene3d;
    this._camera    = threeCamera;
    this._shards    = [];
    this._overlay   = document.getElementById('ui-overlay') || document.body;
  }

  setCamera(cam) { this._camera = cam; }

  spawnShards(mapData) {
    const mw = mapData[0].length;
    const mh = mapData.length;
    const cx = Math.floor(mw / 2);
    const cy = Math.floor(mh / 2);

    SHARD_POSITIONS(cx, cy).forEach(pos => {
      const tx    = Math.max(2, Math.min(mw - 3, pos.tx));
      const tz    = Math.max(2, Math.min(mh - 3, pos.tz));
      const color = SHARD_COLORS_3D[pos.id - 1];

      const geo  = new THREE.OctahedronGeometry(0.35, 0);
      const mat  = new THREE.MeshLambertMaterial({
        color,
        emissive: new THREE.Color(color).multiplyScalar(0.4),
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(tx + 0.5, 0.8, tz + 0.5);
      mesh.castShadow = true;
      mesh.userData.isShard  = true;
      mesh.userData.shardId  = pos.id;
      this._scene3d.add(mesh);

      const light = new THREE.PointLight(color, 1.2, 5);
      light.position.copy(mesh.position);
      this._scene3d.add(light);

      const labelEl = document.createElement('div');
      Object.assign(labelEl.style, {
        position:      'absolute',
        pointerEvents: 'none',
        fontFamily:    "'Courier New', monospace",
        fontSize:      '10px',
        color:         '#' + color.toString(16).padStart(6, '0'),
        textShadow:    '0 0 6px currentColor',
        transform:     'translate(-50%, -100%)',
        whiteSpace:    'nowrap',
      });
      labelEl.textContent = pos.label;
      this._overlay.appendChild(labelEl);

      this._shards.push({
        mesh, light, labelEl,
        id:          pos.id,
        floatPhase:  Math.random() * Math.PI * 2,
      });
    });
  }

  /** @param {number} delta seconds  @param {number} t total elapsed seconds */
  update(delta, t) {
    this._shards.forEach(sh => {
      sh.mesh.position.y = 0.8 + Math.sin(t * 1.5 + sh.floatPhase) * 0.22;
      sh.mesh.rotation.y += delta * 1.4;
      sh.light.intensity  = 1.0 + Math.sin(t * 3.0 + sh.floatPhase) * 0.4;
      sh.light.position.copy(sh.mesh.position);
      this._projectLabel(sh);
    });
  }

  _projectLabel(sh) {
    if (!sh.labelEl || !this._camera) return;
    const wp = sh.mesh.position.clone();
    wp.y += 0.65;
    wp.project(this._camera);
    if (wp.z > 1) { sh.labelEl.style.display = 'none'; return; }
    sh.labelEl.style.display = 'block';
    sh.labelEl.style.left    = ((wp.x *  0.5 + 0.5) * window.innerWidth)  + 'px';
    sh.labelEl.style.top     = ((wp.y * -0.5 + 0.5) * window.innerHeight) + 'px';
  }

  tryCollect(player, shardId) {
    const sh = this._shards.find(s => s.id === shardId);
    if (!sh) return;
    if (player.position.distanceTo(sh.mesh.position) > 3.5) {
      this._bus.emit('damage', sh.mesh.position.x, 0, 'Get closer!', '#ffaa44');
      return;
    }
    this._remove(sh);
    player.gainXP(500 * shardId);
    this._bus.emit('shardCollected', { id: shardId });
  }

  _remove(sh) {
    this._scene3d.remove(sh.mesh);
    this._scene3d.remove(sh.light);
    sh.mesh.geometry.dispose();
    sh.mesh.material.dispose();
    sh.light.dispose();
    sh.labelEl?.parentNode?.removeChild(sh.labelEl);
    this._shards = this._shards.filter(s => s !== sh);
  }

  getMeshes() { return this._shards.map(s => s.mesh); }

  restoreState(collectedIds) {
    collectedIds.forEach(id => {
      const sh = this._shards.find(s => s.id === id);
      if (sh) this._remove(sh);
    });
  }

  dispose() {
    [...this._shards].forEach(sh => this._remove(sh));
  }
}

// ── GameScene ──────────────────────────────────────────────────────────────────

export class GameScene {
  /**
   * @param {import('../engine/Renderer.js').Renderer}       renderer
   * @param {import('../engine/Camera.js').Camera}           camera
   * @param {import('../engine/InputManager.js').InputManager} inputManager
   * @param {import('../engine/EventBus.js').EventBus}       eventBus
   */
  constructor(renderer, camera, inputManager, eventBus) {
    this.renderer    = renderer;
    this.camera      = camera;
    this.input       = inputManager;
    this.eventBus    = eventBus;

    // Scene state
    this.scene3d     = null;
    this.world3d     = null;
    this.mapData     = null;
    this.player      = null;
    this.enemies     = [];
    this.npcs        = [];

    // Portal
    this._portalMesh    = null;
    this._portalLight   = null;
    this._portalLabelEl = null;
    this._portalPos     = null;
    this._portalUsed    = false;

    // Loot
    this._lootMeshes = [];   // [{ mesh, itemKey, labelEl }]

    // Floating damage numbers
    this._floatTexts = [];   // [{ el, startY, age, maxAge }]

    // Raycaster for click detection
    this._raycaster  = new THREE.Raycaster();

    // Timing
    this._totalTime  = 0;
    this._saveTimer  = 30;
    this._stepTimer  = 0;

    // Combat zoom
    this._baseZoom   = 20;
    this._targetZoom = 20;
    this._combatTimer = 0;

    // Systems (initialised in create)
    this.questSystem    = null;
    this.saveSystem     = null;
    this.dayNight       = null;
    this.audio          = null;
    this.tradeSystem    = null;
    this.worldEvents    = null;
    this.achievements   = null;
    this.storySystem    = null;
    this.shardSystem    = null;
    this._sceneProxy    = null;

    /** @type {import('../ui/HUD.js').HUD|null} */
    this.hud = null;

    this._disposed       = false;
    this._onCanvasClick  = this._onCanvasClick.bind(this);
    this._overlay        = () => document.getElementById('ui-overlay') || document.body;
  }

  // ── Initialization ──────────────────────────────────────────────────────────

  /**
   * Async initialisation — call once before the game loop starts.
   * @param {object|null} savedPlayerData
   */
  async create(savedPlayerData = null) {
    // 1. Three.js scene
    this.scene3d = new THREE.Scene();
    this.scene3d.background = new THREE.Color(0x0a0a1a);
    this.scene3d.fog         = new THREE.FogExp2(0x0a0a1a, 0.015);

    // 2. Generate map (256×256)
    const gen = new WorldGen();
    this.mapData = gen.generate(MAP_W, MAP_H);

    // 3. Build 3D world
    this.world3d = new World3D(this.scene3d);
    this.world3d.build(this.mapData);
    const cx = Math.floor(MAP_W / 2);
    const cz = Math.floor(MAP_H / 2);
    this.world3d.updateVisibleChunks(cx, cz);

    // 4. Scene proxy for Phaser-compat systems
    this._sceneProxy         = new SceneProxy(this.eventBus);
    this._sceneProxy.enemies = this.enemies;

    // 5. Player
    this.player = new Player3D(
      this.scene3d, this.world3d,
      this.camera.threeCamera, this.input, this.eventBus,
    );
    this.player.position.set(cx + 0.5, 0, cz + 0.5);
    this.player.group.position.copy(this.player.position);
    this.camera.snapTo(this.player.position);
    this._sceneProxy.player = this.player;

    // Restore or apply class
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

    // 6. Systems
    this.questSystem   = new QuestSystem(this._sceneProxy);
    this.saveSystem    = new SaveSystem();
    this.saveSystem.init().catch(() => {});

    this.dayNight = new DayNight3D(this.eventBus, this.scene3d);
    this.dayNight.setWorld3D(this.world3d);
    this._sceneProxy.dayNight = this.dayNight;

    this.audio = new AudioSystem();
    this.audio.init();

    this.tradeSystem = new TradeSystem();
    this._sceneProxy.tradeSystem = this.tradeSystem;

    this.worldEvents = new WorldEvents3D(this.eventBus, this.scene3d, this._sceneProxy);
    this.worldEvents.setSpawnFn(({ x, z, type }) => {
      const e = new Enemy3D(this.scene3d, x, z, type, this.eventBus, this.world3d);
      e.setCamera(this.camera.threeCamera);
      this.enemies.push(e);
    });

    this.achievements = new AchievementSystem(this._sceneProxy);
    this.storySystem  = new StorySystem(this._sceneProxy);

    this.shardSystem = new ShardSystem3D(this.eventBus, this.scene3d, this.camera.threeCamera);
    this.shardSystem.spawnShards(this.mapData);

    // Restore saved state
    if (savedPlayerData?.quests) this.questSystem.deserialize(savedPlayerData.quests);
    if (savedPlayerData?.story)  this.storySystem.deserialize(savedPlayerData.story);
    if (savedPlayerData?.shards) {
      const ids = Object.entries(savedPlayerData.shards)
        .filter(([, v]) => v).map(([k]) => Number(k));
      this.shardSystem.restoreState(ids);
    }

    // 7. Spawn 60 enemies
    this._spawnEnemies(gen, 60);

    // 8. Spawn NPCs
    this._spawnNPCs(gen);

    // 9. Dungeon portal (50 tiles east, 10 tiles north of center)
    this._buildDungeonPortal(cx, cz);

    // 10. Event wiring
    this._setupEvents();

    // 11. Click handler for attack / loot / shard
    this.renderer.canvas.addEventListener('click', this._onCanvasClick);

    // 12. Ambient audio
    setTimeout(() => this.audio.startAmbience('day'), 800);

    // 13. Prologue after 1 500 ms
    setTimeout(() => {
      this.storySystem.advanceAct();
      const act = this.storySystem.getCurrentAct();
      this.hud?.logMsg('Elder Lyra is waiting for you in the village.', '#ffd700');
      if (act) this.hud?.showActBanner(act);
    }, 1500);

    // Dungeon return notification
    if (savedPlayerData?._fromDungeon) {
      AIMemory.recordDungeonRun();
      setTimeout(() => {
        this.hud?.logMsg('^ Back from the dungeon.', '#aaaaff');
      }, 600);
    }
  }

  // ── Entity spawning ─────────────────────────────────────────────────────────

  _spawnEnemies(gen, count) {
    const types  = Object.keys(CONFIG.ENEMY_TYPES);
    const spawns = gen.getEnemySpawns(this.mapData, count);
    spawns.forEach((sp, i) => {
      const e = new Enemy3D(
        this.scene3d, sp.x + 0.5, sp.y + 0.5,
        types[i % types.length], this.eventBus, this.world3d,
      );
      e.setCamera(this.camera.threeCamera);
      this.enemies.push(e);
    });
  }

  _spawnNPCs(gen) {
    const cx  = Math.floor(MAP_W / 2);
    const cy  = Math.floor(MAP_H / 2);
    const pos = gen.getNPCSpawns(cx, cy);
    this.npcs = [];
    pos.forEach((p, i) => {
      if (i >= CONFIG.NPCS_DATA.length) return;
      const npc = new NPC3D(this.scene3d, p.x + 0.5, p.y + 0.5, i, this.eventBus);
      npc.setCamera(this.camera.threeCamera);
      this.npcs.push(npc);
    });
  }

  _buildDungeonPortal(cx, cz) {
    const px = (cx + 50) + 0.5;
    const pz = (cz - 10) + 0.5;

    // Torus geometry
    const geo = new THREE.TorusGeometry(1.2, 0.15, 8, 32);
    const mat = new THREE.MeshLambertMaterial({
      color:    0x6600cc,
      emissive: new THREE.Color(0x330066),
    });
    this._portalMesh = new THREE.Mesh(geo, mat);
    this._portalMesh.position.set(px, 1.2, pz);
    this._portalMesh.rotation.x = Math.PI / 2;
    this.scene3d.add(this._portalMesh);

    // Portal glow light
    this._portalLight = new THREE.PointLight(0x8800ff, 2.2, 9);
    this._portalLight.position.set(px, 1.5, pz);
    this.scene3d.add(this._portalLight);

    // DOM label
    this._portalLabelEl = document.createElement('div');
    Object.assign(this._portalLabelEl.style, {
      position:      'absolute',
      pointerEvents: 'none',
      fontFamily:    "'Courier New', monospace",
      fontSize:      '11px',
      color:         '#cc88ff',
      textShadow:    '0 0 8px #8800ff',
      transform:     'translate(-50%, -100%)',
      whiteSpace:    'nowrap',
    });
    this._portalLabelEl.textContent = '[ DUNGEON ]';
    this._overlay().appendChild(this._portalLabelEl);

    this._portalPos = new THREE.Vector3(px, 0, pz);
  }

  // ── Event wiring ────────────────────────────────────────────────────────────

  _setupEvents() {
    const bus = this.eventBus;

    bus.on('spawnLoot',       data => this._spawnLoot(data));

    bus.on('damage', (x, y, amount, color) => {
      // y may be a world-Y; we project from a world position above the hit point
      const wp = new THREE.Vector3(
        typeof x === 'number' ? x : 0,
        typeof y === 'number' ? y + 1.6 : 1.6,
        0,
      );
      this._showFloatingText3D(wp, String(amount), color || '#ffffff');
    });

    bus.on('levelUp', lv => {
      AIMemory.recordLevelUp(lv);
      this.achievements?.set('level', lv);
      this.audio?.sfxLevelUp();
      this.hud?.logMsg('★ Level Up! Now level ' + lv, '#ffd700');
      this.hud?.showFloatingText(
        window.innerWidth / 2,
        window.innerHeight * 0.4,
        '★ LEVEL ' + lv + '! ★', '#ffd700',
      );
    });

    bus.on('questAdded', q => {
      this.hud?.logMsg('New quest: ' + q.title, '#88aaff');
      this.hud?.refreshQuests?.();
      this.audio?.sfxQuestGet();
    });
    bus.on('questComplete', q => {
      this.hud?.logMsg('Quest done: ' + q.title + ' (+' + q.reward.xp + ' xp)', '#ffd700');
      this.hud?.refreshQuests?.();
      AIMemory.recordQuestDone(q.title);
      this.achievements?.track('quests');
      this._doSave();
    });
    bus.on('questProgress', () => this.hud?.refreshQuests?.());

    bus.on('weatherChanged', w => {
      this.hud?.logMsg('Weather: ' + w, '#aaccff');
      if (w === 'STORM') this.audio?.startAmbience('storm');
      else if (w === 'CLEAR') this.audio?.startAmbience('day');
    });

    bus.on('playerDead', () => {
      this.audio?.sfxPlayerHit();
      this.achievements?.track('deaths');
      this.hud?.logMsg('You have fallen! Respawning…', '#ff6666');
      setTimeout(() => {
        const cx = Math.floor(MAP_W / 2);
        const cz = Math.floor(MAP_H / 2);
        this.player.isDead       = false;
        this.player.stats.hp     = this.player.stats.maxHp;
        this.player.attackTarget = null;
        this.player.position.set(cx + 0.5, 0, cz + 0.5);
        this.player.group.position.copy(this.player.position);
        this.camera.snapTo(this.player.position);
        bus.emit('statsChanged', this.player.stats);
      }, 1800);
    });

    bus.on('bossKilled', name => {
      this.questSystem?.onKill(name);
      AIMemory.recordBossKill(name);
      this.achievements?.track('bosses');
      this.audio?.sfxBossDeath();
      this.storySystem?.flagSet('boss_' + name);
      this.hud?.logMsg('★ ' + name + ' DEFEATED! ★', '#dd88ff');
    });

    bus.on('bossPhase', msg => {
      this.hud?.logMsg(msg, '#ff44ff');
    });

    bus.on('achievement', ach => {
      this.audio?.sfxAchieve();
      this.hud?.showAchievement(ach);
    });

    bus.on('worldEvent', ev => {
      this.hud?.showWorldEvent(ev);
      this.audio?.sfxWorldEvent();
    });
    bus.on('worldEventEnd', ev => {
      this.hud?.logMsg(ev.name + ' has ended.', '#888888');
    });

    bus.on('statsChanged', s => {
      this.achievements?.set('gold',  s.gold  || 0);
      this.achievements?.set('level', s.level || 1);
    });

    bus.on('shardCollected', data => {
      this.achievements?.track('shards');
      this.storySystem?.collectShard(data.id);
      this.hud?.logMsg('Shard ' + data.id + '/5 collected!', '#ffd700');
    });

    bus.on('actAdvanced', act => {
      this.hud?.showActBanner(act);
      this.hud?.logMsg('[Act] ' + act.title, '#ffd700');
    });
    bus.on('storyQuestAdded', q => {
      this.hud?.logMsg('[Story] ' + q.title, '#ffd700');
      this.audio?.sfxQuestGet();
    });
    bus.on('sideQuestAdded', q => {
      this.hud?.logMsg('[Quest] ' + q.title, '#88aaff');
    });
    bus.on('loreUnlocked', () => {
      this.hud?.logMsg('Lore entry discovered.', '#aaaaff');
    });

    bus.on('npcInteract', ({ npcIndex }) => {
      const npc = this.npcs[npcIndex];
      if (npc) this._openDialogue(npc);
    });

    bus.on('skillLearned', (k, r) => {
      this.hud?.logMsg('Skill: ' + (CONFIG.SKILLS[k]?.name || k) + ' rank ' + r, '#aaddff');
    });
  }

  // ── Loot ────────────────────────────────────────────────────────────────────

  _spawnLoot({ x, y, z, itemKey }) {
    const geo = new THREE.OctahedronGeometry(0.18, 0);
    const mat = new THREE.MeshLambertMaterial({
      color:    0xffd700,
      emissive: new THREE.Color(0x331100),
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.4, z);
    mesh.castShadow = true;
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
      transform:     'translate(-50%, -100%)',
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
      wp.y += 0.45;
      wp.project(cam);
      if (wp.z > 1) { l.labelEl.style.display = 'none'; return; }
      l.labelEl.style.display = 'block';
      l.labelEl.style.left    = ((wp.x *  0.5 + 0.5) * window.innerWidth)  + 'px';
      l.labelEl.style.top     = ((wp.y * -0.5 + 0.5) * window.innerHeight) + 'px';
    });
  }

  _pickupLoot(lootHit) {
    this.player.addItem(lootHit.itemKey);
    this.questSystem?.onCollect(lootHit.itemKey);
    this.audio?.sfxPickup();
    this.eventBus.emit(
      'damage',
      lootHit.mesh.position.x, lootHit.mesh.position.y,
      '+' + (CONFIG.ITEMS[lootHit.itemKey]?.name || lootHit.itemKey),
      '#88ff88',
    );
    this.scene3d.remove(lootHit.mesh);
    lootHit.mesh.geometry.dispose();
    lootHit.mesh.material.dispose();
    lootHit.labelEl?.parentNode?.removeChild(lootHit.labelEl);
    this._lootMeshes = this._lootMeshes.filter(l => l !== lootHit);
  }

  // ── Click handling ──────────────────────────────────────────────────────────

  _onCanvasClick(e) {
    if (e.button !== 0) return;

    // Skip if a UI panel is open (HUD will set this flag)
    if (this.hud?.anyPanelOpen()) return;

    const rect = this.renderer.canvas.getBoundingClientRect();
    const ndcX =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    const ndcY = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    this._raycaster.setFromCamera({ x: ndcX, y: ndcY }, this.camera.threeCamera);

    // Gather all pickable meshes
    const enemyGroups = this.enemies.filter(en => !en.isDead);
    const enemyMeshes = [];
    enemyGroups.forEach(en => en.group.traverse(m => { if (m.isMesh) enemyMeshes.push(m); }));
    const shardMeshes = this.shardSystem?.getMeshes() || [];
    const lootMeshes  = this._lootMeshes.map(l => l.mesh);

    const allMeshes = [...enemyMeshes, ...shardMeshes, ...lootMeshes];
    const hits      = this._raycaster.intersectObjects(allMeshes, false);
    if (hits.length === 0) return;

    const hitMesh = hits[0].object;

    // Enemy?
    for (const en of enemyGroups) {
      let found = false;
      en.group.traverse(m => { if (m === hitMesh) found = true; });
      if (found) { this.player.setTarget(en); return; }
    }

    // Shard?
    const shardHit = shardMeshes.find(m => m === hitMesh);
    if (shardHit) {
      this.shardSystem.tryCollect(this.player, hitMesh.userData.shardId);
      return;
    }

    // Loot?
    const lootHit = this._lootMeshes.find(l => l.mesh === hitMesh);
    if (lootHit) {
      if (this.player.position.distanceTo(lootHit.mesh.position) <= 70) {
        this._pickupLoot(lootHit);
      }
    }
  }

  // ── Floating damage numbers ─────────────────────────────────────────────────

  _showFloatingText3D(worldPos3, text, color) {
    const wp = worldPos3.clone().project(this.camera.threeCamera);
    if (wp.z > 1) return;
    const sx = (wp.x *  0.5 + 0.5) * window.innerWidth;
    const sy = (wp.y * -0.5 + 0.5) * window.innerHeight;
    this._spawnFloatDiv(sx, sy, text, color);
  }

  _spawnFloatDiv(sx, sy, text, color) {
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
      textShadow:    '1px 1px 3px #000, -1px -1px 3px #000',
      pointerEvents: 'none',
      userSelect:    'none',
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
      ft.el.style.top     = (ft.startY - 52 * t) + 'px';
      ft.el.style.opacity = String(Math.max(0, 1 - t * 1.5));
      if (ft.age >= ft.maxAge) {
        ft.el.parentNode?.removeChild(ft.el);
        this._floatTexts.splice(i, 1);
      }
    }
  }

  // ── Portal ───────────────────────────────────────────────────────────────────

  _updatePortalAnimation(delta) {
    if (!this._portalMesh) return;
    this._portalMesh.rotation.z += delta * 0.9;
    if (this._portalLight) {
      this._portalLight.intensity = 1.8 + Math.sin(this._totalTime * 2.5) * 0.6;
    }
  }

  _updatePortalLabel() {
    if (!this._portalLabelEl || !this._portalPos) return;
    const wp = new THREE.Vector3(this._portalPos.x, 3.0, this._portalPos.z);
    wp.project(this.camera.threeCamera);
    if (wp.z > 1) { this._portalLabelEl.style.display = 'none'; return; }
    this._portalLabelEl.style.display = 'block';
    this._portalLabelEl.style.left    = ((wp.x *  0.5 + 0.5) * window.innerWidth)  + 'px';
    this._portalLabelEl.style.top     = ((wp.y * -0.5 + 0.5) * window.innerHeight) + 'px';
  }

  _checkPortalCollision() {
    if (this._portalUsed || !this._portalPos) return;
    if (this.player.position.distanceTo(this._portalPos) < 2) this._enterDungeon();
  }

  _enterDungeon() {
    if (this._portalUsed) return;
    this._portalUsed = true;
    this.questSystem?.onExplore();
    this.achievements?.track('dungeons');
    AIMemory.recordDungeonRun();
    this.audio?.sfxPortal();
    this.hud?.logMsg('Entering the dungeon…', '#cc88ff');
    this._doSave();

    this.eventBus.emit('enterDungeon', {
      savedPlayer: {
        stats:       { ...this.player.stats },
        inventory:   { ...this.player.inventory },
        equipment:   { ...this.player.equipment },
        skills:      { ...(this.player.skills || {}) },
        playerClass: this.player.playerClass,
      },
    });
  }

  // ── Dialogue ─────────────────────────────────────────────────────────────────

  _openDialogue(npc) {
    this.audio?.sfxUIOpen();
    this.hud?.openDialogue(npc, this.player, this.questSystem, this.tradeSystem, this.worldEvents);
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async _doSave() {
    try {
      await this.saveSystem?.save({
        stats:       { ...this.player.stats },
        inventory:   { ...this.player.inventory },
        equipment:   { ...this.player.equipment },
        skills:      { ...(this.player.skills || {}) },
        playerClass: this.player.playerClass,
        quests:      this.questSystem?.serialize(),
        story:       this.storySystem?.serialize(),
        shards:      this.storySystem?.shardFlags || {},
      });
    } catch (_) {}
  }

  // ── Main update ──────────────────────────────────────────────────────────────

  /** @param {number} delta seconds since last frame */
  update(delta) {
    if (this._disposed || !this.player) return;
    this._totalTime += delta;

    // Keep camera reference fresh on player
    this.player.camera = this.camera.threeCamera;

    // Player
    this.player.update(delta);

    // Camera follow
    this.camera.follow(this.player.position);
    this.camera.update(delta, this.input);

    // Combat zoom (lerp camera distance)
    const nearEnemy = this.enemies.some(
      e => !e.isDead && e.position.distanceTo(this.player.position) < 8,
    );
    if (nearEnemy) {
      this._combatTimer = 2.2;
      this._targetZoom  = 14;
    } else if (this._combatTimer > 0) {
      this._combatTimer -= delta;
      if (this._combatTimer <= 0) this._targetZoom = this._baseZoom;
    }
    if (Math.abs(this.camera.zoom - this._targetZoom) > 0.05) {
      this.camera.zoom += (this._targetZoom - this.camera.zoom) * Math.min(1, delta * 2.5);
    }

    // Visible chunks
    const tp = this.world3d.worldToTile(this.player.position.x, this.player.position.z);
    this.world3d.updateVisibleChunks(tp.x, tp.z);

    // Enemies — update AI, track kills
    this.enemies.forEach(e => {
      if (!e._cameraSet) {
        e.setCamera(this.camera.threeCamera);
        e._cameraSet = true;
      }
      if (e.isDead && !e._questTracked) {
        e._questTracked = true;
        this.questSystem?.onKill(e._data?.name || '');
        AIMemory.recordKill(e._data?.name || 'enemy');
        this.achievements?.track('kills');
        this.audio?.sfxKill();
      }
      e.update(delta, this.player);
    });

    // NPCs
    this.npcs.forEach(npc => {
      npc.setCamera(this.camera.threeCamera);
      npc.update(delta, this.player, this.input);
    });

    // Day/night
    this.dayNight?.update(delta);

    // World events
    this.worldEvents?.update(delta);

    // Shards (floating animation)
    this.shardSystem?.setCamera(this.camera.threeCamera);
    this.shardSystem?.update(delta, this._totalTime);

    // Loot labels
    this._updateLootLabels();

    // Floating damage numbers
    this._updateFloatingTexts(delta);

    // Portal animation + collision
    this._updatePortalAnimation(delta);
    this._updatePortalLabel();
    this._checkPortalCollision();

    // Footstep audio
    const spd = Math.hypot(this.player.velocity.x, this.player.velocity.z);
    if (spd > 0.5) {
      this._stepTimer -= delta;
      if (this._stepTimer <= 0) {
        this.audio?.sfxStep();
        this._stepTimer = 0.32;
      }
    }

    // Auto-save
    this._saveTimer -= delta;
    if (this._saveTimer <= 0) {
      this._saveTimer = 30;
      this._doSave();
    }

    // HUD per-frame refresh
    this.hud?.update(this);

    // Render
    this.renderer.render(this.scene3d, this.camera.threeCamera);

    // Flush input per-frame state
    this.input.update();
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────────

  dispose() {
    if (this._disposed) return;
    this._disposed = true;

    this.renderer.canvas.removeEventListener('click', this._onCanvasClick);

    this._sceneProxy?.dispose();
    this.worldEvents?.dispose();

    this.player?.dispose();
    this.enemies.forEach(e => e.dispose?.());
    this.npcs.forEach(n => n.dispose?.());
    this.enemies = [];
    this.npcs    = [];

    this.shardSystem?.dispose();

    this._lootMeshes.forEach(l => {
      this.scene3d.remove(l.mesh);
      l.mesh.geometry.dispose();
      l.mesh.material.dispose();
      l.labelEl?.parentNode?.removeChild(l.labelEl);
    });
    this._lootMeshes = [];

    this._floatTexts.forEach(ft => ft.el.parentNode?.removeChild(ft.el));
    this._floatTexts = [];

    if (this._portalMesh) {
      this.scene3d.remove(this._portalMesh);
      this._portalMesh.geometry.dispose();
      this._portalMesh.material.dispose();
    }
    if (this._portalLight) {
      this.scene3d.remove(this._portalLight);
      this._portalLight.dispose();
    }
    this._portalLabelEl?.parentNode?.removeChild(this._portalLabelEl);

    this.world3d?.dispose();

    clearInterval(this._saveInterval);
  }
}
