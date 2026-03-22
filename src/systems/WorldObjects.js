import { CONFIG } from '../config.js';

// Lore fragments that appear on scrolls and signs
const LORE_LINES = [
  'Before the Voidlords came, seven kingdoms flourished beneath the Crystal Crown.',
  'The dungeon was once a royal vault. What sleeps inside now is not what was left there.',
  'Hearthmoor endures because Elder Lyra sealed a bargain with the stones beneath it.',
  'The Wolf-Pack of the Eastern Moor were once men. The Eclipse changed them.',
  'Three Shards lie beyond this realm. Two have been claimed. One is cursed.',
  'A merchant once offered me a gem that wept black tears. I left it where I found it.',
  'The goblins multiply fastest during storms. Do not underestimate them.',
  'This stone marks the edge of the safe ground. What lies beyond answers to no lord.',
  'Gareth forged the Iron Wall alone. He never speaks of what he used as the final ore.',
  'Mira knows which herbs can heal and which can kill. She never confuses them.',
];

const CHEST_TIERS = [
  { color:0xa06020, rimCol:0xc08030, loot:['gold','silver','herb','hide'],       xp:15  },
  { color:0x6688aa, rimCol:0x88aacc, loot:['potion','sword','leather','shield'], xp:35  },
  { color:0xaa8820, rimCol:0xddcc44, loot:['gem','elixir','axe','chainmail'],    xp:80  },
];

export class WorldObjects {
  constructor(scene) {
    this.scene  = scene;
    this.chests = [];
    this.signs  = [];
    this._makeTextures();
  }

  _makeTextures() {
    if (this.scene.textures.exists('chest_wood')) return;

    // Chest sprite: 24x20
    CHEST_TIERS.forEach((tier, i) => {
      const cv = document.createElement('canvas');
      cv.width = 24; cv.height = 20;
      const c = cv.getContext('2d');
      const r = (x,y,w,h,col) => { c.fillStyle=col; c.fillRect(x,y,w,h); };
      // Body
      r(1,5,22,14,'#111111');
      r(2,6,20,12,tier.color);
      // Lid
      r(1,1,22,6,'#111111');
      r(2,2,20,4,tier.rimCol);
      // Latch
      r(10,4,4,4,'#111111');
      r(11,5,2,2,'#ffdd88');
      // Rivets
      [3,19].forEach(x => { r(x,3,2,2,'#ffd700'); r(x,7,2,2,'#ffd700'); });
      // Lock when closed (line on lid/body)
      r(1,5,22,1,'#111111');
      this.scene.textures.addCanvas('chest_' + i, cv);
    });

    // Sign sprite: 20x24
    {
      const cv = document.createElement('canvas');
      cv.width = 20; cv.height = 24;
      const c = cv.getContext('2d');
      const r = (x,y,w,h,col) => { c.fillStyle=col; c.fillRect(x,y,w,h); };
      r(8,16,4,8,'#5a3510');
      r(0,2,20,14,'#111111');
      r(1,3,18,12,'#c8a050');
      r(2,4,16,10,'#d8b060');
      r(3,5,3,1,'#7a5020'); r(3,7,10,1,'#7a5020'); r(3,9,7,1,'#7a5020');
      this.scene.textures.addCanvas('sign', cv);
    }

    // Campfire sprite: 24x20
    {
      const cv = document.createElement('canvas');
      cv.width = 24; cv.height = 20;
      const c = cv.getContext('2d');
      const r = (x,y,w,h,col) => { c.fillStyle=col; c.fillRect(x,y,w,h); };
      r(4,12,16,6,'#5a3510');   // logs
      r(2,14,4,4,'#3a2208');
      r(18,14,4,4,'#3a2208');
      r(8,14,8,2,'#111111');
      r(8,6,8,8,'#dd5500');     // flames
      r(10,4,4,6,'#ee7700');
      r(11,2,2,4,'#ffcc00');
      r(7,8,3,5,'#cc3300');
      r(14,8,3,5,'#cc3300');
      this.scene.textures.addCanvas('campfire', cv);
    }

    // Well sprite: 24x24
    {
      const cv = document.createElement('canvas');
      cv.width = 24; cv.height = 24;
      const c = cv.getContext('2d');
      const r = (x,y,w,h,col) => { c.fillStyle=col; c.fillRect(x,y,w,h); };
      r(4,8,16,12,'#111111');
      r(5,9,14,10,'#708090');
      r(6,10,12,8,'#1a4a80');
      r(6,10,12,2,'#88c8e8');
      r(2,5,2,14,'#5a3510');
      r(20,5,2,14,'#5a3510');
      r(2,5,20,3,'#5a3510');
      r(10,2,4,6,'#3a2208');
      this.scene.textures.addCanvas('well', cv);
    }
  }

