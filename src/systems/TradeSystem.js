/**
 * TradeSystem.js  (v0.4 — Faction-aware dynamic economy)
 *
 * Enhancements:
 *  • Faction standing affects all prices (Honored = 18% off, Enemy = 60% surcharge)
 *  • Rare "black market" stock unlocked via Guild reputation
 *  • Dynamic economy events (price surges, shortages, festival discounts)
 *  • Sell value scales with Guild standing
 *  • NPC-specific specialty items at bonus discount
 */

import { CONFIG } from '../config.js';

// ── Shop stock definitions ────────────────────────────────────────────────────

const SHOP_STOCK = {
  'Village Elder': {
    items:     ['herb', 'potion', 'scroll', 'herb'],
    specialty: ['herb', 'scroll'],    // extra discount
    mult:      0.90,
    faction:   'HEARTHMOOR',
  },
  'Blacksmith': {
    items:     ['sword', 'axe', 'shield', 'chainmail', 'leather', 'bow'],
    specialty: ['sword', 'axe', 'chainmail'],
    mult:      1.15,
    faction:   'HEARTHMOOR',
  },
  'Herbalist': {
    items:     ['herb', 'herb', 'potion', 'elixir', 'herb'],
    specialty: ['herb', 'potion', 'elixir'],
    mult:      0.82,
    faction:   'HEARTHMOOR',
  },
  'Merchant': {
    items:     ['gem', 'potion', 'elixir', 'sword', 'bow', 'staff', 'shield', 'robes', 'crystal'],
    specialty: ['gem', 'crystal'],
    mult:      1.45,
    faction:   'GUILD',
    // Rare items unlocked at Guild FRIENDLY+
    rareItems: ['elixir', 'crystal', 'staff'],
    rareThreshold: 'FRIENDLY',
  },
  'Guard Captain': {
    items:     ['sword', 'shield', 'chainmail', 'bow', 'leather'],
    specialty: ['shield', 'chainmail'],
    mult:      1.05,
    faction:   'HEARTHMOOR',
  },
};

// ── Economy event modifiers ───────────────────────────────────────────────────

const ECONOMY_EVENTS = {
  merchant_fair:   { mult: 0.75, desc: 'Festival prices!' },
  plague:          { mult: 1.30, herbsOnly: true, desc: 'Herb shortage.' },
  goblin_raid:     { mult: 1.15, weaponsOnly: true, desc: 'Weapons in demand.' },
  crystal_storm:   { sellBoost: 1.4, gemOnly: true, desc: 'Crystals worth more.' },
};

// ── TradeSystem ───────────────────────────────────────────────────────────────

export class TradeSystem {
  constructor() {
    this._priceBoost    = 1.0;
    this._activeEvent   = null;    // current economy event
    this._factionSys    = null;    // injected by GameScene after construction
    this._sellBoost     = 1.0;
    this._eventHistory  = [];
  }

  /** Inject FactionSystem reference after construction. */
  setFactionSystem(factionSys) {
    this._factionSys = factionSys;
  }

  // ── Shop queries ──────────────────────────────────────────────────────────

  getShop(npcRole) {
    return SHOP_STOCK[npcRole] ?? { items: [], specialty: [], mult: 1, faction: null };
  }

  hasShop(npcRole) {
    return (this.getShop(npcRole).items ?? []).length > 0;
  }

  /**
   * Returns the available stock for a given NPC, filtered by faction rep.
   * @param {string} npcRole
   * @returns {string[]}
   */
  getAvailableStock(npcRole) {
    const shop    = this.getShop(npcRole);
    const items   = [...new Set(shop.items)]; // dedupe
    if (!shop.rareItems || !this._factionSys) return items;

    const standing = this._factionSys.standingFor(shop.faction ?? 'HEARTHMOOR');
    const tiers    = ['NEUTRAL', 'FRIENDLY', 'HONORED'];
    const hasAccess = tiers.indexOf(standing) >= tiers.indexOf(shop.rareThreshold ?? 'FRIENDLY');

    if (hasAccess) return [...new Set([...items, ...shop.rareItems])];
    return items;
  }

  // ── Pricing ───────────────────────────────────────────────────────────────

