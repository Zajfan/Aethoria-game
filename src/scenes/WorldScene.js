import { CONFIG       } from '../config.js';
import { WorldGen    } from '../systems/WorldGen.js';
import { QuestSystem } from '../systems/QuestSystem.js';
import { SaveSystem  } from '../systems/SaveSystem.js';
import { DayNight    } from '../systems/DayNight.js';
import { Player      } from '../entities/Player.js';
import { Enemy       } from '../entities/Enemy.js';
import { NPC         } from '../entities/NPC.js';

export class WorldScene extends Phaser.Scene {
  constructor() { super('WorldScene'); }

  init(data) {
    this._dungeonReturn = data?.loadFromDungeon || false;
    this._savedPlayer   = data?.savedPlayer     || null;
  }

  create() {
    this.gen     = new WorldGen();
    this.mapData = this.gen.generate(CONFIG.MAP_WIDTH, CONFIG.MAP_HEIGHT);
    this._buildMap();

    const WW = CONFIG.MAP_WIDTH  * CONFIG.TILE_SIZE;
    const WH = CONFIG.MAP_HEIGHT * CONFIG.TILE_SIZE;
    this.physics.world.setBounds(0, 0, WW, WH);

    const cx = Math.floor(CONFIG.MAP_WIDTH  / 2) * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    const cy = Math.floor(CONFIG.MAP_HEIGHT / 2) * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    this.player = new Player(this, cx, cy);

    if (this._savedPlayer) {
      Object.assign(this.player.stats, this._savedPlayer.stats || {});
      this.player.inventory   = { ...(this._savedPlayer.inventory || {}) };
      this.player.equipment   = { ...(this._savedPlayer.equipment || {}) };
      this.player.skills      = { ...(this._savedPlayer.skills    || {}) };
      this.player.playerClass = this._savedPlayer.playerClass || null;
    }

    // Apply chosen class (from MenuScene selection)
    if (!this._savedPlayer && !this.player.playerClass) {
      const cls = localStorage.getItem('aethoria_class') || 'WARRIOR';
      this.player.applyClass(cls);
    }

    this.physics.add.collider(this.player, this.groundLayer);

    this.questSystem = new QuestSystem(this);
    this.saveSystem  = new SaveSystem();
    this.saveSystem.init().catch(() => {});
    this.dayNight    = new DayNight(this);
    this.time.addEvent({ delay: 30000, loop: true, callback: () => this._doSave() });

    this._spawnEnemies();
    this._spawnNPCs();
    this._buildDungeonPortal();

    this.lootGroup = this.add.group();

    this.cameras.main
      .startFollow(this.player, true, 0.09, 0.09)
      .setBounds(0, 0, WW, WH)
      .setZoom(1.6)
      .fadeIn(900, 0, 0, 0);

    this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.iKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
    this.mKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);

    this.input.on('pointerdown', (ptr) => {
      if (ptr.wasTouch || !this.player.attackTarget) {
        const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
        this.player.moveTarget = { x: wp.x, y: wp.y };
      }
    });

    this._setupEvents();
    this.nearbyNPC = null;

    this.scene.launch('UIScene');
    this.time.delayedCall(80, () => {
      const ui = this.scene.get('UIScene');
      if (ui) ui.bindWorld(this);
    });

