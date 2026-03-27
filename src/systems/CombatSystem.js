/**
 * CombatSystem.js  — Aethoria v0.5
 *
 * Adds depth to every fight:
 *  • Status effects  : BURN, POISON, FREEZE, STUN, BLEED, VOID_CURSE
 *  • Screen shake    : pooled CSS transform on the canvas wrapper
 *  • Hit reactions   : brief stagger animation + flash on any entity
 *  • Combo counter   : tracks rapid consecutive kills → XP multiplier
 *  • Damage types    : PHYSICAL, FIRE, POISON, ICE, VOID (for resistances later)
 *
 * Usage
 * ──────
 *  const combat = new CombatSystem(eventBus, renderer);
 *  combat.applyStatus(enemy, 'BURN', { source: player });
 *  combat.screenShake(0.3, 8);   // intensity, frames
 *  combat.update(delta);         // call every frame
 */

import { THREE } from '../engine/Renderer.js';

// ── Status effect definitions ─────────────────────────────────────────────────

export const STATUS = Object.freeze({
  BURN:       'BURN',
  POISON:     'POISON',
  FREEZE:     'FREEZE',
  STUN:       'STUN',
  BLEED:      'BLEED',
  VOID_CURSE: 'VOID_CURSE',
});

const STATUS_DEF = {
  BURN: {
    color:      '#ff5500',
    cssColor:   '#ff5500',
    emissive:   0xff2200,
    tickMs:     600,
    maxStacks:  3,
    duration:   5000,
    dot:        true,   // deals damage over time
    dotMult:    0.12,   // fraction of entity max HP per tick
    label:      '🔥',
    desc:       'On fire — taking damage each second',
  },
  POISON: {
    color:      '#44cc44',
    cssColor:   '#44cc44',
    emissive:   0x00aa00,
    tickMs:     900,
    maxStacks:  5,
    duration:   8000,
    dot:        true,
    dotMult:    0.06,
    label:      '☠',
    desc:       'Poisoned — damage over time, slows healing',
  },
  FREEZE: {
    color:      '#44ccff',
    cssColor:   '#44ccff',
    emissive:   0x0088ff,
    tickMs:     0,
    maxStacks:  1,
    duration:   2800,
    dot:        false,
    slowMult:   0,      // 0 = fully stopped
    label:      '❄',
    desc:       'Frozen — cannot move',
  },
  STUN: {
    color:      '#ffdd00',
    cssColor:   '#ffdd00',
    emissive:   0xaaaa00,
    tickMs:     0,
    maxStacks:  1,
    duration:   1500,
    dot:        false,
    label:      '💫',
    desc:       'Stunned — cannot act',
  },
  BLEED: {
    color:      '#cc2222',
    cssColor:   '#cc2222',
    emissive:   0x880000,
    tickMs:     500,
    maxStacks:  4,
    duration:   6000,
    dot:        true,
    dotMult:    0.04,
    label:      '🩸',
    desc:       'Bleeding — rapid damage',
  },
  VOID_CURSE: {
    color:      '#9900ee',
    cssColor:   '#9900ee',
    emissive:   0x550099,
    tickMs:     1200,
    maxStacks:  2,
    duration:   10000,
    dot:        true,
    dotMult:    0.08,
    defDebuff:  0.25,   // -25% defence
    label:      '👁',
    desc:       'Void-cursed — weakened defence, soul damage',
  },
};

// ── Damage types ──────────────────────────────────────────────────────────────

export const DMG = Object.freeze({
  PHYSICAL: 'PHYSICAL',
  FIRE:     'FIRE',
  POISON:   'POISON',
  ICE:      'ICE',
  VOID:     'VOID',
  HEAL:     'HEAL',
});

// ── Screen shake ─────────────────────────────────────────────────────────────

class ScreenShaker {
  constructor() {
    this._intensity = 0;
    this._decay     = 18;   // intensity units/sec
    this._canvas    = null;
  }

  attach(canvas) {
    this._canvas = canvas;
  }

