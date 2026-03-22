import { CONFIG } from '../config.js';

export class UIScene extends Phaser.Scene {
  constructor() { super({ key:'UIScene', active:false }); }

  create() {
    this.worldScene   = null;
    this.dialogueNPC  = null;
    this.invOpen      = false;
    this.questOpen    = false;
    this.skillOpen    = false;
    this.mapOpen      = false;
    this._activePlayer = null;

    this._buildHUD();
    this._buildDialogueBox();
    this._buildInventory();
    this._buildQuestJournal();
    this._buildSkillTree();
    this._buildWorldMap();
    this._buildMinimap();
    this._buildTouchControls();
    this._bindInput();
  }

  bindWorld(worldScene) {
    this.worldScene = worldScene;
    const p = worldScene.player;
    this._activePlayer = p;

    worldScene.events.on('statsChanged',    s   => this._updateStats(s));
    worldScene.events.on('inventoryChanged',inv => { if (this.invOpen) this._renderInv(p); });
    worldScene.events.on('levelUp',         lv  => this._logMsg('Level Up! Now level ' + lv, '#ffd700'));
    worldScene.events.on('questAdded',      ()  => this.refreshQuests(worldScene.questSystem));
    worldScene.events.on('skillLearned',    (k, r) => this._logMsg('Skill up: ' + (CONFIG.SKILLS[k]?.name||k) + ' rank ' + r, '#aaddff'));

    this._updateStats(p.stats);
    this._updateMinimap(worldScene.mapData, p);
    this._minimapTimer = setInterval(() => {
      if (worldScene.player?.active) this._updateMinimap(worldScene.mapData, worldScene.player);
    }, 2000);
  }

  /* ── HUD ──────────────────────────────────────────────── */
  _buildHUD() {
    const W = this.cameras.main.width;

    this.add.text(10, 10, 'HP', { fontFamily:'Courier New', fontSize:'11px', color:'#aaaaaa' });
    this.hpBarBg   = this.add.rectangle(36, 16, 130, 10, 0x330000).setOrigin(0, 0.5);
    this.hpBarFill = this.add.rectangle(36, 16, 130, 10, 0xdd3333).setOrigin(0, 0.5);
    this.hpText    = this.add.text(170, 10, '100/100', { fontFamily:'Courier New', fontSize:'10px', color:'#ff7777' });

    this.add.text(10, 26, 'XP', { fontFamily:'Courier New', fontSize:'11px', color:'#aaaaaa' });
    this.xpBarBg   = this.add.rectangle(36, 32, 130, 6, 0x222200).setOrigin(0, 0.5);
    this.xpBarFill = this.add.rectangle(36, 32, 130, 6, 0xddaa00).setOrigin(0, 0.5);

    this.levelText = this.add.text(10, 40, 'Lv.1', { fontFamily:'Courier New', fontSize:'11px', color:'#d4af37' });
    this.goldText  = this.add.text(10, 54, '0g',   { fontFamily:'Courier New', fontSize:'11px', color:'#ffee77' });
    this.classText = this.add.text(10, 68, '',      { fontFamily:'Courier New', fontSize:'10px', color:'#aaaaff' });

    this.add.text(W - 8, 10,
      'WASD:Move  E:Talk  I:Inv  M:Map  K:Skills  Q:Quests',
      { fontFamily:'Courier New', fontSize:'8px', color:'#2a2a2a' }
    ).setOrigin(1, 0);

    this.msgTexts = [];
    for (let i = 0; i < 5; i++) {
      this.msgTexts.push(this.add.text(10, this.cameras.main.height - 20 - i * 16, '', {
        fontFamily:'Courier New', fontSize:'11px', color:'#888888',
        stroke:'#000000', strokeThickness: 2,
      }));
    }
  }

