/**
 * EnchantSystem.js  — Aethoria v0.5
 *
 * Late-game gear progression. Players can enchant weapons and armour
 * using Void Crystals and boss materials to add permanent modifiers.
 *
 * Enchantments (random roll from pool per item type):
 *   Weapons: Firebrand, Venom Edge, Frostbite, Soulrend, Vorpal
 *   Armour:  Ironweave, Thorns, Warding, Swiftness, Lifesteal
 *
 * Upgrade levels: +1 → +5 (each level costs escalating materials)
 * Max enchantments per item: 2
 *
 * Persistence: stored in player.enchantments map { itemKey: [enchant, ...] }
 *
 * Usage
 * ──────
 *   const es = new EnchantSystem(eventBus);
 *   es.canEnchant(player, 'sword')       → { ok, reason }
 *   es.enchant(player, 'sword')          → { ok, enchant, msg }
 *   es.upgrade(player, 'sword')          → { ok, level, msg }
 *   es.getEnchants(player, 'sword')      → [{ id, name, desc, level }, ...]
 *   es.applyPassives(player)             → call after equip/unequip
 */

import { CONFIG } from '../config.js';

// ── Enchantment pool ──────────────────────────────────────────────────────────

const ENCHANTS = {
  // ── Weapon enchants ──────────────────────────────────────────────────────────
  FIREBRAND: {
    id: 'FIREBRAND', name: 'Firebrand', slot: 'weapon',
    desc: 'Attacks have a 20% chance to BURN the target.',
    color: '#ff5500',
    stat: null,
    onHit: (attacker, target, combat) => {
      if (Math.random() < 0.20) combat?.applyStatus(target, 'BURN', { source: attacker });
    },
    material: { crystal: 1 },
  },
  VENOM_EDGE: {
    id: 'VENOM_EDGE', name: 'Venom Edge', slot: 'weapon',
    desc: 'Attacks have a 25% chance to POISON the target.',
    color: '#44cc44',
    stat: null,
    onHit: (attacker, target, combat) => {
      if (Math.random() < 0.25) combat?.applyStatus(target, 'POISON', { source: attacker });
    },
    material: { fang: 2 },
  },
  FROSTBITE: {
    id: 'FROSTBITE', name: 'Frostbite', slot: 'weapon',
    desc: 'Attacks have a 15% chance to FREEZE the target.',
    color: '#44ccff',
    stat: null,
    onHit: (attacker, target, combat) => {
      if (Math.random() < 0.15) combat?.applyStatus(target, 'FREEZE', { source: attacker });
    },
    material: { gem: 1 },
  },
  SOULREND: {
    id: 'SOULREND', name: 'Soulrend', slot: 'weapon',
    desc: '+8 attack. Attacks deal +10% damage as Void.',
    color: '#9900ee',
    stat: { attack: 8 },
    onHit: (attacker, target, combat) => {
      if (Math.random() < 0.10) combat?.applyStatus(target, 'VOID_CURSE', { source: attacker });
    },
    material: { crystal: 2, gem: 1 },
  },
  VORPAL: {
    id: 'VORPAL', name: 'Vorpal Edge', slot: 'weapon',
    desc: '+12 attack. 5% chance for instant kill on weak enemies.',
    color: '#ffffff',
    stat: { attack: 12 },
    onHit: (attacker, target, _combat) => {
      if (Math.random() < 0.05 && target.stats?.hp < target.stats?.maxHp * 0.25) {
        target.stats.hp = 0;
        target._die?.(attacker);
      }
    },
    material: { crystal: 3, bones: 2 },
  },

  // ── Armour enchants ──────────────────────────────────────────────────────────
  IRONWEAVE: {
    id: 'IRONWEAVE', name: 'Ironweave', slot: 'armor',
    desc: '+10 defence.',
    color: '#aaaaaa',
    stat: { defense: 10 },
    material: { hide: 3, bones: 1 },
  },
  THORNS: {
    id: 'THORNS', name: 'Thorns', slot: 'armor',
    desc: 'Attackers take 15% of the damage they deal.',
    color: '#88ff44',
    stat: null,
    onTakeDamage: (wearer, attacker, amount) => {
      if (attacker && amount > 0) {
        const reflect = Math.max(1, Math.floor(amount * 0.15));
        attacker.stats.hp = Math.max(0, (attacker.stats.hp ?? 0) - reflect);
      }
    },
    material: { bones: 4 },
  },
  WARDING: {
    id: 'WARDING', name: 'Warding', slot: 'armor',
    desc: 'Immune to VOID_CURSE. +15% resistance to all status effects (shorter duration).',
    color: '#88ccff',
    stat: null,
    statusResist: 0.15,
    material: { crystal: 1, scroll: 2 },
  },
  SWIFTNESS: {
    id: 'SWIFTNESS', name: 'Swiftness', slot: 'armor',
    desc: '+20% movement speed.',
    color: '#ffee44',
    stat: { speedMult: 0.20 },
    material: { hide: 2, fang: 1 },
  },
  LIFESTEAL: {
    id: 'LIFESTEAL', name: 'Lifesteal', slot: 'armor',
    desc: 'Heal 8% of all physical damage dealt.',
    color: '#ff4488',
    stat: null,
    lifeSteal: 0.08,
    material: { gem: 2 },
  },
};

