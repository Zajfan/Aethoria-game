/**
 * WorldBossSystem.js — Aethoria v0.6
 *
 * Spawns open-world boss encounters triggered by world events and
 * player progression milestones. World bosses appear on the minimap
 * and are announced with a screen-wide banner.
 *
 * World bosses:
 *   VOID_TITAN     — spawns on void_rift world event, level 15+ required
 *   ANCIENT_DRAKE  — spawns near Ashveil after player kills 50 enemies
 *   BONE_COLOSSUS  — spawns on dark_eclipse, level 10+ required
 *   MARSH_LEVIATHAN— spawns in Whispering Marshes region on player first visit
 *
 * Mechanics:
 *   - World boss health pools are 3-5× normal bosses
 *   - Telegraphed 30 seconds before spawn with HUD warning
 *   - Drops guaranteed legendary or epic loot
 *   - Grants massive XP and faction rep on kill
 *   - Respawns after 10 real-time minutes
 *   - Shown as pulsing red dot on minimap
 */

import { THREE }   from '../engine/Renderer.js';
import { CONFIG }  from '../config.js';
import { Boss3D }  from '../entities/Boss3D.js';
import { AIMemory } from './AIMemory.js';

// ── World boss definitions ────────────────────────────────────────────────────

const WORLD_BOSS_DEFS = {
  VOID_TITAN: {
    id:        'VOID_TITAN',
    name:      'The Void Titan',
    bossType:  'VOID_KNIGHT',      // underlying Boss3D type
    hpMult:    4.0,
    xpBonus:   2000,
    color:     0x8800ff,
    announceMsg: '⚠ A rift tears open — THE VOID TITAN emerges from the darkness!',
    loot:      ['crystal','crystal','voidblade','soulstone','gem'],
    factionGain: { ORDER: 80, HEARTHMOOR: 60 },
    trigger:   'void_rift',
    minLevel:  15,
    // Spawns NE of map centre near Ashveil
    spawnOffset: { ox: 60, oz: -50 },
  },
  ANCIENT_DRAKE: {
    id:        'ANCIENT_DRAKE',
    name:      'Ancient Void Drake',
    bossType:  'STONE_COLOSSUS',
    hpMult:    3.5,
    xpBonus:   1800,
    color:     0xff4400,
    announceMsg: '🔥 The ancient drake descends from Ashveil — its shadow darkens the land!',
    loot:      ['dragonscale','dragonscale','dragonhide','soulreaper','gem'],
    factionGain: { IRONFANG: 60, GUILD: 50 },
    trigger:   'kills',
    killThreshold: 50,
    spawnOffset: { ox: 70, oz: -60 },
  },
  BONE_COLOSSUS: {
    id:        'BONE_COLOSSUS',
    name:      'The Bone Colossus',
    bossType:  'STONE_COLOSSUS',
    hpMult:    3.0,
    xpBonus:   1500,
    color:     0xddddaa,
    announceMsg: '💀 The Bone Colossus stirs in the dark eclipse — an army of the dead follows!',
    loot:      ['crystal','voidessence','runeshield','gem','soulstone'],
    factionGain: { ORDER: 70, HEARTHMOOR: 50 },
    trigger:   'dark_eclipse',
    minLevel:  10,
    spawnOffset: { ox: -30, oz: -40 },
  },
  MARSH_LEVIATHAN: {
    id:        'MARSH_LEVIATHAN',
    name:      'Marsh Leviathan',
    bossType:  'VOID_KNIGHT',
    hpMult:    3.2,
    xpBonus:   1600,
    color:     0x44aacc,
    announceMsg: '🌊 Something vast rises from the Whispering Marshes — flee or fight!',
    loot:      ['crystal','voidessence','deathbow','soulstone','gem'],
    factionGain: { VERDANT_FLAME: 80, GUILD: 40 },
    trigger:   'region',
    triggerRegion: 'WHISPERING',
    spawnOffset: { ox: 50, oz: 60 },
  },
};

// ── WorldBossSystem ───────────────────────────────────────────────────────────

