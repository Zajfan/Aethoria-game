/**
 * AbilitySystem.js — Aethoria v0.6
 *
 * Active abilities bound to hotkeys 1–4 with mana cost, cooldowns,
 * visual feedback, and per-class spell sets.
 *
 * WARRIOR    1:Battlecry  2:Shield Bash  3:Whirlwind    4:Rallying Cry
 * MAGE       1:Fireball   2:Frost Nova   3:Arcane Surge  4:Blink
 * RANGER     1:Multi-Shot 2:Smoke Bomb   3:Eagle Eye     4:Rain of Arrows
 *
 * Mana: starts at 100, regenerates 5/s, consumed by abilities.
 * Player.stats.mana and stats.maxMana are added on init.
 */

import { CONFIG } from '../config.js';

// ── Ability definitions ───────────────────────────────────────────────────────

export const ABILITIES = {
  // ── WARRIOR ──────────────────────────────────────────────────────────────
  BATTLECRY: {
    id: 'BATTLECRY', name: 'Battlecry', class: 'WARRIOR',
    icon: '⚔', color: '#ff6633', key: '1',
    manaCost: 20, cooldown: 12,
    desc: 'Roar boosts attack +30% for 8 seconds. Nearby allies are invigorated.',
    execute(player, scene, bus) {
      const boost = Math.floor(player.stats.attack * 0.30);
      player.stats.attack += boost;
      player.eventBus.emit('statsChanged', player.stats);
      player.eventBus.emit('abilityFX', { type: 'burst', color: 0xff6633, x: player.position.x, z: player.position.z });
      bus.emit('hudLog', { msg: '⚔ BATTLECRY! +' + boost + ' attack for 8s', color: '#ff6633' });
      setTimeout(() => {
        player.stats.attack = Math.max(1, player.stats.attack - boost);
        player.eventBus.emit('statsChanged', player.stats);
      }, 8000);
    },
  },

  SHIELD_BASH: {
    id: 'SHIELD_BASH', name: 'Shield Bash', class: 'WARRIOR',
    icon: '🛡', color: '#aaaaff', key: '2',
    manaCost: 25, cooldown: 8,
    desc: 'Bash nearest enemy — deals 2× attack damage and stuns for 2 seconds.',
    execute(player, scene, bus) {
      const target = scene?.enemies?.find(e => !e.isDead &&
        e.position.distanceTo(player.position) < 4);
      if (!target) { bus.emit('hudLog', { msg: 'No enemy in range.', color: '#666' }); return false; }
      const dmg = Math.floor(player.stats.attack * 2.0);
      target.takeDamage(dmg, player);
      scene.combatSystem?.applyStatus(target, 'STUN', { source: player });
      player.eventBus.emit('abilityFX', { type: 'slam', color: 0xaaaaff, x: target.position.x, z: target.position.z });
      bus.emit('hudLog', { msg: `🛡 Shield Bash! -${dmg} + STUN`, color: '#aaaaff' });
    },
  },

  WHIRLWIND: {
    id: 'WHIRLWIND', name: 'Whirlwind', class: 'WARRIOR',
    icon: '🌀', color: '#ffaa44', key: '3',
    manaCost: 40, cooldown: 18,
    desc: 'Spin attack hitting ALL enemies within 3.5 tiles. Damage = 1.5× attack.',
    execute(player, scene, bus) {
      const range = 3.5;
      let hit = 0;
      scene?.enemies?.forEach(e => {
        if (!e.isDead && e.position.distanceTo(player.position) <= range) {
          const dmg = Math.floor(player.stats.attack * 1.5);
          e.takeDamage(dmg, player);
          hit++;
        }
      });
      player.eventBus.emit('abilityFX', { type: 'whirlwind', color: 0xffaa44, x: player.position.x, z: player.position.z, radius: range });
      bus.emit('hudLog', { msg: `🌀 Whirlwind hit ${hit} enemies!`, color: '#ffaa44' });
    },
  },

  RALLYING_CRY: {
    id: 'RALLYING_CRY', name: 'Rallying Cry', class: 'WARRIOR',
    icon: '💪', color: '#ffdd44', key: '4',
    manaCost: 50, cooldown: 30,
    desc: 'Restore 40% max HP and grant 5 seconds of damage immunity.',
    execute(player, scene, bus) {
      const heal = Math.floor(player.stats.maxHp * 0.40);
      player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + heal);
      player._immune = true;
      player.eventBus.emit('statsChanged', player.stats);
      player.eventBus.emit('abilityFX', { type: 'heal', color: 0xffdd44, x: player.position.x, z: player.position.z });
      bus.emit('hudLog', { msg: `💪 Rallying Cry! +${heal} HP, immune 5s`, color: '#ffdd44' });
      setTimeout(() => { player._immune = false; }, 5000);
    },
  },

  // ── MAGE ─────────────────────────────────────────────────────────────────
  FIREBALL_ACTIVE: {
    id: 'FIREBALL_ACTIVE', name: 'Fireball', class: 'MAGE',
    icon: '🔥', color: '#ff5500', key: '1',
    manaCost: 30, cooldown: 4,
    desc: 'Hurl a fireball at the nearest enemy. Burns on hit.',
    execute(player, scene, bus) {
      const target = scene?.enemies?.find(e => !e.isDead &&
        e.position.distanceTo(player.position) < 14);
      if (!target) { bus.emit('hudLog', { msg: 'No target in range.', color: '#666' }); return false; }
      const dmg = Math.floor(player.stats.attack * 1.8);
      target.takeDamage(dmg, player);
      scene.combatSystem?.applyStatus(target, 'BURN', { source: player });
      player.eventBus.emit('abilityFX', { type: 'fireball', color: 0xff5500, x: target.position.x, z: target.position.z });
      bus.emit('hudLog', { msg: `🔥 Fireball! -${dmg} + BURN`, color: '#ff5500' });
    },
  },

  FROST_NOVA: {
    id: 'FROST_NOVA', name: 'Frost Nova', class: 'MAGE',
    icon: '❄', color: '#44ccff', key: '2',
    manaCost: 35, cooldown: 14,
    desc: 'Explosion of ice — freezes ALL enemies within 4 tiles.',
    execute(player, scene, bus) {
      const range = 4.0;
      let hit = 0;
      scene?.enemies?.forEach(e => {
        if (!e.isDead && e.position.distanceTo(player.position) <= range) {
          scene.combatSystem?.applyStatus(e, 'FREEZE', { source: player });
          hit++;
        }
      });
      player.eventBus.emit('abilityFX', { type: 'nova', color: 0x44ccff, x: player.position.x, z: player.position.z, radius: range });
      bus.emit('hudLog', { msg: `❄ Frost Nova froze ${hit} enemies!`, color: '#44ccff' });
    },
  },

  ARCANE_SURGE: {
    id: 'ARCANE_SURGE', name: 'Arcane Surge', class: 'MAGE',
    icon: '✨', color: '#cc44ff', key: '3',
    manaCost: 45, cooldown: 20,
    desc: 'Channel arcane energy — next 5 attacks deal +100% damage.',
    execute(player, scene, bus) {
      player._arcaneSurge = 5;
      player.eventBus.emit('abilityFX', { type: 'burst', color: 0xcc44ff, x: player.position.x, z: player.position.z });
      bus.emit('hudLog', { msg: '✨ Arcane Surge! Next 5 attacks deal 2× damage', color: '#cc44ff' });
    },
  },

  BLINK: {
    id: 'BLINK', name: 'Blink', class: 'MAGE',
    icon: '⚡', color: '#ffffff', key: '4',
    manaCost: 40, cooldown: 16,
    desc: 'Teleport 6 tiles in your facing direction. Clears all status effects.',
    execute(player, scene, bus) {
      const dir = new (player.position.constructor || Object)();
      const angle = player.group.rotation.y;
      const dist  = 6.0;
      const nx = player.position.x + Math.sin(angle) * dist;
      const nz = player.position.z + Math.cos(angle) * dist;
      // Check not blocked
      const tx = Math.floor(nx), tz = Math.floor(nz);
      if (!scene?.world3d?.isBlocked(tx, tz)) {
        player.position.x = nx;
        player.position.z = nz;
        player.group.position.x = nx;
        player.group.position.z = nz;
      }
      // Clear statuses
      scene?.combatSystem?.clearAllStatuses?.(player);
      player.eventBus.emit('abilityFX', { type: 'blink', color: 0xffffff, x: nx, z: nz });
      bus.emit('hudLog', { msg: '⚡ Blink!', color: '#ffffff' });
    },
  },

  // ── RANGER ───────────────────────────────────────────────────────────────
  MULTI_SHOT: {
    id: 'MULTI_SHOT', name: 'Multi-Shot', class: 'RANGER',
    icon: '🏹', color: '#88ff44', key: '1',
    manaCost: 20, cooldown: 6,
    desc: 'Fire arrows at all enemies within 10 tiles. Each hit deals 1.2× attack.',
    execute(player, scene, bus) {
      const range = 10.0;
      let hit = 0;
      scene?.enemies?.forEach(e => {
        if (!e.isDead && e.position.distanceTo(player.position) <= range) {
          const dmg = Math.floor(player.stats.attack * 1.2);
          e.takeDamage(dmg, player);
          scene.combatSystem?.rollStatusProc(player, e, 'bow');
          hit++;
        }
      });
      player.eventBus.emit('abilityFX', { type: 'multishot', color: 0x88ff44, x: player.position.x, z: player.position.z });
      bus.emit('hudLog', { msg: `🏹 Multi-Shot hit ${hit} targets!`, color: '#88ff44' });
    },
  },

  SMOKE_BOMB: {
    id: 'SMOKE_BOMB', name: 'Smoke Bomb', class: 'RANGER',
    icon: '💨', color: '#aaaaaa', key: '2',
    manaCost: 25, cooldown: 15,
    desc: 'Drop smoke — all nearby enemies lose target for 5 seconds.',
    execute(player, scene, bus) {
      const range = 5.0;
      scene?.enemies?.forEach(e => {
        if (!e.isDead && e.position.distanceTo(player.position) <= range) {
          e.state = 0; // reset to IDLE
          e.pTimer = 5000;
        }
      });
      player.eventBus.emit('abilityFX', { type: 'smoke', color: 0xaaaaaa, x: player.position.x, z: player.position.z, radius: range });
      bus.emit('hudLog', { msg: '💨 Smoke Bomb! Enemies lose track.', color: '#aaaaaa' });
    },
  },

  EAGLE_EYE: {
    id: 'EAGLE_EYE', name: 'Eagle Eye', class: 'RANGER',
    icon: '👁', color: '#ffee44', key: '3',
    manaCost: 30, cooldown: 20,
    desc: 'Reveals all enemies and POIs within 25 tiles. +50% crit for 10s.',
    execute(player, scene, bus) {
      player._eagleEye = true;
      player.eventBus.emit('mapReveal', { tx: Math.floor(player.position.x), tz: Math.floor(player.position.z), radius: 25 });
      player.eventBus.emit('abilityFX', { type: 'burst', color: 0xffee44, x: player.position.x, z: player.position.z });
      bus.emit('hudLog', { msg: '👁 Eagle Eye! Revealed surroundings. +50% crit 10s', color: '#ffee44' });
      setTimeout(() => { player._eagleEye = false; }, 10000);
    },
  },

  RAIN_OF_ARROWS: {
    id: 'RAIN_OF_ARROWS', name: 'Rain of Arrows', class: 'RANGER',
    icon: '🌧', color: '#44ffaa', key: '4',
    manaCost: 60, cooldown: 35,
    desc: 'Call a barrage on your target area — 5 waves over 2.5s, each hits all in 4 tiles.',
    execute(player, scene, bus) {
      let wave = 0;
      const origin = { x: player.position.x, z: player.position.z };
      if (player.attackTarget && !player.attackTarget.isDead) {
        origin.x = player.attackTarget.position.x;
        origin.z = player.attackTarget.position.z;
      }
      bus.emit('hudLog', { msg: '🌧 Rain of Arrows!', color: '#44ffaa' });
      const interval = setInterval(() => {
        if (wave >= 5) { clearInterval(interval); return; }
        scene?.enemies?.forEach(e => {
          if (!e.isDead) {
            const dx = e.position.x - origin.x;
            const dz = e.position.z - origin.z;
            if (Math.hypot(dx, dz) <= 4.0) {
              const dmg = Math.floor(player.stats.attack * 0.9);
              e.takeDamage(dmg, player);
            }
          }
        });
        player.eventBus?.emit('abilityFX', { type: 'rain', color: 0x44ffaa, x: origin.x, z: origin.z, radius: 4 });
        wave++;
      }, 500);
    },
  },
};