  trigger(intensity = 0.25, durationFrames = 10) {
    this._intensity = Math.max(this._intensity, intensity);
  }

  update(delta) {
    if (this._intensity <= 0 || !this._canvas) return;
    const ox = (Math.random() - 0.5) * this._intensity * 14;
    const oy = (Math.random() - 0.5) * this._intensity * 14;
    this._canvas.style.transform = `translate(${ox.toFixed(1)}px, ${oy.toFixed(1)}px)`;
    this._intensity = Math.max(0, this._intensity - this._decay * delta);
    if (this._intensity <= 0) {
      this._canvas.style.transform = '';
    }
  }
}

// ── Per-entity status tracker ─────────────────────────────────────────────────

class EntityStatus {
  constructor(entity) {
    this.entity  = entity;
    this.effects = {};     // statusKey → { stacks, remainingMs, tickTimer, source }
    this._origMaterials = new Map();  // mesh uuid → original emissive color
  }

  has(key)    { return !!this.effects[key]; }
  stacks(key) { return this.effects[key]?.stacks ?? 0; }

  apply(key, opts = {}) {
    const def = STATUS_DEF[key];
    if (!def) return;

    if (this.effects[key]) {
      // Refresh duration, add stack up to max
      this.effects[key].remainingMs = def.duration;
      this.effects[key].stacks      = Math.min(def.maxStacks, this.effects[key].stacks + 1);
    } else {
      this.effects[key] = {
        stacks:      1,
        remainingMs: def.duration,
        tickTimer:   def.tickMs,
        source:      opts.source ?? null,
      };
    }

    // Apply visual tint to entity mesh
    this._tintEntity(def.emissive, key);

    // FREEZE / STUN — stop velocity immediately
    if (key === STATUS.FREEZE || key === STATUS.STUN) {
      if (this.entity.velocity) this.entity.velocity.set(0, 0, 0);
    }
  }

  clear(key) {
    if (!this.effects[key]) return;
    delete this.effects[key];
    this._restoreTint(key);
    // Restore velocity on FREEZE thaw
    if (key === STATUS.FREEZE && this.entity.stats?.spd) {
      // velocity restoration is handled by the entity's own AI
    }
  }

  clearAll() {
    for (const key of Object.keys(this.effects)) this.clear(key);
  }

  /**
   * @param {number} delta  seconds
   * @param {EventBus} bus
   * @returns {string[]} expired effect keys
   */
  update(delta, bus) {
    const expired = [];

    for (const [key, eff] of Object.entries(this.effects)) {
      const def = STATUS_DEF[key];
      eff.remainingMs -= delta * 1000;

      // DoT tick
      if (def.dot && def.tickMs > 0) {
        eff.tickTimer -= delta * 1000;
        if (eff.tickTimer <= 0) {
          eff.tickTimer = def.tickMs;
          const maxHp = this.entity.stats?.maxHp ?? this.entity.stats?.hp ?? 100;
          const dmg   = Math.max(1, Math.round(maxHp * def.dotMult * eff.stacks));
          this.entity.stats.hp = Math.max(0, (this.entity.stats.hp ?? 0) - dmg);
          bus?.emit('damage',
            this.entity.position?.x ?? 0,
            this.entity.position?.y ?? 0,
            dmg,
            def.cssColor,
          );
          if (this.entity.stats.hp <= 0 && !this.entity.isDead) {
            this.entity.isDead = true;
            this.entity._die?.(eff.source);
          }
        }
      }

      // FREEZE immobilise
      if (key === STATUS.FREEZE && this.entity.velocity) {
        this.entity.velocity.set(0, 0, 0);
      }

      if (eff.remainingMs <= 0) {
        expired.push(key);
        this.clear(key);
      }
    }

    return expired;
  }

  // ── Visual tinting ──────────────────────────────────────────────────────────