  spawnChests(mapData, count = 12) {
    const T    = CONFIG.TILE_SIZE;
    const safe = new Set([CONFIG.TILES.GRASS, CONFIG.TILES.PATH,
                          CONFIG.TILES.DUNGEON_FLOOR, CONFIG.TILES.TOWN_FLOOR]);
    const cx   = Math.floor(mapData[0].length / 2);
    const cy   = Math.floor(mapData.length    / 2);
    let   placed = 0, tries = 0;

    while (placed < count && tries < count * 20) {
      tries++;
      const tx = Phaser.Math.Between(4, mapData[0].length - 4);
      const ty = Phaser.Math.Between(4, mapData.length    - 4);
      if (!safe.has(mapData[ty]?.[tx])) continue;
      const d = Math.hypot(tx - cx, ty - cy);
      if (d < 10) continue;

      // Tier = distance-weighted
      const tier = d > 45 ? 2 : d > 25 ? 1 : 0;
      const x = tx * T + T / 2, y = ty * T + T / 2;

      const spr = this.scene.add.sprite(x, y, 'chest_' + tier)
        .setDepth(4).setInteractive({ useHandCursor: true });
      spr.tierData  = CHEST_TIERS[tier];
      spr.opened    = false;

      spr.on('pointerdown', () => this._openChest(spr));

      // Subtle glow pulse for gold-tier
      if (tier === 2) {
        this.scene.tweens.add({ targets:spr, alpha:0.7, duration:900, yoyo:true, repeat:-1 });
      }

      this.chests.push(spr);
      placed++;
    }
  }

  _openChest(spr) {
    if (spr.opened) return;
    const player = this.scene.player;
    if (!player) return;
    const dist = Phaser.Math.Distance.Between(player.x, player.y, spr.x, spr.y);
    if (dist > 72) {
      this.scene.events.emit('damage', spr.x, spr.y - 20, 'Too far!', '#ff8888');
      return;
    }

    spr.opened = true;
    spr.setTint(0x888888);
    this.scene.tweens.killTweensOf(spr);

    // Drop loot
    const { loot, xp } = spr.tierData;
    const drops = [
      loot[Math.floor(Math.random() * loot.length)],
      Math.random() > 0.5 ? loot[Math.floor(Math.random() * loot.length)] : null,
    ].filter(Boolean);

    drops.forEach((item, i) => {
      this.scene.time.delayedCall(i * 200, () => {
        const ox = spr.x + Phaser.Math.Between(-20, 20);
        const oy = spr.y + Phaser.Math.Between(-20, 20);
        this.scene.spawnLoot(ox, oy, item);
      });
    });

    player.gainXP(xp);
    this.scene.audio?.sfxPickup();
    this.scene._burst?.(spr.x, spr.y, 0xffd700, 12);
    this.scene.events.emit('damage', spr.x, spr.y - 16, 'Chest opened!', '#ffd700');
  }

  spawnSigns(positions) {
    positions.forEach(({ x, y, text }) => {
      const spr = this.scene.add.sprite(x, y, 'sign').setDepth(4)
        .setInteractive({ useHandCursor: true });
      const label = text || LORE_LINES[Math.floor(Math.random() * LORE_LINES.length)];
      spr.on('pointerdown', () => {
        const ui = this.scene.scene.get('UIScene');
        if (ui) ui._logMsg('"' + label + '"', '#d4af37');
        this.scene.audio?.sfxUIOpen();
      });
      this.signs.push(spr);
    });
  }

  spawnCampfire(x, y) {
    const spr = this.scene.add.sprite(x, y, 'campfire').setDepth(4);
    // Flicker animation
    this.scene.tweens.add({ targets:spr, scaleY:1.12, duration:180,
      yoyo:true, repeat:-1, ease:'Sine.InOut' });
    // Warm light circle
    const glow = this.scene.add.circle(x, y+4, 28, 0xff6600, 0.08).setDepth(3);
    this.scene.tweens.add({ targets:glow, alpha:0.02, scale:1.2, duration:300,
      yoyo:true, repeat:-1 });
    return spr;
  }

  spawnWell(x, y) {
    return this.scene.add.sprite(x, y, 'well').setDepth(4)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        const p = this.scene.player;
        if (!p) return;
        if (Phaser.Math.Distance.Between(p.x, p.y, x, y) > 80) {
          this.scene.events.emit('damage', x, y-20, 'Too far!', '#ff8888');
          return;
        }
        const healed = Math.floor(p.stats.maxHp * 0.15);
        p.stats.hp = Math.min(p.stats.maxHp, p.stats.hp + healed);
        this.scene.events.emit('statsChanged', p.stats);
        this.scene.events.emit('damage', x, y-20, '+'+healed+' HP (well)', '#44ff88');
        this.scene.audio?.sfxPickup();
      });
  }
}
