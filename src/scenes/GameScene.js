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
import { ParticleSystem3D }  from '../systems/ParticleSystem3D.js';
import { AnimationSystem }   from '../systems/AnimationSystem.js';
import { FactionSystem }     from '../systems/FactionSystem.js';
import { CombatSystem }      from '../systems/CombatSystem.js';
import { EnchantSystem }     from '../systems/EnchantSystem.js';
import { RegionSystem }       from '../systems/RegionSystem.js';
import { CodexSystem }        from '../systems/CodexSystem.js';
import { ItemSystem }         from '../systems/ItemSystem.js';
import { AbilitySystem }      from '../systems/AbilitySystem.js';
import { WorldBossSystem }    from '../systems/WorldBossSystem.js';
import { WeatherSystem }        from '../systems/WeatherSystem.js';
import { PrestigeSystem }       from '../systems/PrestigeSystem.js';
import { DailyChallengeSystem } from '../systems/DailyChallengeSystem.js';
import { GamepadManager }       from '../engine/GamepadManager.js';
import { ACH_RARITY }           from '../systems/AchievementSystem.js';
import { PointsOfInterest }   from '../systems/PointsOfInterest.js';
import { randomScroll }       from '../systems/LoreDatabase.js';
import { GatheringSystem }    from '../systems/GatheringSystem.js';
import { SlayerSystem }       from '../systems/SlayerSystem.js';
import { TownBuilder }        from '../systems/TownBuilder.js';
import { CoopClient }        from '../systems/CoopClient.js';
import { RemotePlayer3D }    from '../entities/RemotePlayer3D.js';

// Map dimensions — 512×512 gives a true open world (4× the area of v0.7's 256×256)
const MAP_W = 512;
const MAP_H = 512;

// World scale — must match CONFIG.WORLD_3D.TILE_SIZE (= 4)
// Evaluated after module-level imports so CONFIG is available.
const TS = CONFIG.WORLD_3D.TILE_SIZE;   // Three.js units per tile

// Town safe-zone radius in WORLD units (tile radius × TS)
const TOWN_SAFE_R = 40 * TS;

// ── Phaser-compat proxy (used by legacy systems that call scene.events / scene.time) ─