  /**
   * Returns the buy price for an item from an NPC.
   * Factors in: base value × shop mult × economy boost × faction mult × specialty discount.
   */
  buyPrice(itemKey, npcRole) {
    const item = CONFIG.ITEMS[itemKey];
    if (!item) return 0;

    const shop     = this.getShop(npcRole);
    let   mult     = shop.mult * this._priceBoost;

    // Faction reputation modifier
    if (this._factionSys) {
      mult *= this._factionSys.priceMultiplier(npcRole);
    }

    // Specialty discount (NPC's core trade items)
    if ((shop.specialty ?? []).includes(itemKey)) {
      mult *= 0.90;
    }

    // Economy event
    if (this._activeEvent) {
      const ev = ECONOMY_EVENTS[this._activeEvent];
      if (ev) {
        if (!ev.herbsOnly  && !ev.weaponsOnly) mult *= ev.mult;
        if (ev.herbsOnly   && item.type === 'consumable') mult *= ev.mult;
        if (ev.weaponsOnly && (item.type === 'weapon' || item.type === 'armor')) mult *= ev.mult;
      }
    }

    return Math.max(1, Math.ceil(item.value * mult));
  }

  /**
   * Returns the sell price for an item.
   * Base 50% of value, boosted by Guild standing and economy events.
   */
  sellPrice(itemKey) {
    const item = CONFIG.ITEMS[itemKey];
    if (!item) return 0;

    let   rate = 0.50;

    // Guild standing improves sell rates
    if (this._factionSys) {
      const gs = this._factionSys.standingFor('GUILD');
      const bonus = { HONORED: 0.20, FRIENDLY: 0.10, NEUTRAL: 0, HOSTILE: -0.10, ENEMY: -0.20 };
      rate += bonus[gs] ?? 0;
    }

    // Sell boost from economy event (e.g. crystal storm)
    if (this._activeEvent) {
      const ev = ECONOMY_EVENTS[this._activeEvent];
      if (ev?.sellBoost) {
        const item2 = CONFIG.ITEMS[itemKey];
        if (!ev.gemOnly || item2?.type === 'material') rate *= ev.sellBoost;
      }
    }

    return Math.max(1, Math.floor(item.value * Math.min(1.0, rate)));
  }

  // ── Transactions ─────────────────────────────────────────────────────────

  buy(player, itemKey, npcRole) {
    const price = this.buyPrice(itemKey, npcRole);
    const gold  = player.stats?.gold ?? 0;
    if (gold < price) {
      return { ok: false, msg: `Need ${price}g — you have ${gold}g.` };
    }
    player.stats.gold -= price;
    player.addItem(itemKey);
    player.eventBus?.emit('statsChanged', player.stats);
    return { ok: true, msg: `Bought ${CONFIG.ITEMS[itemKey]?.name ?? itemKey} for ${price}g.` };
  }

  sell(player, itemKey) {
    if (!(player.inventory?.[itemKey] > 0)) {
      return { ok: false, msg: "You don't have that." };
    }
    const price = this.sellPrice(itemKey);
    player.removeItem(itemKey);
    player.stats.gold = (player.stats.gold ?? 0) + price;
    player.eventBus?.emit('statsChanged', player.stats);
    return { ok: true, msg: `Sold ${CONFIG.ITEMS[itemKey]?.name ?? itemKey} for ${price}g.` };
  }

  // ── Economy events ────────────────────────────────────────────────────────

  /** Called by world events system. */
  setPriceBoost(v) { this._priceBoost = v; }

  setEconomyEvent(eventId) {
    this._activeEvent = eventId;
    if (eventId) this._eventHistory.push({ id: eventId, ts: Date.now() });
  }

  clearEconomyEvent() { this._activeEvent = null; }

  getEconomyMessage() {
    if (!this._activeEvent) return null;
    return ECONOMY_EVENTS[this._activeEvent]?.desc ?? null;
  }

  // ── Price display helper (formatted) ─────────────────────────────────────

  priceString(itemKey, npcRole) {
    const buy  = this.buyPrice(itemKey, npcRole);
    const sell = this.sellPrice(itemKey);
    return { buy, sell, display: `${buy}g (sell: ${sell}g)` };
  }
}