  _updateStats(s) {
    const hpR = Math.max(0, s.hp / s.maxHp);
    const xpR = s.xp / s.xpNeeded;
    this.hpBarFill.setSize(130 * hpR, 10);
    this.hpText.setText(s.hp + '/' + s.maxHp);
    this.xpBarFill.setSize(130 * xpR, 6);
    this.levelText.setText('Lv.' + s.level);
    this.goldText.setText((s.gold || 0) + 'g');
    if (s.class) this.classText.setText('[' + s.class + ']');
    if (this._activePlayer?.playerClass) {
      const cls = CONFIG.CLASSES[this._activePlayer.playerClass];
      if (cls) this.classText.setText('[' + cls.name + ']');
    }
  }

  _logMsg(msg, color = '#888888') {
    this.msgTexts.forEach((t, i) => {
      if (i < this.msgTexts.length - 1) {
        const src = this.msgTexts[i + 1];
        t.setText(src.text).setColor(src.style.color || '#888888');
      }
    });
    this.msgTexts[this.msgTexts.length - 1].setText(msg).setColor(color);
    const H = this.cameras.main.height;
    this.msgTexts.forEach((t, i) => t.setY(H - 20 - (this.msgTexts.length - 1 - i) * 16));
  }

  /* ── Minimap ──────────────────────────────────────────── */
  _buildMinimap() {
    const W = this.cameras.main.width;
    const MM = 110;
    const mx = W - MM - 8, my = 8;

    this.mmBg = this.add.rectangle(mx + MM/2, my + MM/2, MM + 4, MM + 4, 0x000000, 0.75)
      .setStrokeStyle(1, 0xd4af37, 0.5).setDepth(50);
    this.mmCanvas = this.add.renderTexture(mx, my, MM, MM).setDepth(51);
    this.mmPlayer = this.add.triangle(0, 0, 0, -5, 3, 3, -3, 3, 0xffffff).setDepth(52);
    this.mmLabel  = this.add.text(mx + MM/2, my + MM + 6, 'MAP', {
      fontFamily:'Courier New', fontSize:'8px', color:'#666666',
    }).setOrigin(0.5).setDepth(51);

    this._mmRect = { x: mx, y: my, size: MM };
  }

