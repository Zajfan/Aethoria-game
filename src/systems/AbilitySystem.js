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
    execute(player, scene, bus, sys) {
      const boost = Math.floor(player.stats.attack * 0.30);
      player.stats.attack += boost;
      player.eventBus.emit('statsChanged', player.stats);
      player.eventBus.emit('abilityFX', { type: 'burst', color: 0xff6633, x: player.position.x, z: player.position.z });
      bus.emit('hudLog', { msg: '⚔ BATTLECRY! +' + boost + ' attack for 8s', color: '#ff6633' });
      sys._setTimeout(() => {
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
    execute(player, scene, bus, sys) {
      const heal = Math.floor(player.stats.maxHp * 0.40);
      player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + heal);
      player._immune = true;
      player.eventBus.emit('statsChanged', player.stats);
      player.eventBus.emit('abilityFX', { type: 'heal', color: 0xffdd44, x: player.position.x, z: player.position.z });
      bus.emit('hudLog', { msg: `💪 Rallying Cry! +${heal} HP, immune 5s`, color: '#ffdd44' });
      sys._setTimeout(() => { player._immune = false; }, 5000);
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
    execute(player, scene, bus, sys) {
      player._eagleEye = true;
      player.eventBus.emit('mapReveal', { tx: Math.floor(player.position.x), tz: Math.floor(player.position.z), radius: 25 });
      player.eventBus.emit('abilityFX', { type: 'burst', color: 0xffee44, x: player.position.x, z: player.position.z });
      bus.emit('hudLog', { msg: '👁 Eagle Eye! Revealed surroundings. +50% crit 10s', color: '#ffee44' });
      sys._setTimeout(() => { player._eagleEye = false; }, 10000);
    },
  },

  RAIN_OF_ARROWS: {
    id: 'RAIN_OF_ARROWS', name: 'Rain of Arrows', class: 'RANGER',
    icon: '🌧', color: '#44ffaa', key: '4',
    manaCost: 60, cooldown: 35,
    desc: 'Call a barrage on your target area — 5 waves over 2.5s, each hits all in 4 tiles.',
    execute(player, scene, bus, sys) {
      let wave = 0;
      const origin = { x: player.position.x, z: player.position.z };
      if (player.attackTarget && !player.attackTarget.isDead) {
        origin.x = player.attackTarget.position.x;
        origin.z = player.attackTarget.position.z;
      }
      bus.emit('hudLog', { msg: '🌧 Rain of Arrows!', color: '#44ffaa' });
      const id = sys._setInterval(() => {
        if (wave >= 5) { sys._clearInterval(id); return; }
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

// ── Necromancer abilities ─────────────────────────────────────────────────────

Object.assign(ABILITIES, {
  SOUL_DRAIN_ACTIVE: {
    id: 'SOUL_DRAIN_ACTIVE', name: 'Soul Drain', class: 'NECROMANCER',
    icon: '🩸', color: '#aa44cc', key: '1',
    manaCost: 25, cooldown: 6,
    desc: 'Drain life from the nearest enemy, dealing 150% attack damage and healing yourself for 50%.',
    execute(player, scene, bus) {
      const target = scene?.enemies?.find(e => !e.isDead &&
        e.position.distanceTo(player.position) < 8);
      if (!target) { bus.emit('hudLog', { msg: 'No enemy in range.', color: '#666' }); return false; }
      const dmg  = Math.floor(player.stats.attack * 1.5);
      const heal = Math.floor(dmg * 0.5);
      target.takeDamage(dmg, player);
      player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + heal);
      player.eventBus.emit('statsChanged', player.stats);
      player.eventBus.emit('abilityFX', { type: 'heal', color: 0xaa44cc, x: player.position.x, z: player.position.z });
      bus.emit('hudLog', { msg: `🩸 Soul Drain! -${dmg} / +${heal} HP`, color: '#aa44cc' });
    },
  },

  RAISE_DEAD_ACTIVE: {
    id: 'RAISE_DEAD_ACTIVE', name: 'Raise Dead', class: 'NECROMANCER',
    icon: '💀', color: '#553388', key: '2',
    manaCost: 40, cooldown: 20,
    desc: 'Detonate a fallen enemy as a minion that fights for you for 30 seconds.',
    execute(player, scene, bus, sys) {
      // Find the nearest dead enemy that still has a mesh
      const corpse = scene?.enemies?.find(e => e.isDead &&
        e.position.distanceTo(player.position) < 6);
      if (!corpse) { bus.emit('hudLog', { msg: 'No corpse nearby.', color: '#666' }); return false; }
      // Revive corpse as a temporary ally (flip its atk to 0 briefly then remove after 30s)
      corpse.isDead     = false;
      corpse._isMinion  = true;
      corpse.stats.hp   = Math.floor(corpse.stats.maxHp * 0.4);
      bus.emit('hudLog', { msg: `💀 Raised! ${corpse._data?.name ?? 'creature'} fights for you.`, color: '#553388' });
      player.eventBus.emit('abilityFX', { type: 'burst', color: 0x553388, x: corpse.position.x, z: corpse.position.z });
      sys._setTimeout(() => {
        if (!corpse.isDead) {
          corpse.isDead   = true;
          corpse._isMinion = false;
        }
      }, 30_000);
    },
  },

  BONE_NOVA: {
    id: 'BONE_NOVA', name: 'Bone Nova', class: 'NECROMANCER',
    icon: '🦴', color: '#ddccaa', key: '3',
    manaCost: 35, cooldown: 14,
    desc: 'Explode bone shards in all directions — hits all enemies within 4 tiles for 120% attack.',
    execute(player, scene, bus) {
      let hits = 0;
      scene?.enemies?.forEach(e => {
        if (!e.isDead && e.position.distanceTo(player.position) < 4) {
          e.takeDamage(Math.floor(player.stats.attack * 1.2), player);
          hits++;
        }
      });
      player.eventBus.emit('abilityFX', { type: 'slam', color: 0xddccaa, x: player.position.x, z: player.position.z, radius: 4 });
      bus.emit('hudLog', { msg: `🦴 Bone Nova! ${hits} enemies hit.`, color: '#ddccaa' });
    },
  },

  VOID_PACT_ACTIVE: {
    id: 'VOID_PACT_ACTIVE', name: 'Void Pact', class: 'NECROMANCER',
    icon: '🌑', color: '#330055', key: '4',
    manaCost: 0, cooldown: 60,
    desc: 'Sacrifice 15% HP for +50% spell damage for 20 seconds.',
    execute(player, scene, bus, sys) {
      const cost = Math.floor(player.stats.maxHp * 0.15);
      if (player.stats.hp <= cost) { bus.emit('hudLog', { msg: 'Not enough HP!', color: '#ff4444' }); return false; }
      player.stats.hp -= cost;
      const boost = Math.floor(player.stats.attack * 0.5);
      player.stats.attack += boost;
      player.eventBus.emit('statsChanged', player.stats);
      player.eventBus.emit('abilityFX', { type: 'smoke', color: 0x330055, x: player.position.x, z: player.position.z });
      bus.emit('hudLog', { msg: `🌑 Void Pact! -${cost} HP, +${boost} atk for 20s`, color: '#330055' });
      sys._setTimeout(() => {
        player.stats.attack = Math.max(1, player.stats.attack - boost);
        player.eventBus.emit('statsChanged', player.stats);
      }, 20_000);
    },
  },

  // ── Paladin abilities ──────────────────────────────────────────────────────

  HOLY_STRIKE_ACTIVE: {
    id: 'HOLY_STRIKE_ACTIVE', name: 'Holy Strike', class: 'PALADIN',
    icon: '✝', color: '#ffee44', key: '1',
    manaCost: 20, cooldown: 5,
    desc: 'Smite nearest enemy for 200% attack damage, +50% extra vs Void/Undead.',
    execute(player, scene, bus) {
      const target = scene?.enemies?.find(e => !e.isDead &&
        e.position.distanceTo(player.position) < 4.5);
      if (!target) { bus.emit('hudLog', { msg: 'No enemy in range.', color: '#666' }); return false; }
      const isVoid = target._data?.void_touch || target._data?.ethereal;
      const mult   = isVoid ? 2.5 : 2.0;
      const dmg    = Math.floor(player.stats.attack * mult);
      target.takeDamage(dmg, player);
      player.eventBus.emit('abilityFX', { type: 'burst', color: 0xffee44, x: target.position.x, z: target.position.z });
      bus.emit('hudLog', { msg: `✝ Holy Strike! -${dmg}${isVoid ? ' (HOLY BONUS)' : ''}`, color: '#ffee44' });
    },
  },

  DIVINE_SHIELD_ACTIVE: {
    id: 'DIVINE_SHIELD_ACTIVE', name: 'Divine Shield', class: 'PALADIN',
    icon: '🛡', color: '#ffffff', key: '2',
    manaCost: 50, cooldown: 45,
    desc: 'Become immune to all damage for 4 seconds.',
    execute(player, scene, bus, sys) {
      player._divineShieldActive = true;
      player.eventBus.emit('abilityFX', { type: 'heal', color: 0xffffff, x: player.position.x, z: player.position.z });
      bus.emit('hudLog', { msg: '🛡 Divine Shield! Immune for 4s', color: '#ffffff' });
      sys._setTimeout(() => {
        player._divineShieldActive = false;
        bus.emit('hudLog', { msg: 'Divine Shield faded.', color: '#aaaaaa' });
      }, 4_000);
    },
  },

  LAY_ON_HANDS_ACTIVE: {
    id: 'LAY_ON_HANDS_ACTIVE', name: 'Lay on Hands', class: 'PALADIN',
    icon: '❤', color: '#ff4444', key: '3',
    manaCost: 60, cooldown: 120,
    desc: 'Instantly restore all HP.',
    execute(player, scene, bus) {
      const healed = player.stats.maxHp - player.stats.hp;
      player.stats.hp = player.stats.maxHp;
      player.eventBus.emit('statsChanged', player.stats);
      player.eventBus.emit('abilityFX', { type: 'heal', color: 0xff4444, x: player.position.x, z: player.position.z });
      bus.emit('hudLog', { msg: `❤ Lay on Hands! +${healed} HP`, color: '#ff4444' });
    },
  },

  DIVINE_WRATH_ACTIVE: {
    id: 'DIVINE_WRATH_ACTIVE', name: 'Divine Wrath', class: 'PALADIN',
    icon: '👑', color: '#ffcc00', key: '4',
    manaCost: 55, cooldown: 90,
    desc: 'For 10s: +60% attack, -30% damage taken. Holy aura burns nearby enemies each second.',
    execute(player, scene, bus, sys) {
      const atkBoost = Math.floor(player.stats.attack * 0.6);
      player.stats.attack += atkBoost;
      player._divineWrathActive = true;
      player.eventBus.emit('statsChanged', player.stats);
      player.eventBus.emit('abilityFX', { type: 'slam', color: 0xffcc00, x: player.position.x, z: player.position.z, radius: 3 });
      bus.emit('hudLog', { msg: `👑 Divine Wrath! +${atkBoost} atk, -30% dmg for 10s`, color: '#ffcc00' });
      const auraId = sys._setInterval(() => {
        scene?.enemies?.forEach(e => {
          if (!e.isDead && e.position.distanceTo(player.position) < 3.5) {
            e.takeDamage(Math.floor(player.stats.attack * 0.3), player);
          }
        });
      }, 1000);
      sys._setTimeout(() => {
        sys._clearInterval(auraId);
        player.stats.attack  = Math.max(1, player.stats.attack - atkBoost);
        player._divineWrathActive = false;
        player.eventBus.emit('statsChanged', player.stats);
        bus.emit('hudLog', { msg: 'Divine Wrath faded.', color: '#aaaaaa' });
      }, 10_000);
    },
  },
});

// Map class → ability IDs for slots 1-4
export const CLASS_ABILITIES = {
  WARRIOR:     ['BATTLECRY',         'SHIELD_BASH',       'WHIRLWIND',          'RALLYING_CRY'     ],
  MAGE:        ['FIREBALL_ACTIVE',   'FROST_NOVA',        'ARCANE_SURGE',       'BLINK'            ],
  RANGER:      ['MULTI_SHOT',        'SMOKE_BOMB',        'EAGLE_EYE',          'RAIN_OF_ARROWS'   ],
  NECROMANCER: ['SOUL_DRAIN_ACTIVE', 'RAISE_DEAD_ACTIVE', 'BONE_NOVA',          'VOID_PACT_ACTIVE' ],
  PALADIN:     ['HOLY_STRIKE_ACTIVE','DIVINE_SHIELD_ACTIVE','LAY_ON_HANDS_ACTIVE','DIVINE_WRATH_ACTIVE'],
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

    this._keyHandler  = null;
    this._timeoutIds  = [];   // tracked setTimeout IDs
    this._intervalIds = [];   // tracked setInterval IDs
  }

  /** Schedule a tracked timeout that is cancelled on dispose(). */
  _setTimeout(fn, delay) {
    const id = setTimeout(fn, delay);
    this._timeoutIds.push(id);
    return id;
  }

  /** Schedule a tracked interval that is cancelled on dispose(). */
  _setInterval(fn, delay) {
    const id = setInterval(fn, delay);
    this._intervalIds.push(id);
    return id;
  }

  /** Cancel a specific tracked interval (e.g. when it ends naturally). */
  _clearInterval(id) {
    clearInterval(id);
    const idx = this._intervalIds.indexOf(id);
    if (idx !== -1) this._intervalIds.splice(idx, 1);
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

    // Execute — pass `this` as 4th arg so abilities can use tracked timers
    const result = ab.execute(this._player, this._scene, this._bus, this);
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
    this._timeoutIds.forEach(id => clearTimeout(id));
    this._intervalIds.forEach(id => clearInterval(id));
    this._timeoutIds  = [];
    this._intervalIds = [];
  }
}