    if (this._dungeonReturn) {
      this.time.delayedCall(400, () => {
        this.events.emit('damage', this.player.x, this.player.y, '^ Returned from dungeon', '#aaaaff');
      });
    }
  }

  _buildMap() {
    const map = this.make.tilemap({
      data: this.mapData, tileWidth: CONFIG.TILE_SIZE, tileHeight: CONFIG.TILE_SIZE,
    });
    const tileset = map.addTilesetImage('tileset', 'tileset', CONFIG.TILE_SIZE, CONFIG.TILE_SIZE, 0, 0);
    this.groundLayer = map.createLayer(0, tileset, 0, 0).setDepth(0);
    this.groundLayer.setCollision(CONFIG.BLOCKED_TILES);
  }

  _buildDungeonPortal() {
    const dcx = Math.floor(CONFIG.MAP_WIDTH  / 2) + 50;
    const dcy = Math.floor(CONFIG.MAP_HEIGHT / 2) - 10;
    const px  = dcx * CONFIG.TILE_SIZE;
    const py  = dcy * CONFIG.TILE_SIZE;

    const portal = this.add.circle(px, py, 20, 0x4400cc, 0.65).setDepth(4);
    this.tweens.add({ targets: portal, alpha: 0.2, scale: 1.4, duration: 1300, yoyo: true, repeat: -1 });
    this.add.text(px, py - 32, '[ DUNGEON ]', {
      fontFamily:'Courier New', fontSize:'10px', color:'#cc88ff',
    }).setOrigin(0.5).setDepth(5);

    this._portalPos  = { x: px, y: py };
    this._portalUsed = false;
  }

  _spawnEnemies() {
    const types  = Object.keys(CONFIG.ENEMY_TYPES);
    const spawns = this.gen.getEnemySpawns(this.mapData, 45);
    this.enemies = [];

    spawns.forEach((sp, i) => {
      const type  = types[i % types.length];
      const x     = sp.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
      const y     = sp.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
      const enemy = new Enemy(this, x, y, type);
      this.enemies.push(enemy);
      enemy.setInteractive({ useHandCursor: true });
      enemy.on('pointerdown', () => {
        if (!enemy.isDead) { this.player.setTarget(enemy); this.player.moveTarget = null; }
      });
      this.physics.add.collider(enemy, this.groundLayer);
    });
  }

  _spawnNPCs() {
    const cx  = Math.floor(CONFIG.MAP_WIDTH  / 2);
    const cy  = Math.floor(CONFIG.MAP_HEIGHT / 2);
    const pos = this.gen.getNPCSpawns(cx, cy);
    this.npcs = [];
    pos.forEach((p, i) => {
      if (i >= CONFIG.NPCS_DATA.length) return;
      const npc = new NPC(this,
        p.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
        p.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2, i);
      this.npcs.push(npc);
      npc.on('pointerdown', () => this._openDialogue(npc));
    });
  }

  _setupEvents() {
    this.events.on('damage', (x, y, amount, color) => {
      const t = this.add.text(x, y - 12, String(amount), {
        fontFamily:'Courier New', fontSize:'14px', color,
        stroke:'#000000', strokeThickness: 2,
      }).setDepth(60).setOrigin(0.5);
      this.tweens.add({ targets: t, y: y - 46, alpha: 0, duration: 950, onComplete: () => t.destroy() });
    });

    this.events.on('levelUp', (lv) => {
      const t = this.add.text(this.player.x, this.player.y - 24, '* LEVEL ' + lv + '! *', {
        fontFamily:'Courier New', fontSize:'17px', color:'#ffd700',
        stroke:'#000000', strokeThickness: 3,
      }).setDepth(65).setOrigin(0.5);
      this.tweens.add({ targets: t, y: this.player.y - 80, alpha: 0, duration: 2200, onComplete: () => t.destroy() });
    });

    this.events.on('questAdded',    q => this._onQuestAdded(q));
    this.events.on('questComplete', q => this._onQuestComplete(q));
    this.events.on('questProgress', () => { const ui = this.scene.get('UIScene'); if (ui) ui.refreshQuests(this.questSystem); });
    this.events.on('weatherChanged', w => { const ui = this.scene.get('UIScene'); if (ui) ui._logMsg('Weather: ' + w, '#aaccff'); });
    this.events.on('bossKilled', name => this.questSystem?.onKill(name));

    this.events.on('playerDead', () => {
      this.cameras.main.shake(500, 0.012);
      this.cameras.main.fadeOut(1600, 80, 0, 0);
      this.time.delayedCall(1800, () => {
        this.player.stats.hp = this.player.stats.maxHp;
        this.player.setPosition(
          Math.floor(CONFIG.MAP_WIDTH  / 2) * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
          Math.floor(CONFIG.MAP_HEIGHT / 2) * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
        );
        this.player.attackTarget = null;
        this.cameras.main.fadeIn(1000);
        this.events.emit('statsChanged', this.player.stats);
      });
    });
  }

  _onQuestAdded(q) {
    const ui = this.scene.get('UIScene');
    if (ui) { ui._logMsg('New quest: ' + q.title, '#88aaff'); ui.refreshQuests(this.questSystem); }
  }

  _onQuestComplete(q) {
    const ui = this.scene.get('UIScene');
    if (ui) { ui._logMsg('Quest complete: ' + q.title + ' (+' + q.reward.xp + 'xp)', '#ffd700'); ui.refreshQuests(this.questSystem); }
    this._doSave();
  }

  async _doSave() {
    try { await this.saveSystem.save(SaveSystem.snapshotPlayer(this.player, this.questSystem)); }
    catch (_) {}
  }

  spawnLoot(x, y, itemKey) {
    const loot = this.add.sprite(x, y, 'loot').setDepth(5).setInteractive({ useHandCursor: true });
    loot.itemKey = itemKey;
    this.tweens.add({ targets: loot, y: y - 14, duration: 220, yoyo: true, ease: 'Bounce' });
    loot.on('pointerdown', () => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, loot.x, loot.y);
      if (d < 70) {
        this.player.addItem(loot.itemKey);
        this.questSystem?.onCollect(loot.itemKey);
        this.events.emit('damage', loot.x, loot.y, '+' + (CONFIG.ITEMS[loot.itemKey]?.name || loot.itemKey), '#88ff88');
        loot.destroy();
      }
    });
    this.add.text(x, y + 12, CONFIG.ITEMS[itemKey]?.name || itemKey, {
      fontFamily:'Courier New', fontSize:'8px', color:'#ffdd88',
    }).setDepth(5).setOrigin(0.5);
  }

  _openDialogue(npc) {
    const ui = this.scene.get('UIScene');
    if (ui) ui.openDialogue(npc, this.player.stats, this.questSystem);
  }

  _enterDungeon() {
    if (this._portalUsed) return;
    this._portalUsed = true;
    this.questSystem?.onExplore();
    this.cameras.main.fadeOut(700, 80, 0, 80);
    this.time.delayedCall(750, () => {
      const savedPlayer = SaveSystem.snapshotPlayer(this.player, this.questSystem);
      const ui = this.scene.get('UIScene');
      if (ui) this.scene.stop('UIScene');
      this.scene.stop('WorldScene');
      this.scene.start('DungeonScene', { savedPlayer });
    });
  }

  update(time, delta) {
    if (!this.player?.active) return;

    this.player.update(time, delta);
    this.dayNight?.update(delta);
    this.enemies.forEach(e => { if (e.active) e.update(time, delta, this.player); });

    this.nearbyNPC = null;
    this.npcs.forEach(npc => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
      npc.setHintVisible(d < 72);
      npc.syncLabels();
      if (d < 72) this.nearbyNPC = npc;
    });

    if (Phaser.Input.Keyboard.JustDown(this.eKey) && this.nearbyNPC) this._openDialogue(this.nearbyNPC);
    if (Phaser.Input.Keyboard.JustDown(this.iKey)) { const ui = this.scene.get('UIScene'); if (ui) ui.toggleInventory(this.player); }
    if (Phaser.Input.Keyboard.JustDown(this.mKey)) { const ui = this.scene.get('UIScene'); if (ui) ui.toggleWorldMap(this.mapData); }

    if (this._portalPos && !this._portalUsed) {
      const dp = Phaser.Math.Distance.Between(this.player.x, this.player.y, this._portalPos.x, this._portalPos.y);
      if (dp < 32) this._enterDungeon();
    }

    this.enemies.forEach(e => {
      if (e.isDead && !e._questTracked) {
        e._questTracked = true;
        this.questSystem?.onKill(e._data?.name || '');
      }
    });
  }
}