// ── Upgrade cost table ────────────────────────────────────────────────────────
// Level 1→2, 2→3 … cost in crystals + gold

const UPGRADE_COSTS = [
  null,                           // placeholder for 0
  { crystal: 1, gold: 50  },     // +1 → +2
  { crystal: 1, gold: 100 },     // +2 → +3
  { crystal: 2, gold: 200 },     // +3 → +4
  { crystal: 3, gold: 400 },     // +4 → +5
];

// Bonus stat per upgrade level per enchant with a stat
const UPGRADE_STAT_BONUS = 3; // +3 per upgrade level

// ── EnchantSystem ─────────────────────────────────────────────────────────────

export class EnchantSystem {
  constructor(eventBus) {
    this._bus = eventBus;
  }

  // ── Queries ─────────────────────────────────────────────────────────────────

  /**
   * Check if a player can enchant a given item.
   * @param {object} player
   * @param {string} itemKey
   * @returns {{ ok: boolean, reason: string }}
   */
  canEnchant(player, itemKey) {
    const item = CONFIG.ITEMS[itemKey];
    if (!item) return { ok: false, reason: 'Unknown item.' };
    if (item.type !== 'weapon' && item.type !== 'armor')
      return { ok: false, reason: 'Only weapons and armour can be enchanted.' };

    const enchants = this._getEnchantList(player, itemKey);
    if (enchants.length >= 2)
      return { ok: false, reason: 'This item already has 2 enchantments (maximum).' };

    // Check the player has at least one valid enchant material
    const slot    = item.type;
    const pool    = Object.values(ENCHANTS).filter(e => e.slot === slot);
    const usable  = pool.filter(e => this._canAfford(player, e.material));

    if (usable.length === 0)
      return { ok: false, reason: 'Not enough materials for any enchantment.' };

    return { ok: true, reason: '' };
  }

  /**
   * Apply a random valid enchantment to an item.
   * Deducts materials and records the enchantment.
   */
  enchant(player, itemKey) {
    const { ok, reason } = this.canEnchant(player, itemKey);
    if (!ok) return { ok: false, msg: reason };

    const item = CONFIG.ITEMS[itemKey];
    const slot = item.type;
    const pool = Object.values(ENCHANTS)
      .filter(e => e.slot === slot)
      .filter(e => this._canAfford(player, e.material))
      .filter(e => !this._getEnchantList(player, itemKey).some(ex => ex.id === e.id));

    if (pool.length === 0) return { ok: false, msg: 'No new enchantments available.' };

    const enchant = pool[Math.floor(Math.random() * pool.length)];

    // Deduct materials
    for (const [mat, qty] of Object.entries(enchant.material)) {
      if (mat === 'gold') {
        player.stats.gold = Math.max(0, (player.stats.gold ?? 0) - qty);
        player.eventBus?.emit('statsChanged', player.stats);
      } else {
        player.removeItem(mat, qty);
      }
    }

    // Store enchantment
    const enc = player.enchantments ?? (player.enchantments = {});
    if (!enc[itemKey]) enc[itemKey] = [];
    enc[itemKey].push({ id: enchant.id, level: 1 });

    this._bus?.emit('inventoryChanged', player.inventory);
    this._bus?.emit('enchantApplied', { itemKey, enchant: enchant.id });

    return {
      ok:      true,
      enchant: enchant.id,
      msg:     `✨ ${item.name} enchanted with ${enchant.name}!`,
    };
  }

  /**
   * Upgrade an existing enchantment by one level (max +5).
   * Upgrades the lowest-level enchantment on the item.
   */
  upgrade(player, itemKey) {
    const list = this._getEnchantList(player, itemKey);
    if (list.length === 0) return { ok: false, msg: 'No enchantments to upgrade.' };

    // Upgrade the lowest-level one
    const target = list.reduce((a, b) => a.level < b.level ? a : b);
    if (target.level >= 5) return { ok: false, msg: 'Already at maximum enchant level (+5).' };

    const cost = UPGRADE_COSTS[target.level];
    if (!cost) return { ok: false, msg: 'Cannot upgrade further.' };

    if (!this._canAfford(player, cost)) {
      const needed = Object.entries(cost).map(([k, v]) => `${v}×${k}`).join(', ');
      return { ok: false, msg: `Need: ${needed}` };
    }

    for (const [mat, qty] of Object.entries(cost)) {
      if (mat === 'gold') {
        player.stats.gold = Math.max(0, (player.stats.gold ?? 0) - qty);
      } else {
        player.removeItem(mat, qty);
      }
    }

    target.level++;
    this._bus?.emit('enchantUpgraded', { itemKey, level: target.level });

    return { ok: true, level: target.level, msg: `⚡ Upgraded ${target.id} to +${target.level}!` };
  }

