import { CONFIG  } from '../config.js';
import { Player  } from '../entities/Player.js';
import { Enemy   } from '../entities/Enemy.js';
import { Boss    } from '../entities/Boss.js';

const TILE = CONFIG.TILE_SIZE;
const T    = CONFIG.TILES;

export class DungeonScene extends Phaser.Scene {
  constructor() { super('DungeonScene'); }

  init(data) {
    this._saveData = data?.saveData || null;
    this._returnX  = data?.returnX  || 0;
    this._returnY  = data?.returnY  || 0;
  }

  create() {
    const W = 60, H = 60;
    this.mapW = W; this.mapH = H;
    this.mapData = this._generateDungeon(W, H);
    this._buildMap(W, H);

    this.physics.world.setBounds(0, 0, W * TILE, H * TILE);
    this.cameras.main.setBounds(0, 0, W * TILE, H * TILE);

    // Player starts at entrance
    const spawnTile = this._findTile(T.DUNGEON_FLOOR, 5, 5);
    this.player = new Player(this, spawnTile.x * TILE + TILE/2, spawnTile.y * TILE + TILE/2);

    if (this._saveData) {
      Object.assign(this.player.stats, this._saveData.stats || {});
      this.player.inventory  = { ...(this._saveData.inventory || {}) };
      this.player.equipment  = { ...(this._saveData.equipment || {}) };
      this.player.skills     = { ...(this._saveData.skills || {}) };
      this.player.playerClass = this._saveData.playerClass || null;
    }

    this.physics.add.collider(this.player, this.groundLayer);
    this._spawnEnemies();
    this._spawnBoss();

    this.cameras.main.startFollow(this.player, true, 0.09, 0.09).setZoom(1.8).fadeIn(600);

    this.lootGroup = this.add.group();
    this.enemies   = this.enemies || [];

    // Exit portal
    const exitTile = this._findTile(T.DUNGEON_FLOOR, W - 6, H - 6);
    const portal   = this.add.circle(exitTile.x * TILE + TILE/2, exitTile.y * TILE + TILE/2, 16, 0x4444ff, 0.7).setDepth(4);
    this.tweens.add({ targets: portal, alpha:0.3, scale:1.3, duration:1100, yoyo:true, repeat:-1 });
    this.add.text(portal.x, portal.y - 26, '[ EXIT ]', {
      fontFamily:'Courier New', fontSize:'10px', color:'#aaaaff',
    }).setOrigin(0.5).setDepth(5);
    this._exitPortal = portal;
    this._exitPos = { x: exitTile.x * TILE + TILE/2, y: exitTile.y * TILE + TILE/2 };

    this._setupEvents();
    this.scene.launch('UIScene');
    this.time.delayedCall(80, () => {
      const ui = this.scene.get('UIScene');
      if (ui) ui.bindWorld(this);
    });

    // Controls
    this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.iKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
  }

  _generateDungeon(W, H) {
    const data = Array.from({ length: H }, () => Array(W).fill(T.DUNGEON_WALL));
    const rooms = [];

    // Carve rooms
    for (let i = 0; i < 14; i++) {
      const rw = Phaser.Math.Between(5, 10);
      const rh = Phaser.Math.Between(4, 8);
      const rx = Phaser.Math.Between(2, W - rw - 2);
      const ry = Phaser.Math.Between(2, H - rh - 2);
      for (let y = ry; y < ry + rh; y++)
        for (let x = rx; x < rx + rw; x++) data[y][x] = T.DUNGEON_FLOOR;
      rooms.push({ cx: rx + rw/2|0, cy: ry + rh/2|0 });
    }

    // Connect rooms with corridors
    for (let i = 1; i < rooms.length; i++) {
      const a = rooms[i-1], b = rooms[i];
      let x = a.cx, y = a.cy;
      while (x !== b.cx) { data[y][x] = T.DUNGEON_FLOOR; x += x < b.cx ? 1 : -1; }
      while (y !== b.cy) { data[y][x] = T.DUNGEON_FLOOR; y += y < b.cy ? 1 : -1; }
    }

    return data;
  }

  _buildMap(W, H) {
    const map = this.make.tilemap({
      data: this.mapData, tileWidth: TILE, tileHeight: TILE,
    });
    const tileset    = map.addTilesetImage('tileset', 'tileset', TILE, TILE, 0, 0);
    this.groundLayer = map.createLayer(0, tileset, 0, 0).setDepth(0);
    this.groundLayer.setCollision(CONFIG.BLOCKED_TILES);
  }

  _findTile(type, preferX, preferY) {
    let best = null, bestD = 99999;
    for (let y = 0; y < this.mapH; y++) {
      for (let x = 0; x < this.mapW; x++) {
        if (this.mapData[y][x] !== type) continue;
        const d = Math.hypot(x - preferX, y - preferY);
        if (d < bestD) { bestD = d; best = { x, y }; }
      }
    }
    return best || { x: 5, y: 5 };
  }

