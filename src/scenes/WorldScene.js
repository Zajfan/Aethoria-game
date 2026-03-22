import { CONFIG            } from '../config.js';
import { WorldGen          } from '../systems/WorldGen.js';
import { QuestSystem       } from '../systems/QuestSystem.js';
import { SaveSystem        } from '../systems/SaveSystem.js';
import { DayNight          } from '../systems/DayNight.js';
import { AudioSystem       } from '../systems/AudioSystem.js';
import { TradeSystem       } from '../systems/TradeSystem.js';
import { WorldEvents       } from '../systems/WorldEvents.js';
import { AchievementSystem } from '../systems/AchievementSystem.js';
import { AIMemory          } from '../systems/AIMemory.js';
import { Player            } from '../entities/Player.js';
import { Enemy             } from '../entities/Enemy.js';
import { NPC               } from '../entities/NPC.js';

export class WorldScene extends Phaser.Scene {
  constructor() { super('WorldScene'); }

  init(data) {
    this._dungeonReturn = data?.loadFromDungeon || false;
    this._savedPlayer   = data?.savedPlayer     || null;
  }

  create() {
    // World
    this.gen     = new WorldGen();
    this.mapData = this.gen.generate(CONFIG.MAP_WIDTH, CONFIG.MAP_HEIGHT);
    this._buildMap();

    const WW = CONFIG.MAP_WIDTH  * CONFIG.TILE_SIZE;
    const WH = CONFIG.MAP_HEIGHT * CONFIG.TILE_SIZE;
    this.physics.world.setBounds(0, 0, WW, WH);

    // Player
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

    // Apply class if first run
    if (!this.player.playerClass) {
      const cls = localStorage.getItem('aethoria_class') || 'WARRIOR';
      this.player.applyClass(cls);
    }

    this.physics.add.collider(this.player, this.groundLayer);

    // Systems
    this.questSystem  = new QuestSystem(this);
    this.saveSystem   = new SaveSystem();
    this.saveSystem.init().catch(() => {});
    this.dayNight     = new DayNight(this);
    this.audio        = new AudioSystem();
    this.audio.init();
    this.tradeSystem  = new TradeSystem();
    this.worldEvents  = new WorldEvents(this);
    this.achievements = new AchievementSystem(this);

    // Share trade system reference for NPC shop labels
    this.registry.set('tradeSystem', this.tradeSystem);

    // Auto-save every 30s
    this.time.addEvent({ delay: 30000, loop: true, callback: () => this._doSave() });

    // Entities
    this._spawnEnemies();
    this._spawnNPCs();
    this._buildDungeonPortal();
    this.lootGroup = this.add.group();

    // Camera
    this.cameras.main
      .startFollow(this.player, true, 0.09, 0.09)
      .setBounds(0, 0, WW, WH)
      .setZoom(1.6)
      .fadeIn(900, 0, 0, 0);

    // Input
    this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.iKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
    this.mKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);

    this.input.on('pointerdown', ptr => {
      // Only move if clicking empty ground — not enemies, NPCs, loot, or UI
      const hits = this.input.hitTestPointer(ptr);
      if (hits.length > 0) return;
      // Also skip if any UI panel is open
      const ui = this.scene.get('UIScene');
      if (ui?.invOpen || ui?.questOpen || ui?.skillOpen || ui?.mapOpen || ui?.statsOpen || ui?.tradeOpen) return;
      const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
      this.player.moveTarget = { x: wp.x, y: wp.y };
    });

    // First interaction unlocks AudioContext
    this.input.once('pointerdown', () => this.audio._resume?.());

    this._setupEvents();
    this.nearbyNPC = null;

    // UI
    this.scene.launch('UIScene');
    this.time.delayedCall(80, () => {
      const ui = this.scene.get('UIScene');
      if (ui) ui.bindWorld(this);
    });

    if (this._dungeonReturn) {
      AIMemory.recordDungeonRun();
      this.time.delayedCall(400, () => {
        this.events.emit('damage', this.player.x, this.player.y, '^ Back from dungeon', '#aaaaff');
      });
    }

