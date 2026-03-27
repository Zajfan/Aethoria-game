/**
 * ItemSystem.js — Aethoria v0.6
 *
 * Handles:
 *  • Rarity-based loot drops with per-enemy modifiers
 *  • Dynamic item stat scaling based on player level and zone
 *  • Item comparison tooltip data
 *  • Loot table generation per dungeon theme
 *  • Crafting validation with rarity upgrades
 *
 * Rarity tiers: common → uncommon → rare → epic → legendary
 * Drop rates scale with: enemy tier, player level, faction bonuses,
 * dungeon depth, and world events (crystal_storm = +200% rare chance).
 */

import { CONFIG } from '../config.js';

const RARITY = CONFIG.RARITY;

// ── Base drop weight table ────────────────────────────────────────────────────
// Higher enemy tier = better drops, but common always dominates

const TIER_WEIGHTS = {
  // [common, uncommon, rare, epic, legendary]
  1: [75, 20,  4,  0.9, 0.1],   // Goblin, Spider, Bandit
  2: [65, 25,  8,  1.8, 0.2],   // Wolf, Skeleton, Archer, Cultist, Phantom
  3: [50, 30, 15,  4.0, 0.5],   // Troll, Golem, Wraith, Berserker
  4: [35, 30, 25,  8.0, 1.5],   // Drake, Lich
  5: [10, 20, 40, 25.0, 5.0],   // Bosses
};

// Enemy tier mapping
const ENEMY_TIER = {
  GOBLIN:1, SPIDER:1, PHANTOM:1,
  WOLF:2, SKELETON:2, ARCHER:2, CULTIST:2, BANDIT:2,
  TROLL:3, GOLEM:3, WRAITH:3, BERSERKER:3,
  DRAKE:4, LICH:4,
  VOID_KNIGHT:5, STONE_COLOSSUS:5, LICH_KING:5, FOREST_ANCIENT:5, VOID_HERALD:5,
};

// Items that can be found as loot per rarity tier
const LOOT_POOL = {
  common:    ['gold','silver','herb','hide','bones','fang','potion'],
  uncommon:  ['longsword','wand','crossbow','platemail','voidrobe','gem','crystal'],
  rare:      ['runesword','voidstaff','deathbow','dragonhide','runeshield','gem','voidessence'],
  epic:      ['soulreaper','voidblade','voidplate','soulstone'],
  legendary: ['crownblade','crownguard'],
};

// ── Helper ────────────────────────────────────────────────────────────────────