class SceneProxy {
  constructor(eventBus) {
    this._bus    = eventBus;
    this._timers = [];
    this._subs   = []; // track eventBus subscriptions for cleanup

    this.player      = null;
    this.enemies     = [];
    this.tradeSystem = null;
    this.dayNight    = null;

    // Mirrors Phaser's scene.events API
    this.events = {
      emit: (ev, ...args) => eventBus.emit(ev, ...args),
      on:   (ev, cb)      => {
        eventBus.on(ev, cb);
        this._subs.push([ev, cb]);
        return this.events;
      },
      off:  (ev, cb)      => {
        eventBus.off(ev, cb);
        this._subs = this._subs.filter(([e, c]) => e !== ev || c !== cb);
        return this.events;
      },
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
    // Unsubscribe all event listeners registered via scene.events.on()
    this._subs.forEach(([ev, cb]) => this._bus.off(ev, cb));
    this._subs = [];
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
    let density = (0.008 + (1 - day) * 0.006) / TS;
    if (this.weather === 'FOG')   density = 0.038 / TS;
    if (this.weather === 'STORM') density = 0.025 / TS;
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

  /**
   * Returns a 0..1 factor: 0 at midnight, 1 at noon.
   * Mirrors the sunY calculation used in setTimeOfDay so callers
   * don't need to duplicate the trigonometry.
   */
  getDayFactor() {
    const phase = (this.elapsed / this.cycleSecs) * Math.PI * 2;
    return Math.max(0, Math.sin(phase - Math.PI / 2));
  }
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
        if (this._scene3d.fog) this._scene3d.fog.density = start ? 0.045 / TS : 0.015 / TS;
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
    this._world3d   = null;
    this._shards    = [];
    this._overlay   = document.getElementById('ui-overlay') || document.body;
  }

  setCamera(cam) { this._camera = cam; }
  setWorld3D(world3d) { this._world3d = world3d; }

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
      // v0.5: sit shards on terrain surface
      const shardGroundY = this._world3d?.getHeightAt(tx, tz) ?? 0;
      const shardTS = CONFIG.WORLD_3D.TILE_SIZE;
      mesh.position.set(tx * shardTS + shardTS / 2, shardGroundY + 0.8 * shardTS, tz * shardTS + shardTS / 2);
      mesh.userData.groundY = shardGroundY;
      mesh.castShadow = true;
      mesh.userData.isShard  = true;
      mesh.userData.shardId  = pos.id;
      this._scene3d.add(mesh);

      const light = new THREE.PointLight(color, 1.2, 5 * shardTS);
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
      sh.mesh.position.y = (sh.mesh.userData.groundY ?? 0) + 0.8 * CONFIG.WORLD_3D.TILE_SIZE + Math.sin(t * 1.5 + sh.floatPhase) * 0.22 * CONFIG.WORLD_3D.TILE_SIZE;
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
    if (player.position.distanceTo(sh.mesh.position) > 3.5 * CONFIG.WORLD_3D.TILE_SIZE) {
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

    // Torch — follows the player to illuminate the immediate area at night
    this._torchLight = null;

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

    // Combat zoom (scaled with TS — default 80 at TS=4)
    this._baseZoom   = 80;
    this._targetZoom = 80;
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
    this.particles      = null;   // v0.4
    this.animSystem     = null;   // v0.4
    this.factionSystem  = null;   // v0.4
    this.combatSystem   = null;   // v0.5
    this.enchantSystem  = null;   // v0.5
    this.regionSystem   = null;   // v0.6
    this.codexSystem    = null;   // v0.6
    this.itemSystem     = null;   // v0.6
    this.poiSystem      = null;   // v0.6
    this.abilitySystem  = null;   // v0.6
    this.worldBossSystem = null;  // v0.6
    this.weatherSystem      = null;  // v0.7
    this.prestigeSystem     = null;  // v0.7
    this.dailyChallengeSystem = null; // v0.7
    this.gamepadManager     = null;  // v0.7
    this.coop           = null;      // v0.9 — co-op networking
    this.remotePlayers  = new Map(); // v0.9 — peerId → RemotePlayer3D
    this._sceneProxy    = null;

    /** @type {import('../ui/HUD.js').HUD|null} */
    this.hud = null;

    this._disposed       = false;
    this._paused         = false;
    this._xpBoostMult    = 1.0;
    this._hpRegenPerSec  = 0;
    this._onCanvasClick  = this._onCanvasClick.bind(this);
    this._onKeyDown      = this._onKeyDown.bind(this);
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
    this.scene3d.fog         = new THREE.FogExp2(0x0a0a1a, 0.015 / TS);

    // 2. Generate map (256×256)
    const gen = new WorldGen();
    // v0.5: WorldGen now returns { data, elevMap }
    const worldResult = gen.generate(MAP_W, MAP_H);
    this.mapData = worldResult.data ?? worldResult;   // backward compat
    this._elevMap = worldResult.elevMap ?? null;

    // 3. Build 3D world
    this.world3d = new World3D(this.scene3d);
    this.world3d.build(worldResult);  // { data, elevMap } from WorldGen
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
    const startGroundY = this.world3d.getGroundY(cx, cz);
    this.player.position.set(cx * TS + TS / 2, startGroundY, cz * TS + TS / 2);
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
      // Restore permanent NPC chain rewards and re-apply their effects
      this.player.chainRewards = { ...(savedPlayerData.chainRewards || {}) };
      Object.keys(this.player.chainRewards).forEach(key => this._applyChainReward(key, true));
    }
    if (!this.player.playerClass) {
      this.player.applyClass(localStorage.getItem('aethoria_class') || 'WARRIOR');
    }
    // v0.7 — Weather gameplay system
    this.weatherSystem = new WeatherSystem(this.eventBus);

    // v0.7 — Prestige system
    this.prestigeSystem = new PrestigeSystem(this.eventBus);
    this.prestigeSystem.applyToPlayer(this.player);
    if (savedPlayerData?.prestige) this.prestigeSystem.deserialize(savedPlayerData.prestige);

    // v0.7 — Daily/Weekly challenges
    this.dailyChallengeSystem = new DailyChallengeSystem(this.eventBus);

    // v0.7 — Gamepad
    this.gamepadManager = new GamepadManager(this.input, this.eventBus);
    this.weatherSystem.attach(this.renderer.canvas);

    // v0.6 — World Boss system
    this.worldBossSystem = new WorldBossSystem(this.scene3d, this.camera.threeCamera, this.eventBus);
    this.worldBossSystem.setPlayer(this.player);
    this.worldBossSystem.setPlayerLevel(this.player.stats.level);



    // Torch light — warm point-light that follows the player.
    // Provides local illumination so nights are navigable without making
    // daytime look unnatural.  Intensity is adjusted each frame in update().
    this._torchLight = new THREE.PointLight(0xffcc77, 1.8, 14 * TS);
    this._torchLight.position.set(cx * TS + TS / 2, 1.5, cz * TS + TS / 2);
    this.scene3d.add(this._torchLight);

    // 6. Systems
    this.questSystem   = new QuestSystem(this._sceneProxy);
    this.saveSystem    = new SaveSystem();
    this.saveSystem.init().catch(() => {});

    // Auto-save every 60 s; _saveInterval is cleared in dispose().
    // Errors are intentionally suppressed: a save failure must never interrupt gameplay.
    const AUTO_SAVE_MS = 60_000;
    this._saveInterval = setInterval(() => {
      this._doSave().then(() => {
        this.hud?.logMsg('Game auto-saved.', '#888899');
      }).catch(() => {});
    }, AUTO_SAVE_MS);

    this.dayNight = new DayNight3D(this.eventBus, this.scene3d);
    this.dayNight.setWorld3D(this.world3d);
    this._sceneProxy.dayNight = this.dayNight;

    this.audio = new AudioSystem();
    this.audio.init();

    this.tradeSystem = new TradeSystem();
    this._sceneProxy.tradeSystem = this.tradeSystem;

    // v0.4 — FactionSystem (must come before TradeSystem.setFactionSystem)
    this.factionSystem = new FactionSystem(this.eventBus);
    this.tradeSystem.setFactionSystem(this.factionSystem);
    if (savedPlayerData?.factions) this.factionSystem.deserialize(savedPlayerData.factions);

    this.worldEvents = new WorldEvents3D(this.eventBus, this.scene3d, this._sceneProxy);
    this.worldEvents.setSpawnFn(({ x, z, type }) => {
      const e = new Enemy3D(this.scene3d, x, z, type, this.eventBus, this.world3d);
      e.setCamera(this.camera.threeCamera);
      this.enemies.push(e);
    });

    this.achievements = new AchievementSystem(this.eventBus);
    this.storySystem  = new StorySystem(this._sceneProxy);

    this.shardSystem = new ShardSystem3D(this.eventBus, this.scene3d, this.camera.threeCamera);
    this.shardSystem.setWorld3D(this.world3d);
    this.shardSystem.spawnShards(this.mapData);

    // v0.5 — Combat system (status effects, screen shake, combo)
    this.combatSystem = new CombatSystem(this.eventBus, this.renderer);

    // v0.5 — Enchant system
    this.enchantSystem = new EnchantSystem(this.eventBus);

    // v0.6 — Region system
    this.regionSystem = new RegionSystem(this.eventBus);
    if (savedPlayerData?.regions) this.regionSystem.deserialize(savedPlayerData.regions);

    // v0.6 — Codex / lore discovery system
    this.codexSystem = new CodexSystem(this.eventBus);
    if (savedPlayerData?.codex) this.codexSystem.deserialize(savedPlayerData.codex);

    // v0.6 — Item rarity system
    this.itemSystem = new ItemSystem(this.eventBus);

    // v0.6 — Ability system (must be created before deserialize)
    this.abilitySystem = new AbilitySystem(this.eventBus);
    this.abilitySystem.init(this.player, this);
    if (savedPlayerData?.abilities) this.abilitySystem.deserialize(savedPlayerData.abilities);

    // v0.6 — Points of Interest
    this.poiSystem = new PointsOfInterest(this.scene3d, this.camera.threeCamera, this.eventBus);
    this.poiSystem.spawnAll(this.mapData, MAP_W, MAP_H);
    this.poiSystem.setPlayer(this.player);
    if (savedPlayerData?.poi) this.poiSystem.deserialize(savedPlayerData.poi);

    // v0.4 — Particle effects engine
    this.particles = new ParticleSystem3D(this.scene3d, this.camera.threeCamera);
    this.particles.attachToEventBus(this.eventBus, this.player);
    this.particles.seedFireflies(cx * TS + TS / 2, cz * TS + TS / 2, 35);

    // v0.4 — Animation system
    this.animSystem = new AnimationSystem(this.scene3d);

    // v0.5 — Gathering skill system
    this.gatheringSystem = new GatheringSystem(this._sceneProxy);
    this._registerGatherNodes(cx, cz);

    // v0.5 — Slayer system
    this.slayerSystem = new SlayerSystem(this._sceneProxy);
    this._sceneProxy.slayerSystem = this.slayerSystem;

    // Wire slayer kill tracking into event bus (tracked for cleanup in dispose)
    const _slayerCb = ({ typeKey }) => this.slayerSystem.onKill(typeKey);
    this.eventBus.on('enemyKilled', _slayerCb);
    if (!this._busSubs) this._busSubs = [];
    this._busSubs.push(['enemyKilled', _slayerCb]);

    // Restore saved state
    if (savedPlayerData?.quests)       this.questSystem.deserialize(savedPlayerData.quests);
    if (savedPlayerData?.story)        this.storySystem.deserialize(savedPlayerData.story);
    if (savedPlayerData?.achievements) this.achievements.deserialize(savedPlayerData.achievements);
    if (savedPlayerData?.gathering)    this.gatheringSystem.deserialize(savedPlayerData.gathering);
    if (savedPlayerData?.slayer)       this.slayerSystem.deserialize(savedPlayerData.slayer);
    if (savedPlayerData?.shards) {
      const ids = Object.entries(savedPlayerData.shards)
        .filter(([, v]) => v).map(([k]) => Number(k));
      this.shardSystem.restoreState(ids);
    }

    // 7. Spawn 150 enemies across the 512×512 map
    this._spawnEnemies(gen, 150);

    // 8. Spawn NPCs + town guards
    this._spawnNPCs(gen);
    this._spawnTownGuards(cx, cz);

    // 8b. Build Hearthmoor town structures (buildings, market, fountain, etc.)
    this.townBuilder = new TownBuilder();
    this.townBuilder.build(this.scene3d, cx, cz, this.world3d);

    // 9. Dungeon portal (80 tiles east, 20 tiles north of center — outside safe zone)
    this._buildDungeonPortal(cx, cz);

    // v0.7 — Saltmere dungeon portal (near Shattered Coast settlement)
    const sx = Math.floor(MAP_W * 0.28);
    const sz = Math.floor(MAP_H * 0.78);
    this._buildSaltmereDungeonPortal(sx, sz);

    // 10. Event wiring
    this._setupEvents();

    // 11. Click handler for attack / loot / shard + ESC for pause
    this.renderer.canvas.addEventListener('click', this._onCanvasClick);
    window.addEventListener('keydown', this._onKeyDown);

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

    // 14. v0.9 — Co-op: wire client, connect if menu set a pending intent
    this._initCoop();
  }

  // ── Entity spawning ─────────────────────────────────────────────────────────

  _spawnEnemies(gen, count) {
    // v0.5 — include new enemy types in spawn pool
    const types  = Object.keys(CONFIG.ENEMY_TYPES);
    const spawns = gen.getEnemySpawns(this.mapData, count);  // mapData is already the plain array  // getEnemySpawns accepts {tiles} or raw array
    spawns.forEach((sp, i) => {
      const e = new Enemy3D(
        this.scene3d, sp.x * TS + TS / 2, sp.y * TS + TS / 2,
        types[i % types.length], this.eventBus, this.world3d,
      );
      e.setCamera(this.camera.threeCamera);
      this.enemies.push(e);
    });
  }

  _spawnNPCs(gen) {
    const cx  = Math.floor(MAP_W / 2);
    const cy  = Math.floor(MAP_H / 2);
    this.npcs = [];

    // Hearthmoor NPCs (indices 0-4)
    const hmPos = gen.getNPCSpawns(cx, cy);
    hmPos.forEach((p, i) => {
      if (i >= 5) return;
      const npc = new NPC3D(this.scene3d, p.x * TS + TS / 2, p.y * TS + TS / 2, i, this.eventBus);
      npc.setCamera(this.camera.threeCamera);
      this.npcs.push(npc);
    });

    // Saltmere NPCs (indices 5-8)
    const smPos = gen.getSaltmereSpawns(MAP_W, MAP_H);
    smPos.forEach((p, i) => {
      const idx = 5 + i;
      if (idx >= CONFIG.NPCS_DATA.length) return;
      const npc = new NPC3D(this.scene3d, p.x * TS + TS / 2, p.y * TS + TS / 2, idx, this.eventBus);
      npc.setCamera(this.camera.threeCamera);
      this.npcs.push(npc);
    });
  }