  _tintEntity(emissiveHex, key) {
    if (!this.entity.group) return;
    this.entity.group.traverse(obj => {
      if (!obj.isMesh || !obj.material) return;
      // Save original emissive
      if (!this._origMaterials.has(obj.uuid + key)) {
        this._origMaterials.set(obj.uuid + key, {
          emissive:          obj.material.emissive?.clone() ?? new THREE.Color(0),
          emissiveIntensity: obj.material.emissiveIntensity ?? 0,
        });
      }
      obj.material.emissive?.setHex(emissiveHex);
      obj.material.emissiveIntensity = 0.55;
    });
  }

  _restoreTint(key) {
    if (!this.entity.group) return;
    this.entity.group.traverse(obj => {
      if (!obj.isMesh || !obj.material) return;
      const saved = this._origMaterials.get(obj.uuid + key);
      if (saved) {
        obj.material.emissive?.copy(saved.emissive);
        obj.material.emissiveIntensity = saved.emissiveIntensity;
        this._origMaterials.delete(obj.uuid + key);
      }
    });
  }

  getActiveList() {
    return Object.entries(this.effects).map(([key, eff]) => ({
      key,
      label:       STATUS_DEF[key]?.label ?? key,
      stacks:      eff.stacks,
      remainingMs: eff.remainingMs,
    }));
  }
}

// ── Combo counter ─────────────────────────────────────────────────────────────

class ComboCounter {
  constructor(bus) {
    this._bus       = bus;
    this._count     = 0;
    this._timer     = 0;
    this._window    = 4.5;  // seconds to land next kill to extend combo
    this._el        = null;
    this._buildEl();
  }

  _buildEl() {
    const el = document.createElement('div');
    el.id = 'combo-counter';
    el.style.cssText = `
      position: fixed; right: 24px; top: 50%;
      transform: translateY(-50%) scale(0);
      font-family: 'Courier New', monospace;
      font-size: 22px; font-weight: bold;
      color: #fff; text-shadow: 0 0 12px #ff9900, 1px 1px 2px #000;
      pointer-events: none; z-index: 8500;
      transition: transform 0.1s cubic-bezier(0.34,1.56,0.64,1);
    `;
    document.body.appendChild(el);
    this._el = el;
  }

  onKill() {
    this._count++;
    this._timer = this._window;

    if (this._count >= 2) {
      this._el.textContent = `${this._count}× COMBO`;
      this._el.style.transform = 'translateY(-50%) scale(1)';
      // Color ramp
      const hue = Math.min(60, (this._count - 2) * 8);
      this._el.style.color = `hsl(${30 + hue}, 100%, 65%)`;
      this._bus?.emit('combo', { count: this._count });
    }
  }

  getMultiplier() {
    // +5% XP per combo hit above 2, capped at +50%
    if (this._count < 2) return 1;
    return Math.min(1.5, 1 + (this._count - 1) * 0.05);
  }

  update(delta) {
    if (this._count === 0) return;
    this._timer -= delta;
    if (this._timer <= 0) {
      this._count = 0;
      this._el.style.transform = 'translateY(-50%) scale(0)';
    }
  }

  dispose() { this._el?.remove(); }
}

// ── CombatSystem (main export) ────────────────────────────────────────────────

export class CombatSystem {
  /**
   * @param {EventBus}  eventBus
   * @param {Renderer}  renderer   For canvas access (screen shake)
   */
  constructor(eventBus, renderer) {
    this._bus     = eventBus;
    this._shaker  = new ScreenShaker();
    this._combo   = new ComboCounter(eventBus);
    this._statuses = new Map();  // entity → EntityStatus

    if (renderer?.canvas) {
      this._shaker.attach(renderer.canvas);
    }

    // Wire EventBus
    if (eventBus) {
      eventBus.on('enemyKilled', () => {
        this._combo.onKill();
        this._shaker.trigger(0.08, 6);
      });
      eventBus.on('playerDead', () => this._shaker.trigger(0.5, 20));
      eventBus.on('bossPhase',  () => this._shaker.trigger(0.6, 25));
      eventBus.on('damage', (_x, _y, amount) => {
        if (typeof amount === 'number' && amount > 20) {
          this._shaker.trigger(Math.min(0.4, amount / 80), 8);
        }
      });

      // Voidborn unlock: 10% chance to apply VOID_CURSE on hit
      eventBus.on('playerAttack', ({ target, player }) => {
        if (Math.random() < 0.10) {
          this.applyStatus(target, STATUS.VOID_CURSE, { source: player });
        }
      });
    }
  }