    // Start ambient audio after short delay
    this.time.delayedCall(800, () => this.audio.startAmbience('day'));
  }

  /* ── Map ──────────────────────────────────────────────── */
  _buildMap() {
    const map = this.make.tilemap({
      data: this.mapData, tileWidth: CONFIG.TILE_SIZE, tileHeight: CONFIG.TILE_SIZE,
    });
    const ts = map.addTilesetImage('tileset', 'tileset', CONFIG.TILE_SIZE, CONFIG.TILE_SIZE, 0, 0);
    this.groundLayer = map.createLayer(0, ts, 0, 0).setDepth(0);
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

  /* ── Enemies ──────────────────────────────────────────── */
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

  /* ── NPCs ─────────────────────────────────────────────── */
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

  /* ── Events ───────────────────────────────────────────── */
  _setupEvents() {
    this.events.on('damage', (x, y, amount, color) => {
      const t = this.add.text(x, y - 12, String(amount), {
        fontFamily:'Courier New', fontSize:'14px', color,
        stroke:'#000000', strokeThickness: 2,
      }).setDepth(60).setOrigin(0.5);
      this.tweens.add({ targets: t, y: y - 46, alpha: 0, duration: 950, onComplete: () => t.destroy() });
    });

    this.events.on('levelUp', lv => {
      AIMemory.recordLevelUp(lv);
      this.achievements.set('level', lv);
      this.audio.sfxLevelUp();
      this._burst(this.player.x, this.player.y, 0xffd700, 20);
      const t = this.add.text(this.player.x, this.player.y - 24, '* LEVEL ' + lv + '! *', {
        fontFamily:'Courier New', fontSize:'17px', color:'#ffd700',
        stroke:'#000000', strokeThickness: 3,
      }).setDepth(65).setOrigin(0.5);
      this.tweens.add({ targets: t, y: this.player.y - 80, alpha: 0, duration: 2200, onComplete: () => t.destroy() });
    });

    this.events.on('questAdded',    q => { this._onQuestAdded(q); this.audio.sfxQuestGet(); });
    this.events.on('questComplete', q => {
      this._onQuestComplete(q);
      AIMemory.recordQuestDone(q.title);
      this.achievements.track('quests');
    });
    this.events.on('questProgress', () => {
      const ui = this.scene.get('UIScene'); if (ui) ui.refreshQuests(this.questSystem);
    });

    this.events.on('weatherChanged', w => {
      const ui = this.scene.get('UIScene');
      if (ui) ui._logMsg('Weather: ' + w, '#aaccff');
      if (w === 'STORM') this.audio.startAmbience('storm');
      else if (w === 'CLEAR') this.audio.startAmbience('day');
    });

    this.events.on('bossKilled', name => {
      this.questSystem?.onKill(name);
      AIMemory.recordBossKill(name);
      this.achievements.track('bosses');
      this.audio.sfxBossDeath();
    });

    this.events.on('achievement', ach => {
      this.audio.sfxAchieve();
      const ui = this.scene.get('UIScene');
      if (ui) ui.showAchievement(ach);
    });

    this.events.on('worldEvent', ev => {
      const ui = this.scene.get('UIScene');
      if (ui) ui.showWorldEvent(ev);
      this.audio.sfxWorldEvent();
      this._burst(this.player.x, this.player.y, ev.color, 28);
    });

    this.events.on('worldEventEnd', ev => {
      const ui = this.scene.get('UIScene');
      if (ui) ui._logMsg(ev.name + ' has ended.', '#888888');
    });

    this.events.on('statsChanged', s => {
      this.achievements.set('gold', s.gold || 0);
      this.achievements.set('level', s.level || 1);
    });

    this.events.on('playerDead', () => {
      this.audio.sfxPlayerHit();
      this.achievements.track('deaths');
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

  /* ── Particle burst ───────────────────────────────────── */
  _burst(x, y, color, count = 14) {
    for (let i = 0; i < count; i++) {
      const p   = this.add.circle(x, y, Phaser.Math.Between(2, 5), color, 0.9).setDepth(58);
      const ang = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 100;
      const dx  = Math.cos(ang) * spd;
      const dy  = Math.sin(ang) * spd;
      this.tweens.add({
        targets: p, x: x + dx, y: y + dy - 30,
        alpha: 0, scaleX: 0, scaleY: 0,
        duration: 500 + Math.random() * 400,
        ease: 'Power2',
        onComplete: () => p.destroy(),
      });
    }
  }

  /* ── Quest helpers ────────────────────────────────────── */
  _onQuestAdded(q) {
    const ui = this.scene.get('UIScene');
    if (ui) { ui._logMsg('New quest: ' + q.title, '#88aaff'); ui.refreshQuests(this.questSystem); }
  }

  _onQuestComplete(q) {
    const ui = this.scene.get('UIScene');
    if (ui) { ui._logMsg('Quest done: ' + q.title + '  (+' + q.reward.xp + 'xp)', '#ffd700'); ui.refreshQuests(this.questSystem); }
    this._doSave();
  }

  async _doSave() {
    try { await this.saveSystem.save(SaveSystem.snapshotPlayer(this.player, this.questSystem)); }
    catch (_) {}
  }

  /* ── Loot ─────────────────────────────────────────────── */
  spawnLoot(x, y, itemKey) {
    const loot = this.add.sprite(x, y, 'loot').setDepth(5).setInteractive({ useHandCursor: true });
    loot.itemKey = itemKey;
    this.tweens.add({ targets: loot, y: y - 14, duration: 220, yoyo: true, ease: 'Bounce' });
    loot.on('pointerdown', () => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, loot.x, loot.y);
      if (d < 70) {
        this.player.addItem(loot.itemKey);
        this.questSystem?.onCollect(loot.itemKey);
        this.audio.sfxPickup();
        this.events.emit('damage', loot.x, loot.y, '+' + (CONFIG.ITEMS[loot.itemKey]?.name || loot.itemKey), '#88ff88');
        loot.destroy();
      }
    });
    this.add.text(x, y + 12, CONFIG.ITEMS[itemKey]?.name || itemKey, {
      fontFamily:'Courier New', fontSize:'8px', color:'#ffdd88',
    }).setDepth(5).setOrigin(0.5);
  }

  /* ── Dialogue ─────────────────────────────────────────── */
  _openDialogue(npc) {
    const ui = this.scene.get('UIScene');
    if (ui) {
      this.audio.sfxUIOpen();
      ui.openDialogue(npc, this.player.stats, this.questSystem, this.tradeSystem, this.worldEvents);
    }
  }

  /* ── Dungeon portal ───────────────────────────────────── */
  _enterDungeon() {
    if (this._portalUsed) return;
    this._portalUsed = true;
    this.questSystem?.onExplore();
    this.achievements.track('dungeons');
    AIMemory.recordDungeonRun();
    this.audio.sfxPortal();
    this.cameras.main.fadeOut(700, 80, 0, 80);
    this.time.delayedCall(750, () => {
      const savedPlayer = SaveSystem.snapshotPlayer(this.player, this.questSystem);
      const ui = this.scene.get('UIScene');
      if (ui) this.scene.stop('UIScene');
      this.scene.stop('WorldScene');
      this.scene.start('DungeonScene', { savedPlayer });
    });
  }

  /* ── Update ───────────────────────────────────────────── */
  update(time, delta) {
    if (!this.player?.active) return;

    this.player.update(time, delta);
    this.dayNight?.update(delta);
    this.worldEvents?.update(delta);
    this.enemies.forEach(e => { if (e.active) e.update(time, delta, this.player); });

    this.nearbyNPC = null;
    this.npcs.forEach(npc => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
      npc.setHintVisible(d < 72);
      npc.syncLabels();
      if (d < 72) this.nearbyNPC = npc;
    });

    if (Phaser.Input.Keyboard.JustDown(this.eKey) && this.nearbyNPC) this._openDialogue(this.nearbyNPC);
    if (Phaser.Input.Keyboard.JustDown(this.iKey)) { const ui = this.scene.get('UIScene'); if (ui) { this.audio.sfxUIOpen(); ui.toggleInventory(this.player); } }
    if (Phaser.Input.Keyboard.JustDown(this.mKey)) { const ui = this.scene.get('UIScene'); if (ui) ui.toggleWorldMap(this.mapData); }

    if (this._portalPos && !this._portalUsed) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this._portalPos.x, this._portalPos.y) < 32)
        this._enterDungeon();
    }

    // Quest kill tracking + achievements + audio + VFX on kill
    this.enemies.forEach(e => {
      if (e.isDead && !e._questTracked) {
        e._questTracked = true;
        this.questSystem?.onKill(e._data?.name || '');
        AIMemory.recordKill(e._data?.name || 'enemy');
        this.achievements.track('kills');
        this.audio.sfxKill();
        this._burst(e.x, e.y, 0xff4422, 10);
      }
    });

    // Footstep audio
    const vel = this.player.body?.velocity;
    if (vel && (Math.abs(vel.x) > 30 || Math.abs(vel.y) > 30)) {
      if (!this._stepTimer || time > this._stepTimer) {
        this.audio.sfxStep();
        this._stepTimer = time + 320;
      }
    }
  }
}
