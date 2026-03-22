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
    // ── World generation ────────────────────────────────────
    this.gen     = new WorldGen();
    this.mapData = this.gen.generate(CONFIG.MAP_WIDTH, CONFIG.MAP_HEIGHT);
    this._buildMap();

    const WW = CONFIG.MAP_WIDTH  * CONFIG.TILE_SIZE;
    const WH = CONFIG.MAP_HEIGHT * CONFIG.TILE_SIZE;
    this.physics.world.setBounds(0, 0, WW, WH);

    // ── Player ──────────────────────────────────────────────
    const cx = Math.floor(CONFIG.MAP_WIDTH  / 2) * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    const cy = Math.floor(CONFIG.MAP_HEIGHT / 2) * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    this.player = new Player(this, cx, cy);
    // Restore from dungeon return or saved game
    if (this._savedPlayer) {
      Object.assign(this.player.stats, this._savedPlayer.stats || {});
      this.player.inventory   = { ...(this._savedPlayer.inventory || {}) };
      this.player.equipment   = { ...(this._savedPlayer.equipment || {}) };
      this.player.skills      = { ...(this._savedPlayer.skills    || {}) };
      this.player.playerClass = this._savedPlayer.playerClass || null;
    }

    this.physics.add.collider(this.player, this.groundLayer);

    // Systems
    this.questSystem = new QuestSystem(this);
    this.saveSystem  = new SaveSystem();
    this.saveSystem.init().catch(()=>{});
    this.dayNight    = new DayNight(this);

    // Auto-save every 30 seconds
    this.time.addEvent({ delay:30000, loop:true, callback: () => this._doSave() });

    // ── Enemies ─────────────────────────────────────────────
    this._spawnEnemies();

    // ── NPCs ────────────────────────────────────────────────
    this._spawnNPCs();

    // ── Loot group ──────────────────────────────────────────
    this.lootGroup = this.add.group();

    // ── Camera ──────────────────────────────────────────────
    this.cameras.main
      .startFollow(this.player, true, 0.09, 0.09)
      .setBounds(0, 0, WW, WH)
      .setZoom(1.6)
      .fadeIn(900, 0, 0, 0);

    // ── Input ───────────────────────────────────────────────
    this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.iKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);

    // Touch/click-to-move (empty ground)
    this.input.on('pointerdown', (ptr) => {
      if (ptr.wasTouch || !this.player.attackTarget) {
        const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
        this.player.moveTarget = { x: wp.x, y: wp.y };
      }
    });

    // ── Events ──────────────────────────────────────────────
    this._setupEvents();

    // ── Tracking ────────────────────────────────────────────
    this.nearbyNPC = null;

    // ── Launch UI ───────────────────────────────────────────
    this.scene.launch('UIScene');
    this.time.delayedCall(80, () => {
      const ui = this.scene.get('UIScene');
      if (ui) ui.bindWorld(this);
    });
  }

  /* ──────────────────────────────────────────────────────── */
  _buildMap() {
    const map = this.make.tilemap({
      data:       this.mapData,
      tileWidth:  CONFIG.TILE_SIZE,
      tileHeight: CONFIG.TILE_SIZE,
    });
    const tileset = map.addTilesetImage('tileset', 'tileset', CONFIG.TILE_SIZE, CONFIG.TILE_SIZE, 0, 0);
    this.groundLayer = map.createLayer(0, tileset, 0, 0).setDepth(0);
    this.groundLayer.setCollision(CONFIG.BLOCKED_TILES);
  }

  _spawnEnemies() {
    const types   = Object.keys(CONFIG.ENEMY_TYPES);
    const spawns  = this.gen.getEnemySpawns(this.mapData, 45);
    this.enemies  = [];

    spawns.forEach((sp, i) => {
      const type  = types[i % types.length];
      const x     = sp.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
      const y     = sp.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
      const enemy = new Enemy(this, x, y, type);
      this.enemies.push(enemy);

      enemy.setInteractive({ useHandCursor: true });
      enemy.on('pointerdown', () => {
        if (!enemy.isDead) {
          this.player.setTarget(enemy);
          this.player.moveTarget = null;
        }
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
      const x   = p.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
      const y   = p.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
      const npc = new NPC(this, x, y, i);
      this.npcs.push(npc);

      npc.on('pointerdown', () => this._openDialogue(npc));
    });
  }

  _setupEvents() {
    this.events.on('damage', (x, y, amount, color) => {
      const t = this.add.text(x, y - 12, String(amount), {
        fontFamily:'Courier New', fontSize:'14px', color,
        stroke:'#000000', strokeThickness:2,
      }).setDepth(60).setOrigin(0.5);
      this.tweens.add({ targets:t, y:y-46, alpha:0, duration:950, onComplete:()=>t.destroy() });
    });

    this.events.on('levelUp', (lv) => {
      const t = this.add.text(this.player.x, this.player.y - 24, '★ LEVEL ' + lv + '! ★', {
        fontFamily:'Courier New', fontSize:'17px', color:'#ffd700',
        stroke:'#000000', strokeThickness:3,
      }).setDepth(65).setOrigin(0.5);
      this.tweens.add({ targets:t, y:this.player.y-80, alpha:0, duration:2200, onComplete:()=>t.destroy() });
    });

    this.events.on('questAdded',    q   => this._onQuestAdded(q));
    this.events.on('questComplete', q   => this._onQuestComplete(q));
    this.events.on('questProgress', q   => { const ui = this.scene.get('UIScene'); if(ui) ui.refreshQuests(this.questSystem); });
    this.events.on('weatherChanged',w   => { const ui = this.scene.get('UIScene'); if(ui) ui._logMsg('Weather: '+w,'#aaccff'); });
    this.events.on('bossKilled',    n   => { this.questSystem?.onKill(n); });

    this.events.on('playerDead', () => {
      this.cameras.main.shake(500, 0.012);
      this.cameras.main.fadeOut(1600, 80, 0, 0);
      this.time.delayedCall(1800, () => {
        this.player.stats.hp = this.player.stats.maxHp;
        this.player.setPosition(
          Math.floor(CONFIG.MAP_WIDTH  / 2) * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2,
          Math.floor(CONFIG.MAP_HEIGHT / 2) * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2,
        );
        this.player.attackTarget = null;
        this.cameras.main.fadeIn(1000);
        this.events.emit('statsChanged', this.player.stats);
      });
    });
  }

  spawnLoot(x, y, itemKey) {
    const loot = this.add.sprite(x, y, 'loot').setDepth(5).setInteractive({ useHandCursor:true });
    loot.itemKey = itemKey;
    this.tweens.add({ targets:loot, y:y-14, duration:220, yoyo:true, ease:'Bounce' });

    loot.on('pointerdown', () => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, loot.x, loot.y);
      if (d < 70) {
        this.player.addItem(loot.itemKey);
        const label = CONFIG.ITEMS[loot.itemKey]?.name || loot.itemKey;
        this.events.emit('damage', loot.x, loot.y, '+' + label, '#88ff88');
        loot.destroy();
      }
    });

    // Auto-pickup label
    this.add.text(x, y + 12, CONFIG.ITEMS[itemKey]?.name || itemKey, {
      fontFamily:'Courier New', fontSize:'8px', color:'#ffdd88',
    }).setDepth(5).setOrigin(0.5).setData('lootRef', loot);
  }

  _openDialogue(npc) {
    const ui = this.scene.get('UIScene');
    if (ui) ui.openDialogue(npc, this.player.stats);
  }

  /* ── Update loop ────────────────────────────────────────── */
  update(time, delta) {
    if (!this.player?.active) return;

    this.player.update(time, delta);

    this.enemies.forEach(e => { if (e.active) e.update(time, delta, this.player); });

    // NPC proximity hints + E key
    this.nearbyNPC = null;
    this.npcs.forEach(npc => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
      npc.setHintVisible(d < 72);
      npc.syncLabels();
      if (d < 72) this.nearbyNPC = npc;
    });

    if (Phaser.Input.Keyboard.JustDown(this.eKey) && this.nearbyNPC) {
      this._openDialogue(this.nearbyNPC);
    }

    if (Phaser.Input.Keyboard.JustDown(this.iKey)) {
      const ui = this.scene.get('UIScene');
      if (ui) ui.toggleInventory(this.player);
    }
  }
}