  _spawnEnemies() {
    this.enemies = [];
    const types = Object.keys(CONFIG.ENEMY_TYPES);
    for (let i = 0; i < 20; i++) {
      const t = this._findTile(T.DUNGEON_FLOOR, Phaser.Math.Between(8, this.mapW-8), Phaser.Math.Between(8, this.mapH-8));
      if (!t) continue;
      const e = new Enemy(this, t.x*TILE+TILE/2, t.y*TILE+TILE/2, types[i % types.length]);
      e.setInteractive({ useHandCursor:true });
      e.on('pointerdown', () => { if (!e.isDead) { this.player.setTarget(e); this.player.moveTarget = null; } });
      this.physics.add.collider(e, this.groundLayer);
      this.enemies.push(e);
    }
  }

  _spawnBoss() {
    const bossKeys = Object.keys(CONFIG.BOSS_TYPES);
    const key = bossKeys[Math.floor(Math.random() * bossKeys.length)];
    const t   = this._findTile(T.DUNGEON_FLOOR, this.mapW - 10, this.mapH - 10);
    if (!t) return;
    this.boss = new Boss(this, t.x*TILE+TILE/2, t.y*TILE+TILE/2, key);
    this.boss.setInteractive({ useHandCursor:true });
    this.boss.on('pointerdown', () => { if (!this.boss.isDead) this.player.setTarget(this.boss); });
  }

  _setupEvents() {
    this.events.on('damage', (x, y, amount, color) => {
      const t = this.add.text(x, y-12, String(amount), {
        fontFamily:'Courier New', fontSize:'14px', color,
        stroke:'#000000', strokeThickness:2,
      }).setDepth(60).setOrigin(0.5);
      this.tweens.add({ targets:t, y:y-46, alpha:0, duration:950, onComplete:()=>t.destroy() });
    });
    this.events.on('levelUp', (lv) => {
      const t = this.add.text(this.player.x, this.player.y-24, '★ LEVEL '+lv+' ★', {
        fontFamily:'Courier New', fontSize:'16px', color:'#ffd700', stroke:'#000', strokeThickness:3,
      }).setDepth(65).setOrigin(0.5);
      this.tweens.add({ targets:t, y:this.player.y-80, alpha:0, duration:2200, onComplete:()=>t.destroy() });
    });
    this.events.on('bossPhase', msg => {
      const t = this.add.text(this.cameras.main.scrollX + this.cameras.main.width/2,
        this.cameras.main.scrollY + this.cameras.main.height * 0.3, msg, {
        fontFamily:'Courier New', fontSize:'18px', color:'#ff44ff',
        stroke:'#000', strokeThickness:4,
      }).setDepth(70).setOrigin(0.5);
      this.tweens.add({ targets:t, alpha:0, duration:2800, delay:800, onComplete:()=>t.destroy() });
      this.cameras.main.shake(350, 0.014);
    });
    this.events.on('playerDead', () => {
      this.cameras.main.fadeOut(1400, 80, 0, 0);
      this.time.delayedCall(1600, () => this._exitDungeon());
    });
    this.events.on('bossKilled', () => {
      this.time.delayedCall(2200, () => {
        const t = this.add.text(
          this.cameras.main.scrollX + this.cameras.main.width/2,
          this.cameras.main.scrollY + this.cameras.main.height/2,
          'BOSS DEFEATED\nReturn to the exit!', {
          fontFamily:'Courier New', fontSize:'20px', color:'#ffd700',
          stroke:'#000', strokeThickness:4, align:'center',
        }).setDepth(70).setOrigin(0.5);
        this.tweens.add({ targets:t, alpha:0, duration:3000, delay:2000, onComplete:()=>t.destroy() });
      });
    });
  }

  spawnLoot(x, y, itemKey) {
    const loot = this.add.sprite(x, y, 'loot').setDepth(5).setInteractive({ useHandCursor:true });
    loot.itemKey = itemKey;
    loot.on('pointerdown', () => {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, loot.x, loot.y) < 70) {
        this.player.addItem(loot.itemKey);
        this.events.emit('damage', loot.x, loot.y, '+' + (CONFIG.ITEMS[loot.itemKey]?.name || loot.itemKey), '#88ff88');
        loot.destroy();
      }
    });
  }

  _exitDungeon() {
    this.cameras.main.fadeOut(800, 0, 0, 0);
    this.time.delayedCall(850, () => {
      const ui = this.scene.get('UIScene');
      if (ui) this.scene.stop('UIScene');
      this.scene.stop('DungeonScene');
      this.scene.start('WorldScene', { loadFromDungeon: true, savedPlayer: {
        stats: { ...this.player.stats },
        inventory: { ...this.player.inventory },
        equipment: { ...this.player.equipment },
        skills: { ...(this.player.skills || {}) },
        playerClass: this.player.playerClass,
      }});
    });
  }

  update(time, delta) {
    if (!this.player?.active) return;
    this.player.update(time, delta);
    this.enemies.forEach(e => { if (e.active && !e.isDead) e.update(time, delta, this.player); });
    if (this.boss?.active && !this.boss.isDead) this.boss.update(time, delta, this.player);

    // Exit portal check
    if (this._exitPos) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, this._exitPos.x, this._exitPos.y);
      if (d < 28) this._exitDungeon();
    }

    if (Phaser.Input.Keyboard.JustDown(this.iKey)) {
      const ui = this.scene.get('UIScene');
      if (ui) ui.toggleInventory(this.player);
    }
  }
}