  _updateMinimap(mapData, player) {
    if (!this.mmCanvas || !mapData) return;
    const MM   = this._mmRect.size;
    const rows = mapData.length, cols = mapData[0].length;
    const scaleX = MM / cols, scaleY = MM / rows;
    const T = CONFIG.TILES;

    const colorMap = {
      [T.DEEP_WATER]:    '#0d2137',
      [T.WATER]:         '#1a4a80',
      [T.SAND]:          '#c8a848',
      [T.GRASS]:         '#2d6a30',
      [T.FOREST]:        '#1a4520',
      [T.STONE]:         '#5a5a5a',
      [T.DUNGEON_FLOOR]: '#3a4550',
      [T.DUNGEON_WALL]:  '#141414',
      [T.PATH]:          '#7a5a3a',
      [T.TOWN_FLOOR]:    '#8a9a8a',
    };

    const gfx = this.make.graphics({ add: false });
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const hex = parseInt((colorMap[mapData[y][x]] || '#333333').replace('#',''), 16);
        gfx.fillStyle(hex);
        gfx.fillRect(x * scaleX, y * scaleY, Math.max(1, scaleX), Math.max(1, scaleY));
      }
    }
    this.mmCanvas.clear();
    this.mmCanvas.draw(gfx);
    gfx.destroy();

    // Update player dot
    const px = this._mmRect.x + (player.x / (cols * CONFIG.TILE_SIZE)) * MM;
    const py = this._mmRect.y + (player.y / (rows * CONFIG.TILE_SIZE)) * MM;
    this.mmPlayer.setPosition(px, py);
  }

  /* ── Dialogue ─────────────────────────────────────────── */
  _buildDialogueBox() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const PW = Math.min(600, W - 24), PH = 160;

    this.dialoguePanel = this.add.container(W/2, H - PH/2 - 12).setVisible(false).setDepth(80);
    this.dialogueBg    = this.add.rectangle(0, 0, PW, PH, 0x080810, 0.94).setStrokeStyle(1, 0xd4af37, 0.8);
    this.dialogueName  = this.add.text(-PW/2 + 14, -PH/2 + 12, '', { fontFamily:'Courier New', fontSize:'12px', color:'#d4af37' });
    this.dialogueText  = this.add.text(-PW/2 + 14, -PH/2 + 32, '', { fontFamily:'Courier New', fontSize:'12px', color:'#cccccc', wordWrap:{ width: PW - 28 }, lineSpacing: 4 });
    this.dialogueTyping = this.add.text(-PW/2 + 14, -PH/2 + 32, '...', { fontFamily:'Courier New', fontSize:'12px', color:'#555555' }).setVisible(false);

    const closeBtn = this.add.text(PW/2 - 14, -PH/2 + 12, 'X', { fontFamily:'Courier New', fontSize:'13px', color:'#884444' })
      .setOrigin(1, 0).setInteractive({ useHandCursor:true });
    closeBtn.on('pointerdown', () => this._closeDialogue());

    this.dialoguePanel.add([this.dialogueBg, this.dialogueName, this.dialogueText, this.dialogueTyping, closeBtn]);
  }

  async openDialogue(npc, playerStats, questSystem) {
    this.dialogueNPC  = npc;
    this._playerStats = playerStats;
    this._questSystem = questSystem;
    const col = '#' + npc.npcData.color.toString(16).padStart(6,'0');
    this.dialogueName.setText(npc.npcData.name + '  [' + npc.npcData.role + ']').setColor(col);
    this.dialogueText.setText('').setVisible(true);
    this.dialogueTyping.setVisible(true);
    this.dialoguePanel.setVisible(true);

    const greeting = await npc.talk('Hello, I approach for the first time.', playerStats);
    this.dialogueTyping.setVisible(false);
    this.dialogueText.setText(greeting);
    this._logMsg(npc.npcData.name + ': ' + greeting.slice(0, 55) + (greeting.length > 55 ? '...' : ''), col);

    // Offer a quest 40% of the time
    if (questSystem && Math.random() < 0.4) {
      this.time.delayedCall(1200, () => questSystem.generateQuest(playerStats, npc.npcData.name));
    }

    document.getElementById('dialogue-overlay').classList.add('show');
    document.getElementById('dialogue-text').focus();
  }

  _closeDialogue() {
    this.dialoguePanel.setVisible(false);
    document.getElementById('dialogue-overlay').classList.remove('show');
    this.dialogueNPC = null;
  }

  async _sendDialogue() {
    if (!this.dialogueNPC) return;
    const input = document.getElementById('dialogue-text');
    const msg   = input.value.trim();
    if (!msg) return;
    input.value = '';

    this.dialogueText.setVisible(false);
    this.dialogueTyping.setVisible(true);
    const reply = await this.dialogueNPC.talk(msg, this._playerStats);
    this.dialogueTyping.setVisible(false);
    this.dialogueText.setText(reply).setVisible(true);
    const col = '#' + this.dialogueNPC.npcData.color.toString(16).padStart(6,'0');
    this._logMsg(this.dialogueNPC.npcData.name + ': ' + reply.slice(0, 55) + '...', col);
  }

  /* ── Inventory ────────────────────────────────────────── */
  _buildInventory() {
    const W = this.cameras.main.width, H = this.cameras.main.height;
    const IW = Math.min(520, W - 24), IH = Math.min(440, H - 80);
    this.invPanel = this.add.container(W/2, H/2).setVisible(false).setDepth(90);
    this.invBg    = this.add.rectangle(0, 0, IW, IH, 0x08080f, 0.96).setStrokeStyle(1, 0xd4af37, 0.7);
    this.invTitle = this.add.text(-IW/2 + 14, -IH/2 + 14, '[ INVENTORY ]', { fontFamily:'Courier New', fontSize:'13px', color:'#d4af37' });
    const closeBtn = this.add.text(IW/2 - 14, -IH/2 + 14, 'X', { fontFamily:'Courier New', fontSize:'14px', color:'#884444' })
      .setOrigin(1, 0).setInteractive({ useHandCursor:true });
    closeBtn.on('pointerdown', () => this.toggleInventory(null));
    this.invContent = this.add.container(0, 0);
    this.invPanel.add([this.invBg, this.invTitle, closeBtn, this.invContent]);
    this._IW = IW; this._IH = IH;
  }

  toggleInventory(player) {
    this.invOpen = !this.invOpen;
    this.invPanel.setVisible(this.invOpen);
    if (this.invOpen && player) { this._activePlayer = player; this._renderInv(player); }
    if (!this.invOpen) this.invContent.removeAll(true);
  }

  _renderInv(player) {
    this.invContent.removeAll(true);
    const IW = this._IW, IH = this._IH;
    const ox = -IW/2 + 14;
    let y    = -IH/2 + 46;

    const items = player.inventory;
    if (Object.keys(items).length === 0) {
      this.invContent.add(this.add.text(ox, y, 'Your pack is empty.', { fontFamily:'Courier New', fontSize:'11px', color:'#555555' }));
    } else {
      Object.entries(items).forEach(([key, qty]) => {
        const item     = CONFIG.ITEMS[key]; if (!item) return;
        const equipped = player.equipment.weapon === key || player.equipment.armor === key;
        const row = this.add.text(ox, y, '- ' + item.name + (equipped?' [E]':'') + '  x' + qty + '  (' + item.type + ')', {
          fontFamily:'Courier New', fontSize:'11px', color: equipped ? '#88ffaa' : '#cccccc',
        });
        this.invContent.add(row);
        if (['consumable','weapon','armor'].includes(item.type)) {
          const btn = this.add.text(IW/2 - 80, y, '[Use]', { fontFamily:'Courier New', fontSize:'11px', color:'#d4af37' })
            .setInteractive({ useHandCursor:true });
          btn.on('pointerdown', () => { player.useItem(key); this._renderInv(player); });
          this.invContent.add(btn);
        }
        y += 20;
      });
    }

    // Equipment slots
    y = IH/2 - 140;
    this.invContent.add(this.add.text(ox, y, '[ EQUIPPED ]', { fontFamily:'Courier New', fontSize:'11px', color:'#d4af37' }));
    y += 18;
    const wp = player.equipment.weapon ? (CONFIG.ITEMS[player.equipment.weapon]?.name || player.equipment.weapon) : 'none';
    const ar = player.equipment.armor  ? (CONFIG.ITEMS[player.equipment.armor ]?.name || player.equipment.armor ) : 'none';
    this.invContent.add(this.add.text(ox, y,      'Weapon: ' + wp, { fontFamily:'Courier New', fontSize:'10px', color:'#aaaaff' }));
    this.invContent.add(this.add.text(ox, y + 16, 'Armor:  ' + ar, { fontFamily:'Courier New', fontSize:'10px', color:'#aaffaa' }));

    // Crafting
    y = IH/2 - 90;
    this.invContent.add(this.add.text(ox, y, '[ CRAFT ]', { fontFamily:'Courier New', fontSize:'11px', color:'#88aaff' }));
    y += 18;
    CONFIG.RECIPES.forEach(recipe => {
      const can = Object.entries(recipe.materials).every(([k,n]) => (items[k]||0) >= n);
      const btn = this.add.text(ox, y, (can ? '> ' : 'x ') + recipe.label, {
        fontFamily:'Courier New', fontSize:'10px', color: can ? '#aaccff' : '#444444',
      });
      if (can) {
        btn.setInteractive({ useHandCursor:true });
        btn.on('pointerdown', () => {
          Object.entries(recipe.materials).forEach(([k,n]) => player.removeItem(k, n));
          player.addItem(recipe.result);
          this._logMsg('Crafted: ' + CONFIG.ITEMS[recipe.result].name, '#88aaff');
          this._renderInv(player);
        });
      }
      this.invContent.add(btn);
      y += 18;
    });
  }

  /* ── Quest Journal ────────────────────────────────────── */
  _buildQuestJournal() {
    const W = this.cameras.main.width, H = this.cameras.main.height;
    const QW = Math.min(480, W - 24), QH = Math.min(400, H - 80);
    this.questPanel = this.add.container(W/2, H/2).setVisible(false).setDepth(91);
    const bg = this.add.rectangle(0, 0, QW, QH, 0x080810, 0.96).setStrokeStyle(1, 0x88aaff, 0.8);
    const title = this.add.text(-QW/2 + 14, -QH/2 + 14, '[ QUEST JOURNAL ]', { fontFamily:'Courier New', fontSize:'13px', color:'#88aaff' });
    const close = this.add.text(QW/2 - 14, -QH/2 + 14, 'X', { fontFamily:'Courier New', fontSize:'14px', color:'#884444' })
      .setOrigin(1, 0).setInteractive({ useHandCursor:true });
    close.on('pointerdown', () => { this.questOpen = false; this.questPanel.setVisible(false); });
    this.questContent = this.add.container(0, 0);
    this.questPanel.add([bg, title, close, this.questContent]);
    this._QW = QW; this._QH = QH;
  }

  refreshQuests(questSystem) {
    if (!questSystem) return;
    this.questContent.removeAll(true);
    const QW = this._QW, QH = this._QH;
    const ox = -QW/2 + 14;
    let y    = -QH/2 + 46;

    if (questSystem.active.length === 0 && questSystem.done.length === 0) {
      this.questContent.add(this.add.text(ox, y, 'No quests yet. Talk to an NPC.', { fontFamily:'Courier New', fontSize:'11px', color:'#555555' }));
      return;
    }

    if (questSystem.active.length > 0) {
      this.questContent.add(this.add.text(ox, y, '-- ACTIVE --', { fontFamily:'Courier New', fontSize:'11px', color:'#88aaff' }));
      y += 20;
      questSystem.active.forEach(q => {
        const pct = Math.floor((q.progress / q.needed) * 100);
        this.questContent.add(this.add.text(ox, y, q.title, { fontFamily:'Courier New', fontSize:'11px', color:'#cccccc' }));
        y += 16;
        this.questContent.add(this.add.text(ox + 10, y, q.desc.slice(0,60), { fontFamily:'Courier New', fontSize:'9px', color:'#666666', wordWrap:{ width: QW - 30 } }));
        y += 16;
        this.questContent.add(this.add.text(ox + 10, y, 'Progress: ' + q.progress + '/' + q.needed + ' (' + pct + '%)', { fontFamily:'Courier New', fontSize:'9px', color:'#88aa66' }));
        y += 20;
      });
    }

    if (questSystem.done.length > 0) {
      this.questContent.add(this.add.text(ox, y, '-- COMPLETED --', { fontFamily:'Courier New', fontSize:'11px', color:'#44aa44' }));
      y += 20;
      questSystem.done.slice(-5).forEach(q => {
        this.questContent.add(this.add.text(ox, y, '+ ' + q.title, { fontFamily:'Courier New', fontSize:'10px', color:'#446644' }));
        y += 16;
      });
    }
  }

  toggleQuestJournal(questSystem) {
    this.questOpen = !this.questOpen;
    this.questPanel.setVisible(this.questOpen);
    if (this.questOpen && questSystem) this.refreshQuests(questSystem);
  }

  /* ── Skill Tree ───────────────────────────────────────── */
  _buildSkillTree() {
    const W = this.cameras.main.width, H = this.cameras.main.height;
    const SW = Math.min(460, W - 24), SH = Math.min(420, H - 80);
    this.skillPanel = this.add.container(W/2, H/2).setVisible(false).setDepth(92);
    const bg = this.add.rectangle(0, 0, SW, SH, 0x080810, 0.96).setStrokeStyle(1, 0xcc88ff, 0.8);
    const title = this.add.text(-SW/2 + 14, -SH/2 + 14, '[ SKILLS ]', { fontFamily:'Courier New', fontSize:'13px', color:'#cc88ff' });
    const close = this.add.text(SW/2 - 14, -SH/2 + 14, 'X', { fontFamily:'Courier New', fontSize:'14px', color:'#884444' })
      .setOrigin(1, 0).setInteractive({ useHandCursor:true });
    close.on('pointerdown', () => { this.skillOpen = false; this.skillPanel.setVisible(false); });
    this.skillContent = this.add.container(0, 0);
    this.skillPanel.add([bg, title, close, this.skillContent]);
    this._SW = SW; this._SH = SH;
  }

  toggleSkillTree(player) {
    this.skillOpen = !this.skillOpen;
    this.skillPanel.setVisible(this.skillOpen);
    if (this.skillOpen && player) this._renderSkills(player);
    if (!this.skillOpen) this.skillContent.removeAll(true);
  }

  _renderSkills(player) {
    this.skillContent.removeAll(true);
    const SW = this._SW, SH = this._SH;
    const ox = -SW/2 + 14;
    let y    = -SH/2 + 46;

    const cls     = player.playerClass || 'WARRIOR';
    const clsData = CONFIG.CLASSES[cls];
    const col     = '#' + (clsData?.color || 0xaaaaff).toString(16).padStart(6,'0');

    this.skillContent.add(this.add.text(ox, y, 'Class: ' + (clsData?.name || cls), { fontFamily:'Courier New', fontSize:'12px', color: col }));
    y += 26;

    const skillPoints = Math.max(0, player.stats.level - 1 - Object.values(player.skills || {}).reduce((a,b)=>a+b,0));
    this.skillContent.add(this.add.text(ox, y, 'Skill points available: ' + skillPoints, { fontFamily:'Courier New', fontSize:'11px', color:'#aaaaaa' }));
    y += 24;

    (clsData?.skills || []).forEach(key => {
      const sk   = CONFIG.SKILLS[key]; if (!sk) return;
      const rank = player.skills?.[key] || 0;
      const full = rank >= sk.maxRank;

      const nameT = this.add.text(ox, y, sk.name + '  [' + rank + '/' + sk.maxRank + ']', {
        fontFamily:'Courier New', fontSize:'12px', color: full ? '#ffd700' : '#cccccc',
      });
      const descT = this.add.text(ox + 12, y + 16, sk.desc, { fontFamily:'Courier New', fontSize:'9px', color:'#666666' });
      this.skillContent.add(nameT);
      this.skillContent.add(descT);

      if (!full && skillPoints > 0) {
        const btn = this.add.text(SW/2 - 90, y + 8, '[ LEARN ]', { fontFamily:'Courier New', fontSize:'10px', color:'#88ccff' })
          .setInteractive({ useHandCursor:true });
        btn.on('pointerdown', () => { player.learnSkill(key); this._renderSkills(player); });
        this.skillContent.add(btn);
      }
      y += 46;
    });
  }

  /* ── World Map ────────────────────────────────────────── */
  _buildWorldMap() {
    const W = this.cameras.main.width, H = this.cameras.main.height;
    const MW = Math.min(500, W - 24), MH = Math.min(500, H - 80);
    this.mapPanel = this.add.container(W/2, H/2).setVisible(false).setDepth(93);
    const bg = this.add.rectangle(0, 0, MW, MH, 0x050510, 0.97).setStrokeStyle(1, 0x44aa44, 0.8);
    const title = this.add.text(-MW/2 + 14, -MH/2 + 14, '[ WORLD MAP ]  M to close', { fontFamily:'Courier New', fontSize:'13px', color:'#44aa44' });
    const close = this.add.text(MW/2 - 14, -MH/2 + 14, 'X', { fontFamily:'Courier New', fontSize:'14px', color:'#884444' })
      .setOrigin(1, 0).setInteractive({ useHandCursor:true });
    close.on('pointerdown', () => { this.mapOpen = false; this.mapPanel.setVisible(false); });
    this.mapCanvas = this.add.renderTexture(-MW/2 + 14, -MH/2 + 40, MW - 28, MH - 60).setDepth(1);
    this.mapPanel.add([bg, title, close, this.mapCanvas]);
    this._MW = MW; this._MH = MH;
  }

  toggleWorldMap(mapData) {
    this.mapOpen = !this.mapOpen;
    this.mapPanel.setVisible(this.mapOpen);
    if (this.mapOpen && mapData) this._renderWorldMap(mapData);
  }

  _renderWorldMap(mapData) {
    const W  = this._MW - 28, H = this._MH - 60;
    const rows = mapData.length, cols = mapData[0].length;
    const sx = W / cols, sy = H / rows;
    const T  = CONFIG.TILES;
    const colorMap = {
      [T.DEEP_WATER]:'#0d2137',[T.WATER]:'#1a4a80',[T.SAND]:'#c8a848',
      [T.GRASS]:'#2d6a30',[T.FOREST]:'#1a4520',[T.STONE]:'#5a5a5a',
      [T.DUNGEON_FLOOR]:'#3a4550',[T.DUNGEON_WALL]:'#141414',
      [T.PATH]:'#7a5a3a',[T.TOWN_FLOOR]:'#8a9a8a',
    };
    const gfx = this.make.graphics({ add: false });
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        gfx.fillStyle(parseInt((colorMap[mapData[y][x]]||'#333333').replace('#',''), 16));
        gfx.fillRect(x * sx, y * sy, Math.max(1, sx), Math.max(1, sy));
      }
    }
    // Town marker
    const tcx = Math.floor(cols/2), tcy = Math.floor(rows/2);
    gfx.fillStyle(0xffd700); gfx.fillCircle(tcx*sx, tcy*sy, 4);
    // Dungeon marker
    gfx.fillStyle(0xaa44ff); gfx.fillCircle((tcx+50)*sx, (tcy-10)*sy, 4);
    this.mapCanvas.clear();
    this.mapCanvas.draw(gfx);
    gfx.destroy();
  }

  /* ── Touch Controls ───────────────────────────────────── */
  _buildTouchControls() {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
                     (navigator.maxTouchPoints > 1 && window.innerWidth < 900);
    if (!isMobile) return;

    const W = this.cameras.main.width, H = this.cameras.main.height;
    const jR = 50, jx = jR + 24, jy = H - jR - 24;

    // Joystick base
    this.joyBase  = this.add.circle(jx, jy, jR, 0xffffff, 0.08).setDepth(200).setStrokeStyle(1, 0xffffff, 0.3);
    this.joyStick = this.add.circle(jx, jy, jR * 0.44, 0xffffff, 0.22).setDepth(201);
    this._joyActive = false;
    this._joyId     = null;
    this._joyOrigin = { x: jx, y: jy };
    this._joyDelta  = { x: 0, y: 0 };

    // Action buttons
    const bx = W - 24, by = H - 24;
    this._buildTouchBtn(bx - 80, by - 50, 'ATK', 0xdd3333, () => {
      if (this.worldScene?.player && this.worldScene.enemies?.length) {
        const p = this.worldScene.player;
        let closest = null, minD = 999;
        this.worldScene.enemies.forEach(e => {
          if (e.isDead) return;
          const d = Phaser.Math.Distance.Between(p.x, p.y, e.x, e.y);
          if (d < minD) { minD = d; closest = e; }
        });
        if (closest) { p.setTarget(closest); p.moveTarget = null; }
      }
    });
    this._buildTouchBtn(bx, by - 50, 'E', 0x44aa44, () => {
      if (this.worldScene?.nearbyNPC) this.worldScene._openDialogue(this.worldScene.nearbyNPC);
    });
    this._buildTouchBtn(bx - 40, by, 'INV', 0x4444aa, () => {
      this.toggleInventory(this.worldScene?.player);
    });

    // Joystick touch events
    this.input.on('pointerdown', ptr => {
      if (ptr.x < W / 2 && !this._joyActive) {
        this._joyActive = true; this._joyId = ptr.id;
        this._joyOrigin = { x: ptr.x, y: ptr.y };
        this.joyBase.setPosition(ptr.x, ptr.y);
        this.joyStick.setPosition(ptr.x, ptr.y);
      }
    });
    this.input.on('pointermove', ptr => {
      if (!this._joyActive || ptr.id !== this._joyId) return;
      const dx  = ptr.x - this._joyOrigin.x;
      const dy  = ptr.y - this._joyOrigin.y;
      const len = Math.sqrt(dx*dx + dy*dy);
      const cap = jR * 0.85;
      const nx  = len > cap ? dx / len * cap : dx;
      const ny  = len > cap ? dy / len * cap : dy;
      this.joyStick.setPosition(this._joyOrigin.x + nx, this._joyOrigin.y + ny);
      this._joyDelta = { x: nx / cap, y: ny / cap };
    });
    this.input.on('pointerup', ptr => {
      if (ptr.id !== this._joyId) return;
      this._joyActive = false; this._joyDelta = { x: 0, y: 0 };
      this.joyBase.setPosition(jx, jy);
      this.joyStick.setPosition(jx, jy);
    });

    // Apply joystick velocity to player
    this.time.addEvent({ delay: 16, loop: true, callback: () => {
      const p = this.worldScene?.player;
      if (!p || !this._joyActive) return;
      const sp = p.stats.speed;
      p.setVelocity(this._joyDelta.x * sp, this._joyDelta.y * sp);
    }});
  }

  _buildTouchBtn(x, y, label, color, onTap) {
    const btn = this.add.circle(x, y, 28, color, 0.22).setDepth(200).setStrokeStyle(1, color, 0.5).setInteractive({ useHandCursor:true });
    this.add.text(x, y, label, { fontFamily:'Courier New', fontSize:'10px', color:'#ffffff' }).setOrigin(0.5).setDepth(201);
    btn.on('pointerdown', onTap);
    return btn;
  }

  /* ── DOM input ────────────────────────────────────────── */
  _bindInput() {
    document.getElementById('dialogue-send')?.addEventListener('click', () => this._sendDialogue());
    document.getElementById('dialogue-text')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') this._sendDialogue();
      if (e.key === 'Escape') this._closeDialogue();
      e.stopPropagation();
    });

    // Keyboard shortcuts for panels
    this.input.keyboard.on('keydown-Q', () => {
      if (this.worldScene) this.toggleQuestJournal(this.worldScene.questSystem);
    });
    this.input.keyboard.on('keydown-K', () => {
      this.toggleSkillTree(this._activePlayer || this.worldScene?.player);
    });
    this.input.keyboard.on('keydown-M', () => {
      if (this.worldScene) this.toggleWorldMap(this.worldScene.mapData);
    });
    this.input.keyboard.on('keydown-ESC', () => {
      this._closeDialogue();
      this.questOpen = false; this.questPanel?.setVisible(false);
      this.skillOpen = false; this.skillPanel?.setVisible(false);
      this.mapOpen   = false; this.mapPanel?.setVisible(false);
    });
  }
}