// Map class → ability IDs for slots 1-4
export const CLASS_ABILITIES = {
  WARRIOR: ['BATTLECRY',      'SHIELD_BASH',    'WHIRLWIND',      'RALLYING_CRY'  ],
  MAGE:    ['FIREBALL_ACTIVE','FROST_NOVA',      'ARCANE_SURGE',   'BLINK'          ],
  RANGER:  ['MULTI_SHOT',     'SMOKE_BOMB',      'EAGLE_EYE',      'RAIN_OF_ARROWS' ],
};

// ── AbilitySystem ─────────────────────────────────────────────────────────────

export class AbilitySystem {
  /**
   * @param {EventBus} eventBus
   */
  constructor(eventBus) {
    this._bus      = eventBus;
    this._player   = null;
    this._scene    = null;
    this._slots    = [];   // ability IDs for slots 1-4
    this._cds      = {};   // abilityId → remaining cooldown seconds
    this._manaRegen = 5.0; // mana per second

    this._keyHandler = null;
  }

  // ── Setup ─────────────────────────────────────────────────────────────────

  init(player, scene) {
    this._player = player;
    this._scene  = scene;

    // Add mana to player stats if not present
    if (player.stats.mana === undefined) {
      player.stats.mana    = 100;
      player.stats.maxMana = 100;
    }

    // Load abilities for class
    const cls = player.playerClass ?? 'WARRIOR';
    this._slots = CLASS_ABILITIES[cls] ?? CLASS_ABILITIES.WARRIOR;
    this._cds   = {};
    this._slots.forEach(id => { this._cds[id] = 0; });

    // Key listener
    if (this._keyHandler) window.removeEventListener('keydown', this._keyHandler);
    this._keyHandler = (e) => {
      const slot = parseInt(e.key);
      if (slot >= 1 && slot <= 4) this.useSlot(slot - 1);
    };
    window.addEventListener('keydown', this._keyHandler);

    this._bus?.emit('abilitiesChanged', this._getUIData());
  }