export class WorldBossSystem {
  /**
   * @param {THREE.Scene} scene3d
   * @param {THREE.Camera} camera
   * @param {EventBus} eventBus
   */
  constructor(scene3d, camera, eventBus) {
    this._scene   = scene3d;
    this._camera  = camera;
    this._bus     = eventBus;
    this._bosses  = new Map();  // id → { boss3d, def, alive, respawnTimer }
    this._active  = null;       // currently active world boss (for GameScene reference)
    this._killed  = new Set();  // permanently killed (for session)
    this._totalKills = 0;

    this._labelEl = null;
    this._bannerEl = null;
    this._buildBanner();

    // Wire events
    if (eventBus) {
      eventBus.on('worldEvent',   ev   => this._onWorldEvent(ev));
      eventBus.on('regionEntered',({ region }) => this._onRegion(region));
      eventBus.on('enemyKilled',  ()   => { this._totalKills++; this._checkKillThreshold(); });
    }
  }

  // ── Banner UI ─────────────────────────────────────────────────────────────

  _buildBanner() {
    const el = document.createElement('div');
    el.id = 'world-boss-banner';
    el.style.cssText = `
      position:fixed; top:25%; left:50%; transform:translateX(-50%) scale(0.8);
      background:rgba(30,0,0,0.95); border:2px solid #cc0000;
      border-radius:6px; padding:16px 32px; z-index:9000;
      font-family:'Courier New',monospace; text-align:center;
      pointer-events:none; opacity:0;
      transition:opacity 0.4s, transform 0.4s;
      box-shadow: 0 0 40px rgba(200,0,0,0.6);
      min-width:320px;
    `;
    document.body.appendChild(el);
    this._bannerEl = el;
  }

