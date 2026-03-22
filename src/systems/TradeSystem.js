import { CONFIG } from '../config.js';

const SHOP_STOCK = {
  'Village Elder': { items: ['herb', 'potion'],          mult: 0.9  },
  'Blacksmith':    { items: ['sword', 'shield'],         mult: 1.2  },
  'Herbalist':     { items: ['herb', 'herb', 'potion'],  mult: 0.85 },
  'Merchant':      { items: ['gem', 'potion', 'sword', 'shield', 'herb'], mult: 1.5 },
  'Guard Captain': { items: ['sword', 'shield'],         mult: 1.1  },
};

export class TradeSystem {
  constructor() {
    this._priceBoost = 1.0; // set by world events
  }

  getShop(npcRole) {
    return SHOP_STOCK[npcRole] || { items: [], mult: 1 };
  }

  hasShop(npcRole) {
    const s = this.getShop(npcRole);
    return s.items.length > 0;
  }

  buyPrice(itemKey, npcRole) {
    const item = CONFIG.ITEMS[itemKey];
    if (!item) return 0;
    const { mult } = this.getShop(npcRole);
    return Math.ceil(item.value * mult * this._priceBoost);
  }

  sellPrice(itemKey) {
    const item = CONFIG.ITEMS[itemKey];
    return item ? Math.floor(item.value * 0.5) : 0;
  }

  buy(player, itemKey, npcRole) {
    const price = this.buyPrice(itemKey, npcRole);
    if ((player.stats.gold || 0) < price)
      return { ok: false, msg: 'Need ' + price + 'g — you only have ' + (player.stats.gold || 0) + 'g.' };
    player.stats.gold -= price;
    player.addItem(itemKey);
    player.scene.events.emit('statsChanged', player.stats);
    return { ok: true, msg: 'Bought ' + CONFIG.ITEMS[itemKey]?.name + ' for ' + price + 'g.' };
  }

  sell(player, itemKey) {
    if (!(player.inventory[itemKey] > 0))
      return { ok: false, msg: "You don't have that." };
    const price = this.sellPrice(itemKey);
    player.removeItem(itemKey);
    player.stats.gold += price;
    player.scene.events.emit('statsChanged', player.stats);
    return { ok: true, msg: 'Sold for ' + price + 'g.' };
  }

  setPriceBoost(v) { this._priceBoost = v; }
}