  // ── Use ability ───────────────────────────────────────────────────────────

  useSlot(slotIndex) {
    const id  = this._slots[slotIndex];
    if (!id) return;
    const ab  = ABILITIES[id];
    if (!ab)  return;

    const cd  = this._cds[id] ?? 0;
    if (cd > 0) {
      this._bus?.emit('hudLog', { msg: `${ab.icon} ${ab.name} on cooldown (${cd.toFixed(1)}s)`, color: '#666' });
      return;
    }

    const mana = this._player.stats.mana ?? 0;
    if (mana < ab.manaCost) {
      this._bus?.emit('hudLog', { msg: `${ab.icon} Not enough mana (need ${ab.manaCost})`, color: '#4488ff' });
      return;
    }

    // Execute
    const result = ab.execute(this._player, this._scene, this._bus);
    if (result === false) return; // ability returned false = cancelled

    // Deduct mana, start cooldown
    this._player.stats.mana = Math.max(0, mana - ab.manaCost);
    this._cds[id] = ab.cooldown;
    this._player.eventBus?.emit('statsChanged', this._player.stats);
    this._bus?.emit('abilitiesChanged', this._getUIData());
  }

  // ── Update (mana regen + cooldown tick) ───────────────────────────────────

  update(delta) {
    if (!this._player) return;

    // Mana regen
    const stats = this._player.stats;
    if (stats.mana < stats.maxMana) {
      stats.mana = Math.min(stats.maxMana, (stats.mana ?? 0) + this._manaRegen * delta);
      this._player.eventBus?.emit('statsChanged', stats);
    }

    // Cooldown ticks
    let changed = false;
    for (const id of Object.keys(this._cds)) {
      if (this._cds[id] > 0) {
        this._cds[id] = Math.max(0, this._cds[id] - delta);
        changed = true;
      }
    }
    if (changed) this._bus?.emit('abilitiesChanged', this._getUIData());
  }

  // ── UI data ───────────────────────────────────────────────────────────────

  _getUIData() {
    return this._slots.map((id, i) => {
      const ab  = ABILITIES[id];
      const cd  = this._cds[id] ?? 0;
      const pct = ab ? (1 - cd / ab.cooldown) : 1;
      return {
        slot:    i + 1,
        id,
        name:    ab?.name    ?? '—',
        icon:    ab?.icon    ?? '?',
        color:   ab?.color   ?? '#aaa',
        desc:    ab?.desc    ?? '',
        manaCost:ab?.manaCost ?? 0,
        cooldown:ab?.cooldown ?? 0,
        cdLeft:  cd,
        pct:     Math.max(0, Math.min(1, pct)),
        ready:   cd === 0,
      };
    });
  }

  getSlotData() { return this._getUIData(); }

  // ── Serialization ─────────────────────────────────────────────────────────

  serialize()    { return { cds: { ...this._cds } }; }
  deserialize(d) { if (d?.cds) Object.assign(this._cds, d.cds); }

  dispose() {
    if (this._keyHandler) window.removeEventListener('keydown', this._keyHandler);
  }
}