  _showBanner(def, countdown = 30) {
    if (!this._bannerEl) return;
    this._bannerEl.innerHTML = `
      <div style="font-size:10px;color:#cc4444;letter-spacing:3px;margin-bottom:6px;">⚠ WORLD BOSS ⚠</div>
      <div style="font-size:16px;color:#ff4444;margin-bottom:4px;">${def.name}</div>
      <div style="font-size:10px;color:#aa6666;">${def.announceMsg}</div>
      <div style="font-size:11px;color:#cc8888;margin-top:8px;">Spawning in <span id="wb-countdown">${countdown}</span>s</div>
    `;
    this._bannerEl.style.opacity = '1';
    this._bannerEl.style.transform = 'translateX(-50%) scale(1)';

    let remaining = countdown;
    const tick = setInterval(() => {
      remaining--;
      const el = document.getElementById('wb-countdown');
      if (el) el.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(tick);
        this._bannerEl.style.opacity = '0';
        this._bannerEl.style.transform = 'translateX(-50%) scale(0.85)';
      }
    }, 1000);
  }

  // ── Spawn ─────────────────────────────────────────────────────────────────

  spawnBoss(defId, cx, cz) {
    const def = WORLD_BOSS_DEFS[defId];
    if (!def) return;
    if (this._bosses.has(defId)) return; // already spawned

    const tx = cx + (def.spawnOffset?.ox ?? 0);
    const tz = cz + (def.spawnOffset?.oz ?? 0);
    const wx = Math.max(4, Math.min(252, tx)) + 0.5;
    const wz = Math.max(4, Math.min(252, tz)) + 0.5;

    // 30s warning then spawn
    this._showBanner(def, 30);
    this._bus?.emit('hudLog', { msg: def.announceMsg, color: '#ff4444' });
    AIMemory.recordWorldEvent('World Boss: ' + def.name);

    setTimeout(() => {
      // Create Boss3D with multiplied HP
      const boss = new Boss3D(this._scene, wx, wz, def.bossType, this._bus, null);
      boss.setCamera(this._camera);

      // Scale HP
      boss.stats.hp    = Math.round(boss.stats.hp    * def.hpMult);
      boss.stats.maxHp = boss.stats.hp;
      boss.stats.atk   = Math.round(boss.stats.atk   * 1.5);

      // Override loot + XP via die hook
      const originalDie = boss._die?.bind(boss);
      boss._die = (killer) => {
        originalDie?.(killer);
        this._onWorldBossKilled(defId, def, killer, { x: wx, z: wz });
      };

      this._bosses.set(defId, { boss, def, alive: true });
      this._active = boss;
      this._bus?.emit('worldBossSpawned', { defId, name: def.name, boss });
      this._bus?.emit('hudLog', { msg: `☠ ${def.name} has appeared!`, color: '#ff2222' });
    }, 30000);
  }

  _onWorldBossKilled(defId, def, killer, pos) {
    this._bosses.delete(defId);
    this._active = null;
    this._killed.add(defId);

    // Drop loot
    def.loot?.forEach((itemKey, i) => {
      const angle = (i / def.loot.length) * Math.PI * 2;
      this._bus?.emit('spawnLoot', {
        x: pos.x + Math.cos(angle) * 2, y: 0.3,
        z: pos.z + Math.sin(angle) * 2, itemKey,
      });
    });

    // Grant XP
    if (killer) killer.gainXP(def.xpBonus);

    // Faction rep
    if (def.factionGain) {
      this._bus?.emit('worldBossFactionGain', { gains: def.factionGain });
    }

    // Victory banner
    if (this._bannerEl) {
      this._bannerEl.innerHTML = `
        <div style="font-size:10px;color:#44ff44;letter-spacing:3px;margin-bottom:6px;">★ WORLD BOSS SLAIN ★</div>
        <div style="font-size:16px;color:#44ff88;margin-bottom:4px;">${def.name}</div>
        <div style="font-size:10px;color:#66aa66;">+${def.xpBonus} XP · Legendary loot dropped!</div>
      `;
      this._bannerEl.style.opacity    = '1';
      this._bannerEl.style.transform  = 'translateX(-50%) scale(1)';
      this._bannerEl.style.borderColor = '#00cc44';
      this._bannerEl.style.boxShadow   = '0 0 40px rgba(0,200,60,0.5)';
      setTimeout(() => {
        this._bannerEl.style.opacity   = '0';
        this._bannerEl.style.transform = 'translateX(-50%) scale(0.85)';
        this._bannerEl.style.borderColor = '#cc0000';
        this._bannerEl.style.boxShadow   = '0 0 40px rgba(200,0,0,0.6)';
      }, 5000);
    }

    this._bus?.emit('hudLog', { msg: `★ ${def.name} slain! +${def.xpBonus} XP`, color: '#44ff88' });
    AIMemory.recordBossKill(def.name);
  }

  // ── Triggers ─────────────────────────────────────────────────────────────

  _onWorldEvent(ev) {
    const cx = 128, cz = 128;
    for (const [id, def] of Object.entries(WORLD_BOSS_DEFS)) {
      if (def.trigger === ev.id && !this._killed.has(id)) {
        const playerLevel = this._playerLevel ?? 1;
        if (def.minLevel && playerLevel < def.minLevel) continue;
        this.spawnBoss(id, cx, cz);
        break; // one boss per event
      }
    }
  }

  _onRegion(region) {
    const cx = 128, cz = 128;
    for (const [id, def] of Object.entries(WORLD_BOSS_DEFS)) {
      if (def.trigger === 'region' && def.triggerRegion === region.id && !this._killed.has(id)) {
        this.spawnBoss(id, cx, cz);
        break;
      }
    }
  }

  _checkKillThreshold() {
    const cx = 128, cz = 128;
    for (const [id, def] of Object.entries(WORLD_BOSS_DEFS)) {
      if (def.trigger === 'kills' && !this._killed.has(id)) {
        const playerLevel = this._playerLevel ?? 1;
        if (this._totalKills >= (def.killThreshold ?? 50)) {
          this.spawnBoss(id, cx, cz);
        }
      }
    }
  }

  // ── Player level tracking ─────────────────────────────────────────────────

  setPlayerLevel(lv) { this._playerLevel = lv; }

  // ── Update loop ───────────────────────────────────────────────────────────

  update(delta) {
    for (const [id, entry] of this._bosses) {
      if (entry.boss && !entry.boss.isDead) {
        entry.boss.update(delta, this._player);
      }
    }
  }

  setPlayer(player) { this._player = player; }

  getActiveBoss() { return this._active; }

  dispose() {
    this._bannerEl?.remove();
    for (const { boss } of this._bosses.values()) {
      boss?.dispose?.();
    }
    this._bosses.clear();
  }
}