  // ── Read enchants ────────────────────────────────────────────────────────────

  /**
   * Returns full enchantment details for display.
   * @returns {{ id, name, desc, level, color }[]}
   */
  getEnchants(player, itemKey) {
    return this._getEnchantList(player, itemKey).map(e => {
      const def = ENCHANTS[e.id];
      return { id: e.id, name: def?.name ?? e.id, desc: def?.desc ?? '', level: e.level, color: def?.color ?? '#aaa' };
    });
  }

  // ── Combat integration ────────────────────────────────────────────────────────

  /**
   * Call after each player hit to proc onHit enchantments.
   * @param {object} player
   * @param {object} target
   * @param {CombatSystem} combatSys
   */
  procOnHit(player, target, combatSys) {
    const weapon = player.equipment?.weapon;
    if (!weapon) return;
    for (const enc of this._getEnchantList(player, weapon)) {
      ENCHANTS[enc.id]?.onHit?.(player, target, combatSys);
    }
    // Lifesteal from armour
    const armor = player.equipment?.armor;
    if (armor) {
      for (const enc of this._getEnchantList(player, armor)) {
        const ls = ENCHANTS[enc.id]?.lifeSteal;
        if (ls) {
          const dmg  = target._lastDmgReceived ?? 0;
          const heal = Math.max(1, Math.floor(dmg * ls));
          player.stats.hp = Math.min(player.stats.maxHp, (player.stats.hp ?? 0) + heal);
          player.eventBus?.emit('statsChanged', player.stats);
        }
      }
    }
  }

  /**
   * Call when player takes damage to proc onTakeDamage enchantments (Thorns etc).
   */
  procOnTakeDamage(player, attacker, amount) {
    const armor = player.equipment?.armor;
    if (!armor) return;
    for (const enc of this._getEnchantList(player, armor)) {
      ENCHANTS[enc.id]?.onTakeDamage?.(player, attacker, amount);
    }
  }

  /**
   * Re-apply all passive stat bonuses.
   * Call after equip/unequip/enchant/upgrade.
   * @param {object} player
   * @param {object} baseStats  Original stats before any enchant bonuses
   */
  applyPassives(player, baseStats) {
    // Reset to base
    player.stats.attack  = baseStats.attack;
    player.stats.defense = baseStats.defense;

    for (const [itemKey, list] of Object.entries(player.enchantments ?? {})) {
      for (const enc of list) {
        const def = ENCHANTS[enc.id];
        if (!def?.stat) continue;
        const lvlBonus = (enc.level - 1) * UPGRADE_STAT_BONUS;
        if (def.stat.attack)  player.stats.attack  += def.stat.attack  + lvlBonus;
        if (def.stat.defense) player.stats.defense += def.stat.defense + lvlBonus;
        if (def.stat.speedMult) {
          player.stats.speed = (player.stats.speed ?? 0) * (1 + def.stat.speedMult);
        }
      }
    }
    player.eventBus?.emit('statsChanged', player.stats);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  _getEnchantList(player, itemKey) {
    return (player.enchantments?.[itemKey] ?? []);
  }

  _canAfford(player, cost) {
    for (const [mat, qty] of Object.entries(cost)) {
      if (mat === 'gold') {
        if ((player.stats?.gold ?? 0) < qty) return false;
      } else {
        if ((player.inventory?.[mat] ?? 0) < qty) return false;
      }
    }
    return true;
  }

  // ── Material cost display ────────────────────────────────────────────────────

  /**
   * Returns a list of available enchantments the player can afford for a given item.
   */
  getAffordableEnchants(player, itemKey) {
    const item = CONFIG.ITEMS[itemKey];
    if (!item) return [];
    const slot    = item.type;
    const current = this._getEnchantList(player, itemKey).map(e => e.id);
    return Object.values(ENCHANTS)
      .filter(e => e.slot === slot && !current.includes(e.id))
      .map(e => ({
        ...e,
        canAfford:    this._canAfford(player, e.material),
        costDisplay:  Object.entries(e.material).map(([k, v]) => `${v}×${k}`).join(', '),
      }));
  }
}