  // ── Status effect API ───────────────────────────────────────────────────────

  /**
   * Apply a status effect to any entity.
   * @param {object}  entity     Must have: stats.hp, stats.maxHp, position, group
   * @param {string}  statusKey  One of STATUS.*
   * @param {object}  [opts]     { source, duration, dotMult }
   */
  applyStatus(entity, statusKey, opts = {}) {
    if (!entity || entity.isDead) return;
    let tracker = this._statuses.get(entity);
    if (!tracker) {
      tracker = new EntityStatus(entity);
      this._statuses.set(entity, tracker);
    }
    tracker.apply(statusKey, opts);

    const def = STATUS_DEF[statusKey];
    this._bus?.emit('statusApplied', {
      entity, key: statusKey, label: def?.label ?? statusKey,
    });
    // particle hint via event bus
    this._bus?.emit('statusParticle', {
      x: entity.position?.x ?? 0,
      y: 0.5,
      z: entity.position?.z ?? 0,
      color: def?.emissive ?? 0xffffff,
    });
  }

  clearStatus(entity, statusKey) {
    this._statuses.get(entity)?.clear(statusKey);
  }

  hasStatus(entity, statusKey) {
    return this._statuses.get(entity)?.has(statusKey) ?? false;
  }

  isImmobilised(entity) {
    const t = this._statuses.get(entity);
    return t ? (t.has(STATUS.FREEZE) || t.has(STATUS.STUN)) : false;
  }

  getActiveStatuses(entity) {
    return this._statuses.get(entity)?.getActiveList() ?? [];
  }

  // ── Weapon-type → status chance ────────────────────────────────────────────

  /**
   * Called after a melee/ranged hit — rolls weapon-based status procs.
   * @param {object} attacker  Player or enemy entity
   * @param {object} target
   * @param {string} [weaponKey]  Item key of equipped weapon
   */
  rollStatusProc(attacker, target, weaponKey) {
    const procs = {
      staff:  [{ status: STATUS.BURN,   chance: 0.25 }],
      bow:    [{ status: STATUS.BLEED,  chance: 0.20 }],
      axe:    [{ status: STATUS.BLEED,  chance: 0.30 }],
      sword:  [{ status: STATUS.BLEED,  chance: 0.10 }],
      fang:   [{ status: STATUS.POISON, chance: 0.40 }],  // wolf fang as makeshift weapon
    };
    for (const { status, chance } of (procs[weaponKey] ?? [])) {
      if (Math.random() < chance) this.applyStatus(target, status, { source: attacker });
    }
  }

  // ── Screen shake ────────────────────────────────────────────────────────────

  /**
   * @param {number} intensity  0..1
   * @param {number} [frames]   Duration hint (not strictly used)
   */
  screenShake(intensity, frames = 8) {
    this._shaker.trigger(intensity, frames);
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  /** Call every frame. @param {number} delta seconds */
  update(delta) {
    this._shaker.update(delta);
    this._combo.update(delta);

    for (const [entity, tracker] of this._statuses) {
      tracker.update(delta, this._bus);
      // Prune dead entities
      if (entity.isDead) {
        tracker.clearAll();
        this._statuses.delete(entity);
      }
    }
  }

  /** XP multiplier from current combo. */
  comboMultiplier() {
    return this._combo.getMultiplier();
  }

  dispose() {
    for (const tracker of this._statuses.values()) tracker.clearAll();
    this._statuses.clear();
    this._combo.dispose();
  }
}