function weightedRoll(weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

function rarityFromIndex(i) {
  return ['common','uncommon','rare','epic','legendary'][i] ?? 'common';
}

// ── ItemSystem ────────────────────────────────────────────────────────────────

export class ItemSystem {
  constructor(eventBus) {
    this._bus          = eventBus;
    this._luckyBoost   = 1.0;   // set by world events / faction unlocks
    this._dungeonDepth = 0;     // increases rare chance in deep dungeon
  }

  // ── Loot generation ────────────────────────────────────────────────────────

  /**
   * Generate a loot array for a killed enemy.
   * @param {string} enemyTypeKey
   * @param {number} playerLevel
   * @param {object} [opts]  { factionBonus, worldEvent, dungeonFloor }
   * @returns {Array<{itemKey:string, rarity:string}>}
   */
  generateLoot(enemyTypeKey, playerLevel = 1, opts = {}) {
    const tier    = ENEMY_TIER[enemyTypeKey] ?? 1;
    const weights = [...(TIER_WEIGHTS[tier] ?? TIER_WEIGHTS[1])];

    // Modifiers: guild_legend unlock, lucky boost, player level
    const rarityShift = (this._luckyBoost - 1) * 10 +
                        (opts.factionBonus ? 5 : 0) +
                        Math.min(10, Math.floor(playerLevel / 5)) +
                        (opts.dungeonFloor ? opts.dungeonFloor * 2 : 0);

    // Shift weight from common toward better tiers
    weights[0] = Math.max(5, weights[0] - rarityShift);
    weights[2] += rarityShift * 0.5;
    weights[3] += rarityShift * 0.3;
    weights[4] += rarityShift * 0.2;

    const tierIdx   = weightedRoll(weights);
    const rarity    = rarityFromIndex(tierIdx);
    const pool      = LOOT_POOL[rarity] ?? LOOT_POOL.common;
    const itemKey   = pool[Math.floor(Math.random() * pool.length)];

    const drops = [{ itemKey, rarity }];

    // Bosses always drop one guaranteed rare+ item
    if (tier === 5) {
      const bossRarityPool = ['rare','rare','epic','epic','legendary'];
      const bRarity = bossRarityPool[Math.floor(Math.random() * bossRarityPool.length)];
      const bPool   = LOOT_POOL[bRarity];
      drops.push({ itemKey: bPool[Math.floor(Math.random() * bPool.length)], rarity: bRarity });
    }

    return drops;
  }

  /**
   * Generate a themed loot table for a dungeon chest.
   * @param {string} dungeonTheme  Key from CONFIG.DUNGEON_THEMES
   * @param {number} chestTier     1=normal, 2=locked, 3=boss
   */
  generateChestLoot(dungeonTheme, chestTier = 1) {
    const themeBonus = { VOID: 2, VOLCANIC: 1, CRYPT: 0 };
    const bonus = themeBonus[dungeonTheme] ?? 0;

    const weights = [
      Math.max(5,  40 - chestTier * 10 - bonus * 5),
      30 + chestTier * 5,
      20 + chestTier * 5 + bonus * 3,
      8  + chestTier * 2 + bonus * 2,
      2  + chestTier     + bonus,
    ];

    const items = [];
    const rolls = chestTier + 1;  // tier 1 = 2 items, tier 3 = 4 items
    for (let i = 0; i < rolls; i++) {
      const rarityIdx = weightedRoll(weights);
      const rarity    = rarityFromIndex(rarityIdx);
      const pool      = LOOT_POOL[rarity];
      items.push({ itemKey: pool[Math.floor(Math.random() * pool.length)], rarity });
    }
    return items;
  }

  // ── Item data helpers ───────────────────────────────────────────────────────

  /**
   * Get display data for an item including rarity styling.
   */
  getItemData(itemKey) {
    const item   = CONFIG.ITEMS[itemKey];
    if (!item) return null;
    const rarity = item.rarity ?? 'common';
    const rarDef = RARITY[rarity] ?? RARITY.common;
    return { ...item, key: itemKey, rarity, rarityDef: rarDef };
  }

  /**
   * Returns CSS color for an item's rarity.
   */
  rarityColor(itemKey) {
    const item = CONFIG.ITEMS[itemKey];
    if (!item?.rarity) return '#aaaaaa';
    return RARITY[item.rarity]?.cssColor ?? '#aaaaaa';
  }

  /**
   * Compare two items for the equip tooltip.
   * @returns {{ current, candidate, atk_diff, def_diff, upgrade }}
   */
  compare(currentKey, candidateKey, player) {
    const cur  = this.getItemData(currentKey);
    const cand = this.getItemData(candidateKey);
    if (!cur || !cand) return null;

    const atkDiff = (cand.atk ?? 0) - (cur.atk ?? 0);
    const defDiff = (cand.def ?? 0) - (cur.def ?? 0);
    return {
      current:   cur,
      candidate: cand,
      atkDiff,
      defDiff,
      upgrade: atkDiff > 0 || defDiff > 0,
    };
  }

  // ── Economy events ─────────────────────────────────────────────────────────

  setLuckyBoost(v)     { this._luckyBoost = v; }
  setDungeonDepth(d)   { this._dungeonDepth = d; }

  /**
   * XP multiplier based on item rarity when killing enemy that dropped it.
   */
  rarityXpMult(rarity) {
    return RARITY[rarity]?.xpMult ?? 1.0;
  }
}