  /**
   * Spawn 8 visible town guards around the Hearthmoor perimeter.
   * Guards are simple NPC-style entities — they don't walk, but their presence
   * (and the safe-zone kill logic in update()) creates the safe zone effect.
   */
  _spawnTownGuards(cx, cz) {
    this._guardMeshes = [];
    const R = TOWN_SAFE_R - 4 * TS;   // guards stand just inside the safe zone edge (world units)
    const COUNT = 8;

    const guardMat  = new THREE.MeshLambertMaterial({ color: 0x4488cc });
    const armorMat  = new THREE.MeshLambertMaterial({ color: 0x2255aa });
    const helmetMat = new THREE.MeshLambertMaterial({ color: 0x1a3a88 });
    const skinMat   = new THREE.MeshLambertMaterial({ color: 0xddaa88 });

    for (let i = 0; i < COUNT; i++) {
      const angle = (i / COUNT) * Math.PI * 2;
      const gx    = cx * TS + TS / 2 + Math.cos(angle) * R;
      const gz    = cz * TS + TS / 2 + Math.sin(angle) * R;

      const group = new THREE.Group();

      // Body
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.75, 0.35), armorMat);
      body.position.y = 1.0; group.add(body);
      // Legs
      [-0.14, 0.14].forEach(lx => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.6, 0.3), guardMat);
        leg.position.set(lx, 0.4, 0); group.add(leg);
      });
      // Arms
      [-0.44, 0.44].forEach(ax => {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.6, 0.28), armorMat);
        arm.position.set(ax, 1.0, 0); group.add(arm);
      });
      // Head
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skinMat);
      head.position.y = 1.58; group.add(head);
      // Helmet
      const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.26, 0.48), helmetMat);
      helmet.position.y = 1.75; group.add(helmet);
      // Spear
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 6), new THREE.MeshLambertMaterial({ color: 0x886644 }));
      shaft.position.set(0.55, 1.3, 0); group.add(shaft);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 6), new THREE.MeshLambertMaterial({ color: 0xaaaacc }));
      tip.position.set(0.55, 2.55, 0); group.add(tip);

      group.position.set(gx, 0, gz);
      group.rotation.y = angle + Math.PI; // face inward
      group.traverse(m => { if (m.isMesh) m.castShadow = true; });
      this.scene3d.add(group);
      this._guardMeshes.push(group);
    }
  }

  /**
   * Register gathering nodes from CONFIG.GATHER_REGIONS around world centre.
   * Nodes are placed at approximate biome-appropriate positions.
   */
  _registerGatherNodes(cx, cz) {
    const instances = [];
    let id = 1;

    for (const [skill, positions] of Object.entries(CONFIG.GATHER_REGIONS ?? {})) {
      const skillDef = CONFIG.GATHERING_SKILLS[skill];
      if (!skillDef) continue;

      for (const pos of positions) {
        for (const node of skillDef.nodes) {
          // Slightly randomise each node position so they don't stack
          const offsetX = (Math.random() - 0.5) * 4 * TS;
          const offsetZ = (Math.random() - 0.5) * 4 * TS;
          instances.push({
            id:     `node_${id++}`,
            nodeId: node.id,
            x:      pos.x * TS + TS / 2 + offsetX,
            z:      pos.z * TS + TS / 2 + offsetZ,
          });
        }
      }
    }

    this.gatheringSystem.registerNodes(instances);
  }

  _buildDungeonPortal(cx, cz) {
    const px = (cx + 80) * TS + TS / 2;
    const pz = (cz - 20) * TS + TS / 2;

    // Torus geometry
    const geo = new THREE.TorusGeometry(1.2, 0.15, 8, 32);
    const mat = new THREE.MeshLambertMaterial({
      color:    0x6600cc,
      emissive: new THREE.Color(0x330066),
    });
    this._portalMesh = new THREE.Mesh(geo, mat);
    this._portalMesh.position.set(px, 1.2 * TS, pz);
    this._portalMesh.rotation.x = Math.PI / 2;
    this.scene3d.add(this._portalMesh);

    // Portal glow light
    this._portalLight = new THREE.PointLight(0x8800ff, 2.2, 9 * TS);
    this._portalLight.position.set(px, 1.5 * TS, pz);
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

  _buildSaltmereDungeonPortal(sx, sz) {
    // Place portal 6 tiles north of Saltmere centre
    const px = sx * TS + TS / 2;
    const pz = (sz - 6) * TS + TS / 2;

    const geo = new THREE.TorusGeometry(1.2, 0.15, 8, 32);
    const mat = new THREE.MeshLambertMaterial({
      color:    0x006666,
      emissive: new THREE.Color(0x003333),
    });
    this._saltmerePortalMesh = new THREE.Mesh(geo, mat);
    this._saltmerePortalMesh.position.set(px, 1.2 * TS, pz);
    this._saltmerePortalMesh.rotation.x = Math.PI / 2;
    this.scene3d.add(this._saltmerePortalMesh);

    this._saltmerePortalLight = new THREE.PointLight(0x008888, 2.0, 9 * TS);
    this._saltmerePortalLight.position.set(px, 1.5 * TS, pz);
    this.scene3d.add(this._saltmerePortalLight);

    this._saltmerePortalLabelEl = document.createElement('div');
    Object.assign(this._saltmerePortalLabelEl.style, {
      position: 'absolute', pointerEvents: 'none',
      fontFamily: "'Courier New', monospace", fontSize: '11px',
      color: '#44cccc', textShadow: '0 0 8px #008888',
      transform: 'translate(-50%, -100%)', whiteSpace: 'nowrap',
    });
    this._saltmerePortalLabelEl.textContent = '[ SUNKEN VAULTS ]';
    this._overlay().appendChild(this._saltmerePortalLabelEl);

    this._saltmerePortalPos  = new THREE.Vector3(px, 0, pz);
    this._saltmerePortalUsed = false;
  }

  // ── Event wiring ────────────────────────────────────────────────────────────

  _setupEvents() {
    // Tracking proxy — every bus.on() registered here is recorded so
    // dispose() can call bus.off() for each one, preventing listener leaks
    // across scene transitions.
    const _subs = [];
    this._busSubs = _subs;
    const bus = {
      on: (ev, cb) => { _subs.push([ev, cb]); this.eventBus.on(ev, cb); },
    };

    bus.on('spawnLoot', data => {
      this._spawnLoot(data);
      if (this.particles) {
        const col = data.itemKey === 'gold' ? 0xffd700 : data.itemKey === 'gem' ? 0xcc44ff : 0x44ffcc;
        this.particles.lootGlow(data.x, data.y ?? 0, data.z, col);
      }
    });

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
      // v0.4 — particle burst at player position
      this.worldBossSystem?.setPlayerLevel(this.player.stats.level);
      if (this.particles && this.player) {
        this.particles.levelUpBurst(
          this.player.position.x, this.player.position.y, this.player.position.z,
        );
      }
      AIMemory.recordPlayerSnapshot(this.player.stats);
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

    // NPC chain quest rewards — apply permanent gameplay effects
    bus.on('chainRewardGranted', ({ rewardKey }) => {
      this._applyChainReward(rewardKey);
      this._doSave();
    });

    // Chain quest ready to turn in — refresh quest log
    bus.on('chainQuestReady', () => this.hud?.refreshQuests?.());

    bus.on('weatherChanged', w => {
      // WeatherSystem handles its own hintMsg via hudLog event
      if (w === 'STORM' || w === 'BLIZZARD') this.audio?.startAmbience('storm');
      else if (w === 'FOG' || w === 'RAIN')  this.audio?.startAmbience('night');
      else                                    this.audio?.startAmbience('day');
      // Apply enemy modifiers immediately
      const mults = this.weatherSystem;
      if (mults) {
        this.enemies.forEach(e => {
          if (e.isDead) return;
          e._weatherSpeedMult    = mults.getEnemySpeedMult() * mults.getEnemyTypeMult(e.typeKey);
          e._weatherDetectMult   = mults.getDetectRangeMult();
        });
      }
    });

    // v0.7 — Thunder SFX
    bus.on('thunderClap', () => this.audio?.sfxWorldEvent());

    // v0.7 — Weather XP mult applied at XP gain time via player._weatherXPMult
    bus.on('weatherEffectsChanged', effects => {
      if (this.player) this.player._weatherXPMult = effects.xpMult ?? 1.0;
    });

    bus.on('playerDead', () => {
      this.audio?.sfxPlayerHit();
      this.achievements?.track('deaths');

      const doRespawn = () => {
        const cx = Math.floor(MAP_W / 2);
        const cz = Math.floor(MAP_H / 2);
        const p  = this.player;
        if (!p) return;
        // Reset death state
        p.isDead          = false;
        p._deathFalling   = false;
        p._deathFallAngle = 0;
        p.group.rotation.z = 0;
        p.group.position.y = 0;
        p.attackTarget    = null;
        // Restore HP to 40% so player can't immediately die again
        p.stats.hp = Math.max(1, Math.floor(p.stats.maxHp * 0.40));
        p.position.set(cx * TS + TS / 2, 0, cz * TS + TS / 2);
        p.group.position.copy(p.position);
        this.camera.snapTo(p.position);
        bus.emit('statsChanged', p.stats);
        this.hud?.logMsg('You wake near the hearthfire. HP restored to 40%.', '#ff8866');
      };

      this.hud?.showDeathScreen(doRespawn, 5);
    });

    // v0.6 — Region entered notification + ambient music change
    bus.on('regionEntered', ({ region, firstVisit }) => {
      const col = region.color ?? '#aaaaaa';
      this.hud?.logMsg(`📍 ${region.name} — ${region.subtitle}`, col);
      if (firstVisit) {
        setTimeout(() => {
          this.hud?.showRegionBanner(region);
        }, 800);
      }
      // Swap ambience when moving between zones
      if (region.ambience && this.audio) {
        this.audio.startAmbience(region.ambience);
      }
    });

    // v0.6 — Codex unlock notification
    bus.on('codexUnlocked', ({ category, id }) => {
      const labels = {
        bestiary: '📖 Bestiary updated', scrolls: '📜 Scroll added to Codex',
        regions: '🗺️ Region discovered', shards: '💎 Shard lore unlocked',
        history: '📚 History unlocked', npcs: '👤 NPC bio unlocked',
      };
      const msg = labels[category] ?? 'Codex updated';
      this.hud?.logMsg(msg + '.', '#aaddff');
    });

    // v0.6 — Scroll loot → give as readable item + register in codex
    bus.on('scrollPickedUp', ({ scroll }) => {
      this.codexSystem?.addScroll(scroll);
      this.hud?.showScrollReader(scroll);
    });

    // v0.5 — Status effect particles
    bus.on('statusParticle', ({ x, y, z, color }) => {
      if (this.particles) this.particles.lootGlow(x, y, z, color);
    });

    // v0.5/v0.6 — Enemy status hit events
    bus.on('enemyPoisonHit', ({ target }) => {
      if (target && this.combatSystem) this.combatSystem.applyStatus(target, 'POISON', { source: null });
    });
    bus.on('enemyVoidHit',   ({ target }) => {
      if (target && this.combatSystem) this.combatSystem.applyStatus(target, 'VOID_CURSE', { source: null });
    });
    bus.on('enemyBurnHit',   ({ target }) => {
      if (target && this.combatSystem) this.combatSystem.applyStatus(target, 'BURN', { source: null });
    });

    // v0.6 — Shrine blessing applies buff to player
    bus.on('shrineBlessing', ({ buff }) => {
      if (!this.player) return;
      // Snapshot original speed before multiplying so revert is exact (no float drift)
      const origSpeed = this.player.stats.speed ?? 2;
      if (buff.stat === 'attack')   this.player.stats.attack   = (this.player.stats.attack   ?? 10) + buff.amount;
      if (buff.stat === 'defense')  this.player.stats.defense  = (this.player.stats.defense  ?? 5)  + buff.amount;
      if (buff.stat === 'speedMult')this.player.stats.speed    = origSpeed * (1 + buff.amount);
      if (buff.stat === 'xpMult')   this._xpBoostMult = 1 + buff.amount;
      if (buff.stat === 'hpRegen')  this._hpRegenPerSec = buff.amount;
      this.eventBus.emit('statsChanged', this.player.stats);
      // Clear buff after duration
      setTimeout(() => {
        if (!this.player) return;
        if (buff.stat === 'attack')   this.player.stats.attack   = Math.max(1, (this.player.stats.attack  ?? 10) - buff.amount);
        if (buff.stat === 'defense')  this.player.stats.defense  = Math.max(0, (this.player.stats.defense ?? 5)  - buff.amount);
        if (buff.stat === 'speedMult')this.player.stats.speed    = origSpeed;
        if (buff.stat === 'xpMult')   this._xpBoostMult = 1.0;
        if (buff.stat === 'hpRegen')  this._hpRegenPerSec = 0;
        this.eventBus.emit('statsChanged', this.player.stats);
      }, buff.dur * 1000);
    });

    // v0.7 — Prestige unlock on Act 5 complete
    bus.on('actAdvanced', ({ id }) => {
      if (id >= 5) this.prestigeSystem?.unlock();
    });

    // v0.7 — Daily challenge rewards
    bus.on('challengeXP',   ({ amount }) => this.player?.gainXP?.(amount));
    bus.on('challengeGold',  ({ amount }) => {
      if (this.player) {
        this.player.stats.gold = (this.player.stats.gold ?? 0) + amount;
        this.eventBus.emit('statsChanged', this.player.stats);
      }
    });

    // v0.7 — Gamepad attack button
    bus.on('mobileAttack', () => this.hud?._mobileAttack?.());

    // v0.7 — Gamepad camera rotation
    bus.on('gamepadCamera', ({ dx }) => {
      if (this.camera) this.camera._yaw = (this.camera._yaw ?? 0) + dx * 0.04;
    });

    // v0.7 — Expose ACH_RARITY to HUD achievement popup
    window._achRarity = { ACH_RARITY };

    // v0.7 — Weather kill tracking for challenges + achievements
    bus.on('enemyKilled', ({ typeKey }) => {
      const weather = this.weatherSystem?.getCurrent?.();
      if (weather === 'STORM')    { bus.emit('weatherKill', { weather }); this.achievements?.track('stormKills'); }
      if (weather === 'BLIZZARD') { bus.emit('weatherKill', { weather }); this.achievements?.track('blizzardKills'); }
    });

    // v0.7 — Achievement system now uses EventBus (update constructor call)

    // v0.6 — World boss faction rewards
    bus.on('worldBossFactionGain', ({ gains }) => {
      if (!this.factionSystem) return;
      for (const [factionId, amount] of Object.entries(gains)) {
        this.factionSystem.changeRep(factionId, amount, 'World boss slain');
      }
    });

    // v0.6 — Ability bar updates
    bus.on('abilitiesChanged', (slots) => this.hud?.refreshAbilityBar(slots));

    // v0.6 — HUD log from POI events
    bus.on('hudLog', ({ msg, color }) => this.hud?.logMsg(msg, color));

    // v0.6 — Heal burst particle from well
    bus.on('healBurst', ({ x, z }) => {
      this.particles?.healBurst(x, 1.0, z);
    });

    // v0.6 — Ability visual effects
    bus.on('abilityFX', ({ type, color, x, z, radius }) => {
      if (!this.particles) return;
      if (type === 'fireball' || type === 'multishot') {
        this.particles.hitSpark(x, 0.8, z, color);
        this.particles.deathExplosion(x, 0.5, z, color);
      } else if (type === 'slam' || type === 'nova' || type === 'whirlwind' || type === 'rain') {
        this.particles.slamShockwave(x, 0, z, radius ?? 3.5);
      } else if (type === 'heal') {
        this.particles.healBurst(x, 0, z);
        this.particles.levelUpBurst(x, 0, z);
      } else if (type === 'blink') {
        this.particles.levelUpBurst(x, 0, z);
      } else if (type === 'burst' || type === 'smoke') {
        this.particles.slamShockwave(x, 0, z, 3.0);
      }
    });

    // v0.5 — Archer arrow shot
    bus.on('arrowShot', ({ fromX, fromZ, toX, toZ }) => {
      if (this.particles) {
        const mx = (fromX + toX) / 2;
        const mz = (fromZ + toZ) / 2;
        this.particles.hitSpark(mx, 0.8, mz, 0xddddaa);
      }
      this.audio?.sfxArrowShot({ x: fromX, y: 1, z: fromZ });
    });

    // v0.5 — Chest opened
    bus.on('chestOpened', ({ x, z }) => {
      if (this.particles) this.particles.levelUpBurst(x, 0.5, z);
      this.audio?.sfxChestOpen();
      this.hud?.logMsg('★ Chest opened! Loot on the floor.', '#ffcc44');
    });

    // v0.5 — Trap triggered
    bus.on('trapTriggered', ({ x, z }) => {
      this.combatSystem?.screenShake(0.35, 10);
      if (this.particles) this.particles.hitSpark(x + 0.5, 0.3, z + 0.5, 0xff2222);
      this.audio?.sfxTrapFire({ x, y: 0, z });
    });

    // v0.5 — Status effect SFX
    bus.on('statusApplied', ({ entity, key }) => {
      if (!entity?.position) return;
      const pos = { x: entity.position.x, y: 1, z: entity.position.z };
      if      (key === 'BURN')   this.audio?.sfxStatusBurn(pos);
      else if (key === 'FREEZE') this.audio?.sfxStatusFreeze(pos);
      else if (key === 'POISON') this.audio?.sfxStatusPoison(pos);
    });

    // v0.5 — Combo event
    bus.on('combo', ({ count }) => {
      this.audio?.sfxCombo(count);
      if (count >= 5) this.hud?.logMsg(`${count}× COMBO! ×${(1+(count-1)*0.05).toFixed(2)} XP`, '#ffaa22');
    });

    // v0.4 — Enemy death particle burst
    bus.on('enemyDeath', ({ x, y, z, color }) => {
      if (this.particles) this.particles.deathExplosion(x, y, z, color);
    });

    // v0.4 — Enemy killed → quest + faction tracking
    bus.on('enemyKilled', ({ typeKey, name }) => {
      this.questSystem?.onKill(name ?? typeKey);
      this.factionSystem?.onKill(typeKey);
    });

    // v0.4 — Faction events
    bus.on('factionStandingChange', ({ factionId, standing }) => {
      const colors = { HONORED:'#ffd700', FRIENDLY:'#44ff88', NEUTRAL:'#aaaaaa', HOSTILE:'#ff8800', ENEMY:'#ff2222' };
      const fnames = { HEARTHMOOR:'Hearthmoor', GUILD:'Guild', ORDER:'The Order', VOIDBORN:'Voidborn' };
      const col = colors[standing] ?? '#aaaaaa';
      this.hud?.logMsg(`${fnames[factionId] ?? factionId}: now ${standing}`, col);
    });
    bus.on('factionRepChanged', () => this.hud?.refreshFactions?.());

    // v0.4 — World event → economy event
    bus.on('worldEvent', ev => {
      this.tradeSystem?.setEconomyEvent(ev.id);
      const msg = this.tradeSystem?.getEconomyMessage();
      if (msg) this.hud?.logMsg(`Economy: ${msg}`, '#ffdd88');
    });
    bus.on('worldEventEnd', () => this.tradeSystem?.clearEconomyEvent());

    // v0.4 — Quest complete → faction
    bus.on('questComplete', q => {
      this.factionSystem?.onQuestComplete(q);
    });

    bus.on('bossKilled', name => {
      this.questSystem?.onKill(name);
      AIMemory.recordBossKill(name);
      this.achievements?.track('bosses');
      this.audio?.sfxBossDeath();
      this.storySystem?.flagSet('boss_' + name);
      this.hud?.logMsg('★ ' + name + ' DEFEATED! ★', '#dd88ff');
      this.factionSystem?.onKill(name.replace(' ', '_').toUpperCase());
      if (this.particles && this.player) {
        this.particles.deathExplosion(
          this.player.position.x, 0.5, this.player.position.z, 0xdd88ff,
        );
      }
    });

    bus.on('bossPhase', msg => {
      this.hud?.logMsg(msg, '#ff44ff');
    });

    bus.on('achievement', ach => {
      this.audio?.sfxAchieve();
      this.hud?.showAchievement(ach);
    });

    // v0.5 — Gathering events
    bus.on('gatherStart',    ({ skill }) => {
      const sdef = CONFIG.GATHERING_SKILLS[skill];
      this.hud?.logMsg(`Gathering ${sdef?.name ?? skill}…`, '#88ddaa');
    });
    bus.on('gatherStop',     ()           => this.hud?.logMsg('Stopped gathering.', '#888899'));
    bus.on('itemGathered',   ({ itemKey, skill }) => {
      const iname = CONFIG.ITEMS[itemKey]?.name ?? itemKey;
      this.hud?.logMsg(`+ ${iname}`, '#aaffcc');
      this.questSystem?.onCollect(itemKey);
    });
    bus.on('gatherXP',       ({ skill, amount }) => {
      const lvl = this.gatheringSystem?.levelFor(skill);
      this.hud?.logMsg(`${skill} +${amount} xp (lvl ${lvl})`, '#66bb88');
    });
    bus.on('gatherLevelUp',  ({ skill, level }) => {
      const sdef = CONFIG.GATHERING_SKILLS[skill];
      this.audio?.sfxLevelUp();
      this.hud?.logMsg(`⬆ ${sdef?.name ?? skill} level ${level}!`, '#88ffcc');
    });
    bus.on('nodeDepleted',   ()           => this.hud?.logMsg('Node depleted — it will respawn shortly.', '#777766'));
    bus.on('nodeRespawned',  ()           => {});  // silent
    bus.on('gatherFail',     msg          => this.hud?.logMsg(msg, '#ffaa44'));
    bus.on('rewardItem',     ({ itemKey, reason }) => {
      this.hud?.logMsg(`Reward: ${CONFIG.ITEMS[itemKey]?.name ?? itemKey} — ${reason}`, '#ffd700');
    });

    // v0.5 — Slayer events
    bus.on('slayerTaskAssigned', task => {
      this.hud?.logMsg(
        `⚔ Slayer task: Kill ${task.count} ${task.targetLabel}${task.streakBonus ? ' [STREAK BONUS!]' : ''}`,
        '#ff8844',
      );
    });
    bus.on('slayerProgress',  ({ progress, needed }) => {
      if (progress === needed - 1) this.hud?.logMsg('Almost done — one more!', '#ff8844');
    });
    bus.on('slayerTaskComplete', task => {
      this.audio?.sfxQuestGet();
      this.hud?.logMsg(`✔ Slayer task complete! +${task.pts} pts. (Total: ${this.slayerSystem?.points})`, '#ffaa22');
    });
    bus.on('slayerTaskCancelled', ()    => this.hud?.logMsg('Slayer task cancelled (-30 pts).', '#ff6666'));
    bus.on('slayerCancelFail',   msg   => this.hud?.logMsg(msg, '#ff6666'));
    bus.on('slayerShopBuy',      item  => this.hud?.logMsg(`Purchased: ${item.name}`, '#ffd700'));

    bus.on('craftedItem', () => {
      this.achievements?.track('crafts');
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

    bus.on('playerSlam', ({ x, z, range, dmg }) => {
      const origin = new THREE.Vector3(x, 0, z);
      this.enemies
        .filter(e => !e.isDead && e.position.distanceTo(origin) <= range)
        .forEach(e => e.takeDamage(dmg, this.player));
      this.audio?.sfxPlayerHit();
      this.hud?.logMsg('⚔ SLAM!', '#ff9944');
    });

    bus.on('playerFireball', ({ target, dmg }) => {
      if (!target.isDead) {
        target.takeDamage(dmg, this.player);
        this.audio?.sfxPlayerHit();
        this.hud?.logMsg('🔥 Fireball! -' + dmg, '#ff6633');
      }
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

    // v0.6 — scrolls open a lore reader and register in codex
    if (lootHit.itemKey === 'scroll') {
      const scroll = randomScroll();
      if (scroll) {
        setTimeout(() => {
          this.eventBus.emit('scrollPickedUp', { scroll });
        }, 400);
      }
    }

    // v0.6 — track bestiary on first loot pickup too
    this.codexSystem?.unlockBestiary?.(lootHit.itemKey?.toUpperCase?.());

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

    // NPC meshes — clicking an NPC opens dialogue
    const npcMeshes = [];
    const npcByMesh = new Map();
    (this.npcs || []).forEach(npc => {
      npc.group.traverse(m => {
        if (m.isMesh) {
          npcMeshes.push(m);
          npcByMesh.set(m, npc);
        }
      });
    });

    const allMeshes = [...enemyMeshes, ...shardMeshes, ...lootMeshes, ...npcMeshes];
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
      if (this.player.position.distanceTo(lootHit.mesh.position) <= 70 * TS) {
        this._pickupLoot(lootHit);
      }
      return;
    }

    // NPC? — open dialogue on click
    const clickedNPC = npcByMesh.get(hitMesh);
    if (clickedNPC) {
      this._openDialogue(clickedNPC);
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
    const wp = new THREE.Vector3(this._portalPos.x, 3.0 * TS, this._portalPos.z);
    wp.project(this.camera.threeCamera);
    if (wp.z > 1) { this._portalLabelEl.style.display = 'none'; return; }
    this._portalLabelEl.style.display = 'block';
    this._portalLabelEl.style.left    = ((wp.x *  0.5 + 0.5) * window.innerWidth)  + 'px';
    this._portalLabelEl.style.top     = ((wp.y * -0.5 + 0.5) * window.innerHeight) + 'px';
  }

  _checkPortalCollision() {
    if (this._portalUsed || !this._portalPos) return;
    if (this.player.position.distanceTo(this._portalPos) < 2 * TS) this._enterDungeon();
  }

  _updateSaltmerePortal(delta) {
    if (!this._saltmerePortalMesh) return;

    // Animate portal ring
    this._saltmerePortalMesh.rotation.z += delta * 0.7;
    if (this._saltmerePortalLight) {
      this._saltmerePortalLight.intensity = 1.6 + Math.sin(this._totalTime * 2.2) * 0.5;
    }

    // Project label
    if (this._saltmerePortalLabelEl && this._saltmerePortalPos) {
      const wp = new THREE.Vector3(this._saltmerePortalPos.x, 3.0 * TS, this._saltmerePortalPos.z);
      wp.project(this.camera.threeCamera);
      if (wp.z > 1) {
        this._saltmerePortalLabelEl.style.display = 'none';
      } else {
        this._saltmerePortalLabelEl.style.display = 'block';
        this._saltmerePortalLabelEl.style.left = ((wp.x *  0.5 + 0.5) * window.innerWidth)  + 'px';
        this._saltmerePortalLabelEl.style.top  = ((wp.y * -0.5 + 0.5) * window.innerHeight) + 'px';
      }
    }

    // Collision — enter Sunken Vaults dungeon
    if (!this._saltmerePortalUsed && this._saltmerePortalPos &&
        this.player.position.distanceTo(this._saltmerePortalPos) < 2 * TS) {
      this._enterSaltmereDungeon();
    }
  }

  _enterSaltmereDungeon() {
    if (this._saltmerePortalUsed) return;
    this._saltmerePortalUsed = true;
    this.questSystem?.onExplore();
    this.achievements?.track('dungeons');
    AIMemory.recordDungeonRun();
    this.audio?.sfxPortal();
    this.hud?.logMsg('Entering the Sunken Vaults…', '#44cccc');
    this._doSave();

    this.eventBus.emit('enterDungeon', {
      dungeonKey: 'SUNKEN_VAULTS',
      savedPlayer: {
        stats:       { ...this.player.stats },
        inventory:   { ...this.player.inventory },
        equipment:   { ...this.player.equipment },
        skills:      { ...(this.player.skills || {}) },
        playerClass: this.player.playerClass,
      },
    });
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
    const worldCtx = this._buildWorldContext();
    this.hud?.openDialogue(npc, this.player, this.questSystem, this.tradeSystem, this.worldEvents, worldCtx, this.factionSystem, this.enchantSystem, this.combatSystem, this.codexSystem);
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  _buildWorldContext() {
    return {
      time:    this.dayNight?.getTimeString() ?? '12:00 PM',
      weather: this.dayNight?.getCurrentWeather() ?? 'CLEAR',
      worldEvent: this.worldEvents?.current ?? null,
      playerLevel: this.player?.stats.level ?? 1,
      playerClass: this.player?.playerClass ?? 'WARRIOR',
      act: this.storySystem?.currentAct ?? 0,
      factionStanding: this.factionSystem ? {
        HEARTHMOOR: this.factionSystem.standingFor('HEARTHMOOR'),
        GUILD:      this.factionSystem.standingFor('GUILD'),
        ORDER:      this.factionSystem.standingFor('ORDER'),
      } : {},
    };
  }

  /**
   * Apply the permanent gameplay effect for a completed NPC chain reward.
   * @param {string}  rewardKey   Key from CONFIG.NPC_CHAINS (e.g. 'VOID_RESISTANCE')
   * @param {boolean} [silent]    True when restoring from save — skip announce
   */
  _applyChainReward(rewardKey, silent = false) {
    if (!this.player) return;
    if (!this.player.chainRewards) this.player.chainRewards = {};
    this.player.chainRewards[rewardKey] = true;

    switch (rewardKey) {
      case 'VOID_RESISTANCE':
        // 15% damage reduction vs void/wraith enemies (checked in Enemy3D deal-damage path)
        this.player._voidResist = 0.15;
        break;

      case 'MASTER_CRAFTING':
        // Unlocks advanced forge tier; checked by TradeSystem / EnchantSystem
        if (this.enchantSystem) this.enchantSystem._masterCrafting = true;
        break;

      case 'HERB_MASTERY':
        // +30% potion healing — applied when player uses a potion (Player3D._usePotion)
        this.player._herbMasteryBonus = 0.30;
        break;

      case 'GATE_FRAGMENT':
        // +10% gold from all drops (checked at enemy death gold roll)
        this.player._goldDropBonus = (this.player._goldDropBonus ?? 0) + 0.10;
        break;

      case 'VEL_BLESSING':
        // +15% attack damage vs void enemies (checked in CombatSystem.resolveHit)
        this.player._voidAttackBonus = 0.15;
        break;
    }

    if (!silent) {
      this.eventBus.emit('statsChanged', this.player.stats);
    }
  }

  async _doSave() {
    try {
      await this.saveSystem?.save({
        stats:        { ...this.player.stats },
        inventory:    { ...this.player.inventory },
        equipment:    { ...this.player.equipment },
        skills:       { ...(this.player.skills || {}) },
        playerClass:  this.player.playerClass,
        quests:       this.questSystem?.serialize()    ?? [],
        story:        this.storySystem?.serialize()    ?? {},
        shards:       this.storySystem?.shardFlags || {},
        achievements: this.achievements?.serialize() || {},
        factions:     this.factionSystem?.serialize()  ?? {},
        gathering:    this.gatheringSystem?.serialize() ?? {},
        slayer:       this.slayerSystem?.serialize()    ?? {},
        regions:      this.regionSystem?.serialize()    ?? {},
        codex:        this.codexSystem?.serialize()     ?? {},
        abilities:    this.abilitySystem?.serialize()   ?? {},
        prestige:     this.prestigeSystem?.serialize()  ?? {},
        poi:          this.poiSystem?.serialize()       ?? {},
        chainRewards: { ...(this.player.chainRewards   || {}) },
      });
    } catch (err) {
      console.error('[GameScene] Auto-save failed:', err);
      this.hud?.logMsg('Auto-save failed.', '#ff6666');
    }
  }

  // ── Keyboard handler (ESC pause) ─────────────────────────────────────────────

  _onKeyDown(e) {
    if (e.key === 'Escape') {
      // Don't interfere if any modal/dialogue is open
      if (this.hud?.invOpen || this.hud?.skillOpen || this.hud?._dlgPanel?.classList.contains('open')) {
        return;
      }
      this._paused = !this._paused;
      this.hud?.showPauseMenu(this._paused, () => {
        // Resume callback
        this._paused = false;
        this.hud?.showPauseMenu(false);
      }, () => {
        // Save & quit callback
        this._doSave().then(() => {
          this._paused = false;
          this.hud?.showPauseMenu(false);
          window.location.reload();
        });
      });
    }
  }

  // ── Main update ──────────────────────────────────────────────────────────────

  /** @param {number} delta seconds since last frame */
  update(delta) {
    if (this._disposed || !this.player) return;
    if (this._paused) return;   // game loop frozen while paused
    this._totalTime += delta;

    // Keep camera reference fresh on player
    this.player.camera = this.camera.threeCamera;

    // Player
    this.player.update(delta, this.npcs);

    // Camera follow
    this.camera.follow(this.player.position);
    this.camera.update(delta, this.input);

    // Combat zoom (lerp camera distance)
    const nearEnemy = this.enemies.some(
      e => !e.isDead && e.position.distanceTo(this.player.position) < 8 * TS,
    );
    if (nearEnemy) {
      this._combatTimer = 2.2;
      this._targetZoom  = 56;   // combat zoom-in (80 × 0.7)
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

    // Enemies — update AI, track kills, enforce safe zone
    const townCX = (MAP_W / 2) * TS + TS / 2;   // world-space centre X
    const townCZ = (MAP_H / 2) * TS + TS / 2;   // world-space centre Z
    this.enemies.forEach(e => {
      if (!e._cameraSet) {
        e.setCamera(this.camera.threeCamera);
        e._cameraSet = true;
      }
      if (e.isDead && !e._questTracked) {
        e._questTracked = true;
        // questSystem.onKill + factionSystem.onKill are handled via the 'enemyKilled' event
        AIMemory.recordKill(e._data?.name || 'enemy');
        this.achievements?.track('kills');
        this.audio?.sfxKill();
      }
      // Town safe zone — guards instantly kill any enemy that enters the perimeter
      if (!e.isDead) {
        const dx = e.position.x - townCX;
        const dz = e.position.z - townCZ;
        if (dx * dx + dz * dz < TOWN_SAFE_R * TOWN_SAFE_R) {
          if (!e._guardWarned) {
            e._guardWarned = true;
            this.hud?.logMsg('A town guard drives back the ' + (e._data?.name ?? 'enemy') + '!', '#88bbff');
          }
          // Instant kill — guards dispatch any intruder immediately
          e.stats.hp = 0;
          e._die?.(null);
        }
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

    // Torch — track player position and vary intensity with time of day.
    // At noon the torch is dim (daytime needs no extra light); at midnight it
    // burns brightly so the player can always see immediately around them.
    if (this._torchLight && this.player) {
      const TORCH_DAY_INTENSITY   = 0.6;  // minimal flicker during daytime
      const TORCH_NIGHT_BOOST     = 2.4;  // extra intensity added at midnight
      this._torchLight.position.set(
        this.player.position.x,
        this.player.position.y + 1.5,
        this.player.position.z,
      );
      const nightBlend = 1 - (this.dayNight ? this.dayNight.getDayFactor() : 0);
      this._torchLight.intensity = TORCH_DAY_INTENSITY + nightBlend * TORCH_NIGHT_BOOST;
    }

    // World events
    this.worldEvents?.update(delta);

    // v0.7 — Periodic enemy repopulation scaled to current level
    this._enemyRespawnTimer = (this._enemyRespawnTimer ?? 0) + delta;
    if (this._enemyRespawnTimer > 45) {  // every 45 seconds
      this._enemyRespawnTimer = 0;
      const dead = this.enemies.filter(e => e.isDead).length;
      if (dead > 15 && this.mapData) {
        const gen = new WorldGen();
        const toSpawn = Math.min(dead, 20);
        const spawns  = gen.getEnemySpawns(this.mapData, toSpawn);
        const allTypes= Object.keys(CONFIG.ENEMY_TYPES);
        const playerLv= this.player?.stats?.level ?? 1;
        spawns.forEach(sp => {
          const tier  = Math.min(4, Math.floor(playerLv / 5));
          const pool  = tier <= 1 ? allTypes.slice(0,4) : tier <= 2 ? allTypes.slice(0,8) : allTypes;
          const type  = pool[Math.floor(Math.random() * pool.length)];
          const e     = new Enemy3D(this.scene3d, sp.x * TS + TS / 2, sp.y * TS + TS / 2, type, this.eventBus, this.world3d);
          e.setCamera(this.camera.threeCamera);
          const scaleMult = 1 + (playerLv - 1) * 0.08;
          e.stats.hp = Math.round(e.stats.hp * scaleMult);
          e.stats.maxHp = e.stats.hp;
          e.stats.atk   = Math.round(e.stats.atk * scaleMult);
          this.enemies.push(e);
        });
      }
    }

    // v0.5 — Terrain height tracking — player smoothly follows terrain
    if (this.player && this.world3d) {
      const tp = this.world3d.worldToTile(this.player.position.x, this.player.position.z);
      const targetY = this.world3d.getHeightAt(tp.x, tp.z);
      this.player.position.y += (targetY - this.player.position.y) * Math.min(1, delta * 12);
      this.player.group.position.copy(this.player.position);
    }

    // v0.7 — Gamepad poll
    this.gamepadManager?.poll();

    // v0.7 — Apply gamepad analog movement to player
    if (this.gamepadManager?.isConnected()) {
      const mv = this.gamepadManager.getMovement();
      if (this.input && (Math.abs(mv.x) > 0 || Math.abs(mv.y) > 0)) {
        this.input._gamepadAxis = mv;
      }
    }

    // v0.7 — Weather system (lightning flicker etc)
    this.weatherSystem?.update(delta);

    // v0.7 — Apply weather player speed modifier
    if (this.weatherSystem && this.player) {
      const wsm = this.weatherSystem.getPlayerSpeedMult();
      if (this.player._weatherSpeedMult !== wsm) {
        this.player._weatherSpeedMult = wsm;
      }
    }

    // v0.6 — Ability system (mana regen + cooldown ticks)
    this.abilitySystem?.update(delta);

    // v0.6 — World boss system
    if (this.worldBossSystem) {
      this.worldBossSystem.setPlayerLevel(this.player.stats.level);
      this.worldBossSystem.update(delta);
    }
    // Expose active world boss for minimap
    this._worldBoss = this.worldBossSystem?.getActiveBoss() ?? null;

    // v0.6 — Points of Interest
    this.poiSystem?.update(delta);

    // v0.6 — HP regen (from well/shrine buff)
    if (this._hpRegenPerSec > 0 && this.player && !this.player.isDead) {
      this.player.stats.hp = Math.min(
        this.player.stats.maxHp,
        (this.player.stats.hp ?? 0) + this._hpRegenPerSec * delta,
      );
      this.eventBus.emit('statsChanged', this.player.stats);
    }

    // v0.6 — Region detection
    if (this.regionSystem && this.player) {
      this.regionSystem.update(this.player.position, delta);
    }

    // v0.5 — Combat system
    this.combatSystem?.update(delta);

    // v0.4 — Particle system
    if (this.particles) {
      this.particles.update(delta);
      this.particles.weatherFollow(this.player.position.x, this.player.position.z);
      this.particles.updateFireflyCenter(this.player.position.x, this.player.position.z);
      // Dust on movement
      const pspd = Math.hypot(this.player.velocity.x, this.player.velocity.z);
      if (pspd > 1.5 && Math.random() < 0.15) {
        this.particles.dustCloud(this.player.position.x, 0, this.player.position.z);
      }
    }

    // v0.4 — Animation system
    this.animSystem?.update(delta);

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
    this._updateSaltmerePortal(delta);

    // Footstep audio
    const spd = Math.hypot(this.player.velocity.x, this.player.velocity.z);
    if (spd > 0.5) {
      this._stepTimer -= delta;
      if (this._stepTimer <= 0) {
        this.audio?.sfxStep();
        this._stepTimer = 0.32;
      }
    }

    // v0.5 — Spatial audio listener + dynamic combat music
    if (this.audio && this.player) {
      this.audio.updateListenerPosition(
        this.player.position.x,
        this.player.position.y,
        this.player.position.z,
        this.player.group?.rotation?.y ?? 0,
      );
      // Combat music intensity based on nearby enemies
      const nearestDist = this.enemies.reduce((min, e) => {
        if (e.isDead) return min;
        return Math.min(min, e.position.distanceTo(this.player.position));
      }, Infinity);
      const combatIntensity = nearestDist < 12 ? Math.max(0, 1 - (nearestDist - 3) / 9) : 0;
      this.audio.setCombatIntensity(combatIntensity);
      this.audio.updateMusic(delta);
    }

    // Gathering system tick
    this.gatheringSystem?.update(delta);

    // Auto-save
    this._saveTimer -= delta;
    if (this._saveTimer <= 0) {
      this._saveTimer = 30;
      this._doSave();
    }

    // HUD per-frame refresh
    this.hud?.update(this);

    // v0.9 — Co-op: send local state, tick remote player avatars
    this._updateCoop(delta);

    // Render
    this.renderer.render(this.scene3d, this.camera.threeCamera);

    // Flush input per-frame state
    this.input.update();
  }

  // ── Co-op ─────────────────────────────────────────────────────────────────────

  /**
   * Initialise CoopClient, wire EventBus listeners for all co-op events,
   * and connect if the menu set a pending _coopIntent before the game started.
   */
  _initCoop() {
    this.coop = new CoopClient(this.eventBus);

    if (!this._busSubs) this._busSubs = [];

    // ── Incoming peer events ───────────────────────────────────────────────

    const onPeerState = ({ from, state }) => this._upsertRemotePlayer(from, state);

    const onPeerLeft = ({ playerId }) => {
      const rp = this.remotePlayers.get(playerId);
      const name = rp?._playerName ?? 'A companion';
      this._removeRemotePlayer(playerId);
      this.hud?.logMsg(`${name} left the session.`, '#aaaaff');
    };

    const onPeerEvent = ({ from, eventType, payload }) =>
      this._handlePeerGameEvent(from, eventType, payload);

    const onHosted = ({ code }) => {
      this.hud?.logMsg(`Co-op session open — share code: ${code}`, '#44ffaa');
    };

    const onJoined = ({ roster }) => {
      this.hud?.logMsg(`Joined co-op! Players: ${roster.map(r => r.name).join(', ')}`, '#44ffaa');
      // Close the modal if it is still visible
      const modal = document.getElementById('coop-modal');
      if (modal) modal.style.display = 'none';
    };

    const onRoster = (roster) => {
      this.hud?.logMsg(`Party: ${roster.map(r => r.name).join(', ')}`, '#88ccff');
    };

    const onDisconnected = () => {
      this.hud?.logMsg('Co-op disconnected.', '#ff8844');
    };

    const onCoopError = (msg) => {
      this.hud?.logMsg(`Co-op: ${msg}`, '#ff4444');
      const statusEl = document.getElementById('coop-status');
      if (statusEl) statusEl.textContent = msg;
    };

    this.eventBus.on('coop:hosted',      onHosted);
    this.eventBus.on('coop:joined',      onJoined);
    this.eventBus.on('coop:roster',      onRoster);
    this.eventBus.on('coop:peerState',   onPeerState);
    this.eventBus.on('coop:peerLeft',    onPeerLeft);
    this.eventBus.on('coop:peerEvent',   onPeerEvent);
    this.eventBus.on('coop:disconnected', onDisconnected);
    this.eventBus.on('coop:error',       onCoopError);

    this._busSubs.push(
      ['coop:hosted',       onHosted],
      ['coop:joined',       onJoined],
      ['coop:roster',       onRoster],
      ['coop:peerState',    onPeerState],
      ['coop:peerLeft',     onPeerLeft],
      ['coop:peerEvent',    onPeerEvent],
      ['coop:disconnected', onDisconnected],
      ['coop:error',        onCoopError],
    );

    // ── Outgoing: broadcast local game events to peers ─────────────────────

    const onLevelUp = (level) => {
      this.coop?.sendEvent('levelUp', { level });
    };
    const onPlayerDead = () => {
      this.coop?.sendEvent('death', {});
    };

    this.eventBus.on('levelUp',    onLevelUp);
    this.eventBus.on('playerDead', onPlayerDead);
    this._busSubs.push(['levelUp', onLevelUp], ['playerDead', onPlayerDead]);

    // ── Expose connection callback for the menu modal ─────────────────────

    window._gameCoopConnect = (intent) => {
      const name = this.player?.stats?.name ?? 'Adventurer';
      const statusEl = document.getElementById('coop-status');

      if (intent.mode === 'host') {
        this.coop.host(intent.serverUrl, name)
          .catch(err => { if (statusEl) statusEl.textContent = `Failed: ${err.message}`; });
      } else {
        this.coop.join(intent.serverUrl, name, intent.code)
          .catch(err => { if (statusEl) statusEl.textContent = `Failed: ${err.message}`; });
      }
    };

    // If the player clicked Host/Join before the game was fully started,
    // the menu stored a pending intent — handle it now.
    if (window._coopIntent) {
      window._gameCoopConnect(window._coopIntent);
      window._coopIntent = null;
    }
  }

  /**
   * Called every frame from update().
   * Sends the local player's state to all peers (throttled inside CoopClient).
   * Also calls update() on every remote player avatar.
   * @param {number} delta
   */
  _updateCoop(delta) {
    if (!this.coop?.isConnected || !this.player) return;

    // Send local state (CoopClient throttles internally to 20 Hz)
    this.coop.sendState({
      x:     this.player.position.x,
      y:     this.player.position.y,
      z:     this.player.position.z,
      ry:    this.player.group.rotation.y,
      hp:    this.player.stats.hp,
      maxHp: this.player.stats.maxHp,
      anim:  Math.hypot(this.player.velocity.x, this.player.velocity.z) > 0.5 ? 'walk' : 'idle',
      cls:   this.player.playerClass,
      name:  this.player.stats.name ?? 'Hero',
      level: this.player.stats.level,
    });

    // Update remote player avatars
    this.remotePlayers.forEach(rp => rp.update(delta));
  }

  /**
   * Create or update the RemotePlayer3D avatar for a peer.
   * @param {string} peerId
   * @param {object} state
   */
  _upsertRemotePlayer(peerId, state) {
    let rp = this.remotePlayers.get(peerId);
    if (!rp) {
      rp = new RemotePlayer3D(
        this.scene3d,
        this.camera.threeCamera,
        state.cls  ?? 'WARRIOR',
        state.name ?? 'Adventurer',
      );
      // Teleport directly to first known position (no interpolation on spawn)
      if (state.x !== undefined) {
        rp.position.set(state.x, state.y ?? 0, state.z);
        rp._targetPos.copy(rp.position);
        rp.group.position.copy(rp.position);
      }
      this.remotePlayers.set(peerId, rp);
      this.hud?.logMsg(`${state.name ?? 'Adventurer'} entered the world!`, '#44ffaa');
    }
    rp.applyState(state);
  }

  /**
   * Dispose the RemotePlayer3D avatar for a peer who disconnected.
   * @param {string} peerId
   */
  _removeRemotePlayer(peerId) {
    const rp = this.remotePlayers.get(peerId);
    if (!rp) return;
    rp.dispose();
    this.remotePlayers.delete(peerId);
  }

  /**
   * Handle a game-logic event from a peer (attack, death, level-up, chat).
   * @param {string} from       Sender's playerId
   * @param {string} eventType
   * @param {object} payload
   */
  _handlePeerGameEvent(from, eventType, payload) {
    const rp = this.remotePlayers.get(from);

    switch (eventType) {
      case 'damage':
        // Show a floating number at the peer's current position
        if (payload && rp) {
          this.eventBus.emit('damage',
            rp.position.x, rp.position.y, payload.dmg ?? '?', '#44ccff');
        }
        break;

      case 'death':
        rp?.setDead();
        this.hud?.logMsg(`${rp?._playerName ?? 'Companion'} has fallen!`, '#ff6666');
        break;

      case 'respawn':
        rp?.setAlive(payload);
        this.hud?.logMsg(`${rp?._playerName ?? 'Companion'} has respawned.`, '#88ff88');
        break;

      case 'levelUp':
        this.hud?.logMsg(
          `${rp?._playerName ?? 'Companion'} reached level ${payload?.level ?? '?'}!`,
          '#ffdd44',
        );
        // Brief emissive flash on their avatar
        if (rp) {
          rp.group.traverse(obj => {
            if (!obj.isMesh || !obj.material?.emissive) return;
            obj.material.emissive.setHex(0xffff00);
            setTimeout(() => { if (obj.material?.emissive) obj.material.emissive.setHex(0x000000); }, 300);
          });
        }
        break;

      case 'chatMsg':
        if (payload?.text) {
          const name = rp?._playerName ?? 'Companion';
          this.hud?.logMsg(`[Co-op] ${name}: ${payload.text}`, '#88ffcc');
        }
        break;
    }
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────────

  dispose() {
    if (this._disposed) return;
    this._disposed = true;

    this.renderer.canvas.removeEventListener('click', this._onCanvasClick);
    window.removeEventListener('keydown', this._onKeyDown);

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

    // Town guard meshes
    this._guardMeshes?.forEach(g => {
      this.scene3d.remove(g);
      g.traverse(obj => {
        if (!obj.isMesh) return;
        obj.geometry?.dispose();
        obj.material?.dispose();
      });
    });
    this._guardMeshes = [];

    this.townBuilder?.dispose(this.scene3d);
    this.townBuilder = null;

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

    if (this._saltmerePortalMesh) {
      this.scene3d.remove(this._saltmerePortalMesh);
      this._saltmerePortalMesh.geometry.dispose();
      this._saltmerePortalMesh.material.dispose();
    }
    if (this._saltmerePortalLight) {
      this.scene3d.remove(this._saltmerePortalLight);
      this._saltmerePortalLight.dispose();
    }
    this._saltmerePortalLabelEl?.parentNode?.removeChild(this._saltmerePortalLabelEl);

    if (this._torchLight) {
      this.scene3d.remove(this._torchLight);
      this._torchLight.dispose();
      this._torchLight = null;
    }

    this.particles?.dispose();
    this.animSystem?.dispose();
    this.combatSystem?.dispose();
    this.poiSystem?.dispose();
    this.abilitySystem?.dispose();
    this.worldBossSystem?.dispose();
    this.gamepadManager?.dispose();

    this.world3d?.dispose();

    clearInterval(this._saveInterval);

    // v0.9 — Co-op: dispose remote avatars and close WebSocket
    this.remotePlayers.forEach(rp => rp.dispose());
    this.remotePlayers.clear();
    this.coop?.disconnect();
    this.coop = null;
    window._gameCoopConnect = null;

    // Unsubscribe all EventBus listeners registered during _setupEvents()
    // and slayer-kill wiring, so disposed scene doesn't ghost-fire on new ones.
    this._busSubs?.forEach(([ev, cb]) => this.eventBus.off(ev, cb));
    this._busSubs = [];
  }
}
