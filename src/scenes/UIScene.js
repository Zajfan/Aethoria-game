import { CONFIG       } from '../config.js';
import { ACHIEVEMENTS } from '../systems/AchievementSystem.js';

export class UIScene extends Phaser.Scene {
  constructor() { super({ key:'UIScene', active:false }); }

  create() {
    this.worldScene    = null;
    this.dialogueNPC   = null;
    this.invOpen       = false;
    this.questOpen     = false;
    this.skillOpen     = false;
    this.mapOpen       = false;
    this.statsOpen     = false;
    this.tradeOpen     = false;
    this._activePlayer = null;
    this._tradeNPC     = null;

    this._buildHUD();
    this._buildDialogueBox();
    this._buildInventory();
    this._buildQuestJournal();
    this._buildSkillTree();
    this._buildWorldMap();
    this._buildStatsScreen();
    this._buildMinimap();
    this._buildEventBanner();
    this._buildTradePanel();
    this._buildTouchControls();
    this._bindKeyboard();
  }

  bindWorld(ws) {
    this.worldScene    = ws;
    this._activePlayer = ws.player;

    ws.events.on('statsChanged',     s  => this._updateStats(s));
    ws.events.on('inventoryChanged', () => { if (this.invOpen) this._renderInv(ws.player); });
    ws.events.on('levelUp',          lv => this._logMsg('Level Up! Now level ' + lv, '#ffd700'));
    ws.events.on('questAdded',       () => this.refreshQuests(ws.questSystem));
    ws.events.on('skillLearned',     (k,r) => this._logMsg('Skill: ' + (CONFIG.SKILLS[k]?.name||k) + ' rank ' + r, '#aaddff'));
    ws.events.on('worldEvent',       ev => this.showWorldEvent(ev));
    ws.events.on('achievement',      a  => this.showAchievement(a));

    this._updateStats(ws.player.stats);
    this._updateMinimap(ws.mapData, ws.player);
    this._mmInterval = setInterval(() => {
      if (ws.player?.active) this._updateMinimap(ws.mapData, ws.player);
    }, 2500);
  }

  /* ── HUD ──────────────────────────────────────────────── */
  _buildHUD() {
    const W = this.cameras.main.width;

    this.add.text(10, 10, 'HP', { fontFamily:'Courier New', fontSize:'11px', color:'#aaaaaa' });
    this.hpBg   = this.add.rectangle(36, 16, 130, 10, 0x330000).setOrigin(0, 0.5);
    this.hpFill = this.add.rectangle(36, 16, 130, 10, 0xdd3333).setOrigin(0, 0.5);
    this.hpTxt  = this.add.text(170, 10, '100/100', { fontFamily:'Courier New', fontSize:'10px', color:'#ff7777' });

    this.add.text(10, 26, 'XP', { fontFamily:'Courier New', fontSize:'11px', color:'#aaaaaa' });
    this.xpBg   = this.add.rectangle(36, 32, 130, 6,  0x222200).setOrigin(0, 0.5);
    this.xpFill = this.add.rectangle(36, 32, 130, 6,  0xddaa00).setOrigin(0, 0.5);

    this.lvTxt  = this.add.text(10, 40, 'Lv.1',  { fontFamily:'Courier New', fontSize:'11px', color:'#d4af37' });
    this.gldTxt = this.add.text(10, 54, '0g',    { fontFamily:'Courier New', fontSize:'11px', color:'#ffee77' });
    this.clsTxt = this.add.text(10, 68, '',       { fontFamily:'Courier New', fontSize:'10px', color:'#aaaaff' });

    // Sound toggle
    this.sndBtn = this.add.text(W - 10, 24, '[SFX ON]', {
      fontFamily:'Courier New', fontSize:'9px', color:'#446644',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this.sndBtn.on('pointerdown', () => {
      const on = this.worldScene?.audio?.toggle();
      this.sndBtn.setText(on ? '[SFX ON]' : '[SFX OFF]').setColor(on ? '#446644' : '#664444');
    });

    this.add.text(W - 10, 10,
      'E:Talk  I:Inv  Q:Quests  K:Skills  M:Map  C:Stats  T:Trade',
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
    const hp = Math.max(0, s.hp / s.maxHp);
    const xp = s.xp / s.xpNeeded;
    this.hpFill.setSize(160 * hp, 11);
    // Color-code HP bar: red→orange→green
    const hpColor = hp > 0.6 ? 0x22cc44 : hp > 0.3 ? 0xdd8800 : 0xdd2222;
    this.hpFill.setFillStyle(hpColor);
    this.hpTxt.setText(s.hp + '/' + s.maxHp);
    this.xpFill.setSize(160 * xp, 7);
    this.lvTxt.setText('Lv.' + s.level);
    this.gldTxt.setText((s.gold || 0) + 'g');
    const p = this._activePlayer;
    if (p?.playerClass) this.clsTxt.setText('[' + (CONFIG.CLASSES[p.playerClass]?.name || '') + ']');

    // Quest tracker: show first active quest
    if (this.questTracker && this.worldScene?.questSystem) {
      const q = this.worldScene.questSystem.active[0];
      this.questTracker.setText(q ? q.title + ' ' + q.progress + '/' + q.needed : '');
    }
  }

  _logMsg(msg, color = '#888888') {
    this.msgTexts.forEach((t, i) => {
      if (i < this.msgTexts.length - 1) {
        const src = this.msgTexts[i+1];
        t.setText(src.text).setColor(src.style?.color || '#888888');
      }
    });
    this.msgTexts[this.msgTexts.length - 1].setText(msg).setColor(color);
    const H = this.cameras.main.height;
    this.msgTexts.forEach((t, i) => t.setY(H - 20 - (this.msgTexts.length - 1 - i) * 16));
  }

  /* ── Minimap ──────────────────────────────────────────── */
  _buildMinimap() {
    const W = this.cameras.main.width, MM = 110;
    const mx = W - MM - 8, my = 36;
    this.mmBg     = this.add.rectangle(mx+MM/2, my+MM/2, MM+4, MM+4, 0x000000, 0.75)
      .setStrokeStyle(1, 0xd4af37, 0.5).setDepth(50);
    this.mmCanvas = this.add.renderTexture(mx, my, MM, MM).setDepth(51);
    this.mmDot    = this.add.circle(0, 0, 3, 0xffffff).setDepth(52);
    this._mmRect  = { x: mx, y: my, size: MM };
    this.add.text(mx+MM/2, my+MM+6, 'MAP', {
      fontFamily:'Courier New', fontSize:'8px', color:'#666666',
    }).setOrigin(0.5).setDepth(51);
  }

  _updateMinimap(mapData, player) {
    if (!mapData || !this.mmCanvas) return;
    const MM = this._mmRect.size, rows = mapData.length, cols = mapData[0].length;
    const sx = MM/cols, sy = MM/rows;
    const T  = CONFIG.TILES;
    const CM = {
      [T.DEEP_WATER]:'#0d2137',[T.WATER]:'#1a4a80',[T.SAND]:'#c8a848',
      [T.GRASS]:'#2d6a30',[T.FOREST]:'#1a4520',[T.STONE]:'#5a5a5a',
      [T.DUNGEON_FLOOR]:'#3a4550',[T.DUNGEON_WALL]:'#141414',
      [T.PATH]:'#7a5a3a',[T.TOWN_FLOOR]:'#8a9a8a',
    };
    const g = this.make.graphics({ add:false });
    for (let y=0; y<rows; y++)
      for (let x=0; x<cols; x++) {
        g.fillStyle(parseInt((CM[mapData[y][x]]||'#333333').replace('#',''),16));
        g.fillRect(x*sx, y*sy, Math.max(1,sx), Math.max(1,sy));
      }
    this.mmCanvas.clear().draw(g); g.destroy();
    const px = this._mmRect.x + (player.x/(cols*CONFIG.TILE_SIZE))*MM;
    const py = this._mmRect.y + (player.y/(rows*CONFIG.TILE_SIZE))*MM;
    this.mmDot.setPosition(px, py);
  }

  /* ── Event banner ─────────────────────────────────────── */
  _buildEventBanner() {
    const W = this.cameras.main.width;
    this.eventBanner = this.add.container(W/2, 90).setDepth(110).setVisible(false);
    this.eventBg   = this.add.rectangle(0, 0, Math.min(500, W-24), 44, 0x0a0020, 0.9)
      .setStrokeStyle(1, 0x8800ff, 0.8);
    this.eventTxt  = this.add.text(0, -6, '', { fontFamily:'Courier New', fontSize:'13px', color:'#cc88ff' }).setOrigin(0.5);
    this.eventSub  = this.add.text(0, 10, '', { fontFamily:'Courier New', fontSize:'10px', color:'#888888' }).setOrigin(0.5);
    this.eventBanner.add([this.eventBg, this.eventTxt, this.eventSub]);
  }

  showWorldEvent(ev) {
    this.eventBg.setStrokeStyle(1, ev.color, 0.8);
    this.eventTxt.setText('** ' + ev.name.toUpperCase() + ' **').setColor('#' + ev.color.toString(16).padStart(6,'0'));
    this.eventSub.setText(ev.desc);
    this.eventBanner.setVisible(true).setAlpha(1);
    this._logMsg(ev.name + ': ' + ev.desc, '#cc88ff');
    this.tweens.add({ targets: this.eventBanner, alpha:0, delay:5000, duration:1200,
      onComplete: () => this.eventBanner.setVisible(false) });
  }

  /* ── Achievement popup ────────────────────────────────── */
  showAchievement(ach) {
    const W = this.cameras.main.width;
    const popup = this.add.container(W/2, -60).setDepth(120);
    const bg    = this.add.rectangle(0, 0, 340, 48, 0x0a0a20, 0.95).setStrokeStyle(1, 0xffd700, 0.9);
    const title = this.add.text(0, -8, 'ACHIEVEMENT UNLOCKED', { fontFamily:'Courier New', fontSize:'10px', color:'#ffd700' }).setOrigin(0.5);
    const name  = this.add.text(0, 8,  ach.name + ' — ' + ach.desc, { fontFamily:'Courier New', fontSize:'12px', color:'#ffffff' }).setOrigin(0.5);
    popup.add([bg, title, name]);

    this.tweens.add({
      targets: popup, y: 80, duration: 400, ease: 'Back.Out',
      onComplete: () => {
        this.tweens.add({ targets: popup, alpha: 0, y: 50, delay: 2800, duration: 800,
          onComplete: () => popup.destroy() });
      },
    });
    this._logMsg('Achievement: ' + ach.name, '#ffd700');
  }

  /* ── Dialogue ─────────────────────────────────────────── */
  _buildDialogueBox() {
    const W = this.cameras.main.width, H = this.cameras.main.height;
    const PW = Math.min(600, W-24), PH = 160;
    this.dlgPanel  = this.add.container(W/2, H - PH/2 - 12).setVisible(false).setDepth(80);
    this.dlgBg     = this.add.rectangle(0, 0, PW, PH, 0x080810, 0.94).setStrokeStyle(1, 0xd4af37, 0.8);
    this.dlgName   = this.add.text(-PW/2+14, -PH/2+12, '', { fontFamily:'Courier New', fontSize:'12px', color:'#d4af37' });
    this.dlgText   = this.add.text(-PW/2+14, -PH/2+32, '', { fontFamily:'Courier New', fontSize:'12px', color:'#cccccc', wordWrap:{ width:PW-28 }, lineSpacing:4 });
    this.dlgTyping = this.add.text(-PW/2+14, -PH/2+32, '...', { fontFamily:'Courier New', fontSize:'12px', color:'#555555' }).setVisible(false);

    const tradeBtn = this.add.text(-PW/2+14, PH/2-18, '[T] Open Shop', { fontFamily:'Courier New', fontSize:'10px', color:'#ffdd44' })
      .setInteractive({ useHandCursor:true });
    tradeBtn.on('pointerdown', () => {
      if (this.dialogueNPC) this._openTradeFromNPC(this.dialogueNPC);
    });
    this.dlgTradeBtn = tradeBtn;

    const closeBtn = this.add.text(PW/2-14, -PH/2+12, 'X', { fontFamily:'Courier New', fontSize:'13px', color:'#884444' })
      .setOrigin(1,0).setInteractive({ useHandCursor:true });
    closeBtn.on('pointerdown', () => this._closeDialogue());

    this.dlgPanel.add([this.dlgBg, this.dlgName, this.dlgText, this.dlgTyping, tradeBtn, closeBtn]);
  }

  async openDialogue(npc, playerStats, questSystem, tradeSystem, worldEvents) {
    this.dialogueNPC  = npc;
    this._playerStats = playerStats;
    this._questSystem = questSystem;
    this._tradeSystem = tradeSystem;
    this._worldEvents = worldEvents;

    const col = '#' + npc.npcData.color.toString(16).padStart(6,'0');
    this.dlgName.setText(npc.npcData.name + '  [' + npc.npcData.role + ']').setColor(col);
    this.dlgText.setText('').setVisible(true);
    this.dlgTyping.setVisible(true);
    this.dlgPanel.setVisible(true);

    // Show/hide trade button
    const hasShop = tradeSystem?.hasShop(npc.npcData.role);
    this.dlgTradeBtn.setVisible(!!hasShop);

    const currentEvent = worldEvents?.getCurrent()?.name || null;
    const greeting = await npc.talk('Hello, I approach you for the first time.', playerStats, currentEvent);
    this.dlgTyping.setVisible(false);
    this.dlgText.setText(greeting);
    this._logMsg(npc.npcData.name + ': ' + greeting.slice(0,55) + (greeting.length>55?'...':''), col);

    // Quest offer
    if (questSystem && Math.random() < 0.4)
      this.time.delayedCall(1200, () => questSystem.generateQuest(playerStats, npc.npcData.name));

    document.getElementById('dialogue-overlay').classList.add('show');
    document.getElementById('dialogue-text').focus();
  }

  _closeDialogue() {
    this.dlgPanel.setVisible(false);
    document.getElementById('dialogue-overlay').classList.remove('show');
    this.dialogueNPC = null;
    this.worldScene?.audio?.sfxUIClose();
  }

  async _sendDialogue() {
    if (!this.dialogueNPC) return;
    const input = document.getElementById('dialogue-text');
    const msg   = input.value.trim();
    if (!msg) return;
    input.value = '';
    this.dlgText.setVisible(false);
    this.dlgTyping.setVisible(true);
    const currentEvent = this._worldEvents?.getCurrent()?.name || null;
    const reply = await this.dialogueNPC.talk(msg, this._playerStats, currentEvent);
    this.dlgTyping.setVisible(false);
    this.dlgText.setText(reply).setVisible(true);
    const col = '#' + this.dialogueNPC.npcData.color.toString(16).padStart(6,'0');
    this._logMsg(this.dialogueNPC.npcData.name + ': ' + reply.slice(0,55) + '...', col);
  }

  /* ── Trade panel ──────────────────────────────────────── */
  _buildTradePanel() {
    const W = this.cameras.main.width, H = this.cameras.main.height;
    const TW = Math.min(480, W-24), TH = Math.min(440, H-80);
    this.tradePanel = this.add.container(W/2, H/2).setVisible(false).setDepth(95);
    const bg = this.add.rectangle(0, 0, TW, TH, 0x08080f, 0.97).setStrokeStyle(1, 0xffdd44, 0.8);
    this.tradeTitleTxt = this.add.text(-TW/2+14, -TH/2+14, '[ SHOP ]', { fontFamily:'Courier New', fontSize:'13px', color:'#ffdd44' });
    const closeBtn = this.add.text(TW/2-14, -TH/2+14, 'X', { fontFamily:'Courier New', fontSize:'14px', color:'#884444' })
      .setOrigin(1,0).setInteractive({ useHandCursor:true });
    closeBtn.on('pointerdown', () => { this.tradeOpen=false; this.tradePanel.setVisible(false); this.worldScene?.audio?.sfxUIClose(); });
    this.tradeContent = this.add.container(0,0);
    this.tradePanel.add([bg, this.tradeTitleTxt, closeBtn, this.tradeContent]);
    this._TW = TW; this._TH = TH;
  }

  _openTradeFromNPC(npc) {
    if (!this._tradeSystem) return;
    this._tradeNPC = npc;
    this.tradeOpen = true;
    this.tradePanel.setVisible(true);
    this._renderTrade(npc);
    this.worldScene?.audio?.sfxUIOpen();
  }

  _renderTrade(npc) {
    this.tradeContent.removeAll(true);
    const TW = this._TW, TH = this._TH;
    const ts = this._tradeSystem;
    const player = this._activePlayer;
    if (!ts || !player) return;

    const shop = ts.getShop(npc.npcData.role);
    const ox   = -TW/2+14;
    let y      = -TH/2+46;

    this.tradeTitleTxt.setText('[ ' + npc.npcData.name + ' — Shop ]');
    this.tradeContent.add(this.add.text(ox, y, 'Your gold: ' + (player.stats.gold||0) + 'g', { fontFamily:'Courier New', fontSize:'10px', color:'#ffee77' }));
    y += 22;

    this.tradeContent.add(this.add.text(ox, y, '-- BUY --', { fontFamily:'Courier New', fontSize:'11px', color:'#88cc88' }));
    y += 20;

    const unique = [...new Set(shop.items)];
    unique.forEach(key => {
      const item  = CONFIG.ITEMS[key]; if (!item) return;
      const price = ts.buyPrice(key, npc.npcData.role);
      const row   = this.add.text(ox, y, item.name + '  —  ' + price + 'g', { fontFamily:'Courier New', fontSize:'11px', color:'#cccccc' });
      const btn   = this.add.text(TW/2-90, y, '[BUY]', { fontFamily:'Courier New', fontSize:'10px', color:'#88cc88' }).setInteractive({ useHandCursor:true });
      btn.on('pointerdown', () => {
        const r = ts.buy(player, key, npc.npcData.role);
        this._logMsg(r.msg, r.ok ? '#88ff88' : '#ff8888');
        if (r.ok) { this.worldScene?.audio?.sfxBuy(); this._renderTrade(npc); }
      });
      this.tradeContent.add(row); this.tradeContent.add(btn);
      y += 20;
    });

    y += 12;
    this.tradeContent.add(this.add.text(ox, y, '-- SELL --', { fontFamily:'Courier New', fontSize:'11px', color:'#cc8888' }));
    y += 20;

    Object.entries(player.inventory).forEach(([key, qty]) => {
      const item  = CONFIG.ITEMS[key]; if (!item) return;
      const price = ts.sellPrice(key);
      const row   = this.add.text(ox, y, item.name + ' x' + qty + '  —  ' + price + 'g each', { fontFamily:'Courier New', fontSize:'11px', color:'#aaaaaa' });
      const btn   = this.add.text(TW/2-90, y, '[SELL]', { fontFamily:'Courier New', fontSize:'10px', color:'#cc8888' }).setInteractive({ useHandCursor:true });
      btn.on('pointerdown', () => {
        const r = ts.sell(player, key);
        this._logMsg(r.msg, r.ok ? '#88ff88' : '#ff8888');
        if (r.ok) { this.worldScene?.audio?.sfxSell(); this._renderTrade(npc); }
      });
      this.tradeContent.add(row); this.tradeContent.add(btn);
      y += 20;
    });
  }

  /* ── Inventory ────────────────────────────────────────── */
  _buildInventory() {
    const W = this.cameras.main.width, H = this.cameras.main.height;
    const IW = Math.min(520, W-24), IH = Math.min(440, H-80);
    this.invPanel = this.add.container(W/2, H/2).setVisible(false).setDepth(90);
    const bg = this.add.rectangle(0,0,IW,IH,0x08080f,0.96).setStrokeStyle(1,0xd4af37,0.7);
    const t  = this.add.text(-IW/2+14,-IH/2+14,'[ INVENTORY ]',{fontFamily:'Courier New',fontSize:'13px',color:'#d4af37'});
    const cl = this.add.text(IW/2-14,-IH/2+14,'X',{fontFamily:'Courier New',fontSize:'14px',color:'#884444'}).setOrigin(1,0).setInteractive({useHandCursor:true});
    cl.on('pointerdown', () => this.toggleInventory(null));
    this.invContent = this.add.container(0,0);
    this.invPanel.add([bg,t,cl,this.invContent]);
    this._IW=IW; this._IH=IH;
  }

  toggleInventory(player) {
    this.invOpen = !this.invOpen;
    this.invPanel.setVisible(this.invOpen);
    if (this.invOpen && player) { this._activePlayer=player; this._renderInv(player); }
    if (!this.invOpen) this.invContent.removeAll(true);
  }

  _renderInv(player) {
    this.invContent.removeAll(true);
    const IW=this._IW, IH=this._IH, ox=-IW/2+14;
    let y=-IH/2+46;
    const inv=player.inventory;

    if (!Object.keys(inv).length) {
      this.invContent.add(this.add.text(ox,y,'Empty.',{fontFamily:'Courier New',fontSize:'11px',color:'#555555'}));
    } else {
      Object.entries(inv).forEach(([key,qty]) => {
        const item=CONFIG.ITEMS[key]; if(!item) return;
        const eq=player.equipment.weapon===key||player.equipment.armor===key;
        const row=this.add.text(ox,y,'- '+item.name+(eq?' [E]':'')+' x'+qty+' ('+item.type+')',{fontFamily:'Courier New',fontSize:'11px',color:eq?'#88ffaa':'#cccccc'});
        this.invContent.add(row);
        if(['consumable','weapon','armor'].includes(item.type)){
          const btn=this.add.text(IW/2-80,y,'[Use]',{fontFamily:'Courier New',fontSize:'11px',color:'#d4af37'}).setInteractive({useHandCursor:true});
          btn.on('pointerdown',()=>{ player.useItem(key); this._renderInv(player); });
          this.invContent.add(btn);
          if(item.type==='consumable') { this.worldScene?.achievements?.track('crafts',0); }
        }
        y+=20;
      });
    }

    y=IH/2-140;
    this.invContent.add(this.add.text(ox,y,'[ EQUIPPED ]',{fontFamily:'Courier New',fontSize:'11px',color:'#d4af37'})); y+=18;
    const wp=player.equipment.weapon?(CONFIG.ITEMS[player.equipment.weapon]?.name||player.equipment.weapon):'none';
    const ar=player.equipment.armor?(CONFIG.ITEMS[player.equipment.armor]?.name||player.equipment.armor):'none';
    this.invContent.add(this.add.text(ox,y,'Weapon: '+wp,{fontFamily:'Courier New',fontSize:'10px',color:'#aaaaff'}));
    this.invContent.add(this.add.text(ox,y+16,'Armor:  '+ar,{fontFamily:'Courier New',fontSize:'10px',color:'#aaffaa'}));

    y=IH/2-90;
    this.invContent.add(this.add.text(ox,y,'[ CRAFT ]',{fontFamily:'Courier New',fontSize:'11px',color:'#88aaff'})); y+=18;
    CONFIG.RECIPES.forEach(r=>{
      const can=Object.entries(r.materials).every(([k,n])=>(inv[k]||0)>=n);
      const btn=this.add.text(ox,y,(can?'> ':'x ')+r.label,{fontFamily:'Courier New',fontSize:'10px',color:can?'#aaccff':'#444444'});
      if(can){
        btn.setInteractive({useHandCursor:true});
        btn.on('pointerdown',()=>{
          Object.entries(r.materials).forEach(([k,n])=>player.removeItem(k,n));
          player.addItem(r.result);
          this.worldScene?.audio?.sfxPickup();
          this.worldScene?.achievements?.track('crafts');
          this._logMsg('Crafted: '+CONFIG.ITEMS[r.result].name,'#88aaff');
          this._renderInv(player);
        });
      }
      this.invContent.add(btn); y+=18;
    });
  }

  /* ── Quest journal ────────────────────────────────────── */
  _buildQuestJournal() {
    const W=this.cameras.main.width, H=this.cameras.main.height;
    const QW=Math.min(480,W-24), QH=Math.min(400,H-80);
    this.questPanel=this.add.container(W/2,H/2).setVisible(false).setDepth(91);
    const bg=this.add.rectangle(0,0,QW,QH,0x080810,0.96).setStrokeStyle(1,0x88aaff,0.8);
    const t=this.add.text(-QW/2+14,-QH/2+14,'[ QUEST JOURNAL ]',{fontFamily:'Courier New',fontSize:'13px',color:'#88aaff'});
    const cl=this.add.text(QW/2-14,-QH/2+14,'X',{fontFamily:'Courier New',fontSize:'14px',color:'#884444'}).setOrigin(1,0).setInteractive({useHandCursor:true});
    cl.on('pointerdown',()=>{this.questOpen=false;this.questPanel.setVisible(false);});
    this.questContent=this.add.container(0,0);
    this.questPanel.add([bg,t,cl,this.questContent]);
    this._QW=QW; this._QH=QH;
  }

  refreshQuests(qs) {
    if (!qs) return;
    this.questContent.removeAll(true);
    const QW=this._QW, QH=this._QH, ox=-QW/2+14;
    let y=-QH/2+46;
    if (!qs.active.length && !qs.done.length) {
      this.questContent.add(this.add.text(ox,y,'No quests yet. Talk to an NPC.',{fontFamily:'Courier New',fontSize:'11px',color:'#555555'})); return;
    }
    if (qs.active.length) {
      this.questContent.add(this.add.text(ox,y,'-- ACTIVE --',{fontFamily:'Courier New',fontSize:'11px',color:'#88aaff'})); y+=20;
      qs.active.forEach(q=>{
        this.questContent.add(this.add.text(ox,y,q.title,{fontFamily:'Courier New',fontSize:'11px',color:'#cccccc'})); y+=16;
        this.questContent.add(this.add.text(ox+10,y,q.desc.slice(0,70),{fontFamily:'Courier New',fontSize:'9px',color:'#666666',wordWrap:{width:QW-30}})); y+=16;
        this.questContent.add(this.add.text(ox+10,y,'Progress: '+q.progress+'/'+q.needed,{fontFamily:'Courier New',fontSize:'9px',color:'#88aa66'})); y+=20;
      });
    }
    if (qs.done.length) {
      this.questContent.add(this.add.text(ox,y,'-- DONE --',{fontFamily:'Courier New',fontSize:'11px',color:'#44aa44'})); y+=20;
      qs.done.slice(-6).forEach(q=>{
        this.questContent.add(this.add.text(ox,y,'+ '+q.title,{fontFamily:'Courier New',fontSize:'10px',color:'#446644'})); y+=16;
      });
    }
  }

  toggleQuestJournal(qs) {
    this.questOpen=!this.questOpen;
    this.questPanel.setVisible(this.questOpen);
    if (this.questOpen && qs) this.refreshQuests(qs);
  }

  /* ── Skill tree ───────────────────────────────────────── */
  _buildSkillTree() {
    const W=this.cameras.main.width, H=this.cameras.main.height;
    const SW=Math.min(460,W-24), SH=Math.min(420,H-80);
    this.skillPanel=this.add.container(W/2,H/2).setVisible(false).setDepth(92);
    const bg=this.add.rectangle(0,0,SW,SH,0x080810,0.96).setStrokeStyle(1,0xcc88ff,0.8);
    const t=this.add.text(-SW/2+14,-SH/2+14,'[ SKILLS ]',{fontFamily:'Courier New',fontSize:'13px',color:'#cc88ff'});
    const cl=this.add.text(SW/2-14,-SH/2+14,'X',{fontFamily:'Courier New',fontSize:'14px',color:'#884444'}).setOrigin(1,0).setInteractive({useHandCursor:true});
    cl.on('pointerdown',()=>{this.skillOpen=false;this.skillPanel.setVisible(false);});
    this.skillContent=this.add.container(0,0);
    this.skillPanel.add([bg,t,cl,this.skillContent]);
    this._SW=SW; this._SH=SH;
  }

  toggleSkillTree(player) {
    this.skillOpen=!this.skillOpen;
    this.skillPanel.setVisible(this.skillOpen);
    if(this.skillOpen&&player) this._renderSkills(player);
    if(!this.skillOpen) this.skillContent.removeAll(true);
  }

  _renderSkills(player) {
    this.skillContent.removeAll(true);
    const SW=this._SW, SH=this._SH, ox=-SW/2+14;
    let y=-SH/2+46;
    const cls=player.playerClass||'WARRIOR';
    const clsD=CONFIG.CLASSES[cls];
    const col='#'+(clsD?.color||0xaaaaff).toString(16).padStart(6,'0');
    this.skillContent.add(this.add.text(ox,y,'Class: '+(clsD?.name||cls),{fontFamily:'Courier New',fontSize:'12px',color:col})); y+=26;
    const pts=Math.max(0,player.stats.level-1-Object.values(player.skills||{}).reduce((a,b)=>a+b,0));
    this.skillContent.add(this.add.text(ox,y,'Skill points: '+pts,{fontFamily:'Courier New',fontSize:'11px',color:'#aaaaaa'})); y+=24;
    (clsD?.skills||[]).forEach(key=>{
      const sk=CONFIG.SKILLS[key]; if(!sk) return;
      const rank=player.skills?.[key]||0;
      const full=rank>=sk.maxRank;
      this.skillContent.add(this.add.text(ox,y,sk.name+'  ['+rank+'/'+sk.maxRank+']',{fontFamily:'Courier New',fontSize:'12px',color:full?'#ffd700':'#cccccc'}));
      this.skillContent.add(this.add.text(ox+12,y+16,sk.desc,{fontFamily:'Courier New',fontSize:'9px',color:'#666666'}));
      if(!full&&pts>0){
        const btn=this.add.text(SW/2-90,y+8,'[LEARN]',{fontFamily:'Courier New',fontSize:'10px',color:'#88ccff'}).setInteractive({useHandCursor:true});
        btn.on('pointerdown',()=>{ player.learnSkill(key); this._renderSkills(player); });
        this.skillContent.add(btn);
      }
      y+=46;
    });
  }

  /* ── World map ────────────────────────────────────────── */
  _buildWorldMap() {
    const W=this.cameras.main.width, H=this.cameras.main.height;
    const MW=Math.min(500,W-24), MH=Math.min(500,H-80);
    this.mapPanel=this.add.container(W/2,H/2).setVisible(false).setDepth(93);
    const bg=this.add.rectangle(0,0,MW,MH,0x050510,0.97).setStrokeStyle(1,0x44aa44,0.8);
    const t=this.add.text(-MW/2+14,-MH/2+14,'[ WORLD MAP ]  (M close)',{fontFamily:'Courier New',fontSize:'12px',color:'#44aa44'});
    const cl=this.add.text(MW/2-14,-MH/2+14,'X',{fontFamily:'Courier New',fontSize:'14px',color:'#884444'}).setOrigin(1,0).setInteractive({useHandCursor:true});
    cl.on('pointerdown',()=>{this.mapOpen=false;this.mapPanel.setVisible(false);});
    this.mapCanvas=this.add.renderTexture(-MW/2+14,-MH/2+40,MW-28,MH-60).setDepth(1);
    this.mapPanel.add([bg,t,cl,this.mapCanvas]);
    this._MW=MW; this._MH=MH;
  }

  toggleWorldMap(mapData) {
    this.mapOpen=!this.mapOpen;
    this.mapPanel.setVisible(this.mapOpen);
    if(this.mapOpen&&mapData) this._renderWorldMap(mapData);
  }

  _renderWorldMap(mapData) {
    const W=this._MW-28, H=this._MH-60, rows=mapData.length, cols=mapData[0].length;
    const sx=W/cols, sy=H/rows, T=CONFIG.TILES;
    const CM={[T.DEEP_WATER]:'#0d2137',[T.WATER]:'#1a4a80',[T.SAND]:'#c8a848',[T.GRASS]:'#2d6a30',[T.FOREST]:'#1a4520',[T.STONE]:'#5a5a5a',[T.DUNGEON_FLOOR]:'#3a4550',[T.DUNGEON_WALL]:'#141414',[T.PATH]:'#7a5a3a',[T.TOWN_FLOOR]:'#8a9a8a'};
    const g=this.make.graphics({add:false});
    for(let y=0;y<rows;y++) for(let x=0;x<cols;x++){g.fillStyle(parseInt((CM[mapData[y][x]]||'#333333').replace('#',''),16));g.fillRect(x*sx,y*sy,Math.max(1,sx),Math.max(1,sy));}
    const tcx=Math.floor(cols/2), tcy=Math.floor(rows/2);
    g.fillStyle(0xffd700); g.fillCircle(tcx*sx,tcy*sy,4);
    g.fillStyle(0xaa44ff); g.fillCircle((tcx+50)*sx,(tcy-10)*sy,4);
    this.mapCanvas.clear().draw(g); g.destroy();
  }

  /* ── Stats & achievements screen ─────────────────────── */
  _buildStatsScreen() {
    const W=this.cameras.main.width, H=this.cameras.main.height;
    const SW=Math.min(500,W-24), SH=Math.min(480,H-80);
    this.statsPanel=this.add.container(W/2,H/2).setVisible(false).setDepth(94);
    const bg=this.add.rectangle(0,0,SW,SH,0x080810,0.97).setStrokeStyle(1,0xffaa44,0.8);
    const t=this.add.text(-SW/2+14,-SH/2+14,'[ CHARACTER ]  C to close',{fontFamily:'Courier New',fontSize:'12px',color:'#ffaa44'});
    const cl=this.add.text(SW/2-14,-SH/2+14,'X',{fontFamily:'Courier New',fontSize:'14px',color:'#884444'}).setOrigin(1,0).setInteractive({useHandCursor:true});
    cl.on('pointerdown',()=>{this.statsOpen=false;this.statsPanel.setVisible(false);});
    this.statsContent=this.add.container(0,0);
    this.statsPanel.add([bg,t,cl,this.statsContent]);
    this._SW2=SW; this._SH2=SH;
  }

  toggleStatsScreen(player, achievements) {
    this.statsOpen=!this.statsOpen;
    this.statsPanel.setVisible(this.statsOpen);
    if(this.statsOpen) this._renderStats(player, achievements);
    if(!this.statsOpen) this.statsContent.removeAll(true);
  }

  _renderStats(player, achievements) {
    this.statsContent.removeAll(true);
    const SW=this._SW2, SH=this._SH2, ox=-SW/2+14;
    let y=-SH/2+46;
    const s=player.stats;
    const cls=CONFIG.CLASSES[player.playerClass||'WARRIOR'];
    const col='#'+(cls?.color||0xaaaaff).toString(16).padStart(6,'0');

    this.statsContent.add(this.add.text(ox,y,s.name+' the '+cls?.name,{fontFamily:'Courier New',fontSize:'14px',color:col})); y+=22;
    const stats=[
      ['Level',s.level],['HP',s.hp+'/'+s.maxHp],['Attack',s.attack],
      ['Defense',s.defense],['Speed',s.speed],['Gold',s.gold||0],
      ['XP',s.xp+'/'+s.xpNeeded],
    ];
    const eqAtk=player.equipment.weapon?(CONFIG.ITEMS[player.equipment.weapon]?.atk||0):0;
    const eqDef=player.equipment.armor?(CONFIG.ITEMS[player.equipment.armor]?.def||0):0;
    if(eqAtk) stats.push(['Weapon bonus','+'+eqAtk+' atk']);
    if(eqDef) stats.push(['Armor bonus','+'+eqDef+' def']);
    stats.forEach(([k,v])=>{
      this.statsContent.add(this.add.text(ox,y,k+':',{fontFamily:'Courier New',fontSize:'11px',color:'#888888'}));
      this.statsContent.add(this.add.text(ox+130,y,String(v),{fontFamily:'Courier New',fontSize:'11px',color:'#ffffff'}));
      y+=18;
    });

    y+=14;
    this.statsContent.add(this.add.text(ox,y,'-- ACHIEVEMENTS --',{fontFamily:'Courier New',fontSize:'11px',color:'#ffaa44'})); y+=20;
    if(achievements){
      achievements.getAll().forEach(a=>{
        const col2=a.unlocked?'#ffd700':'#444444';
        this.statsContent.add(this.add.text(ox,y,(a.unlocked?'[x] ':'[ ] ')+a.name+' — '+a.desc,{fontFamily:'Courier New',fontSize:'10px',color:col2}));
        y+=16;
      });
    }
  }

  /* ── Touch controls ───────────────────────────────────── */
  _buildTouchControls() {
    const isMobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&window.innerWidth<900);
    if(!isMobile) return;
    const W=this.cameras.main.width, H=this.cameras.main.height;
    const jR=50, jx=jR+24, jy=H-jR-24;
    this.joyBase=this.add.circle(jx,jy,jR,0xffffff,0.08).setDepth(200).setStrokeStyle(1,0xffffff,0.3);
    this.joyKnob=this.add.circle(jx,jy,jR*0.44,0xffffff,0.22).setDepth(201);
    this._joy={active:false,id:null,ox:jx,oy:jy,dx:0,dy:0};
    const bx=W-24, by=H-24;
    this._touchBtn(bx-80,by-50,'ATK',0xdd3333,()=>{ const p=this.worldScene?.player; if(!p) return; let best=null,bd=999; this.worldScene?.enemies?.forEach(e=>{ if(e.isDead) return; const d=Phaser.Math.Distance.Between(p.x,p.y,e.x,e.y); if(d<bd){bd=d;best=e;} }); if(best){p.setTarget(best);p.moveTarget=null;} });
    this._touchBtn(bx,by-50,'E',0x44aa44,()=>{ if(this.worldScene?.nearbyNPC) this.worldScene._openDialogue(this.worldScene.nearbyNPC); });
    this._touchBtn(bx-40,by,'INV',0x4444aa,()=>this.toggleInventory(this.worldScene?.player));
    this.input.on('pointerdown',ptr=>{ if(ptr.x<W/2&&!this._joy.active){this._joy={active:true,id:ptr.id,ox:ptr.x,oy:ptr.y,dx:0,dy:0};this.joyBase.setPosition(ptr.x,ptr.y);this.joyKnob.setPosition(ptr.x,ptr.y);} });
    this.input.on('pointermove',ptr=>{ if(!this._joy.active||ptr.id!==this._joy.id) return; const dx=ptr.x-this._joy.ox,dy=ptr.y-this._joy.oy,len=Math.sqrt(dx*dx+dy*dy),cap=jR*0.85,nx=len>cap?dx/len*cap:dx,ny=len>cap?dy/len*cap:dy; this.joyKnob.setPosition(this._joy.ox+nx,this._joy.oy+ny); this._joy.dx=nx/cap; this._joy.dy=ny/cap; });
    this.input.on('pointerup',ptr=>{ if(ptr.id!==this._joy.id) return; this._joy.active=false;this._joy.dx=0;this._joy.dy=0;this.joyBase.setPosition(jx,jy);this.joyKnob.setPosition(jx,jy); });
    this.time.addEvent({delay:16,loop:true,callback:()=>{ const p=this.worldScene?.player; if(!p||!this._joy.active) return; p.setVelocity(this._joy.dx*p.stats.speed,this._joy.dy*p.stats.speed); }});
  }

  _touchBtn(x,y,label,color,cb){
    const b=this.add.circle(x,y,28,color,0.22).setDepth(200).setStrokeStyle(1,color,0.5).setInteractive({useHandCursor:true});
    this.add.text(x,y,label,{fontFamily:'Courier New',fontSize:'10px',color:'#ffffff'}).setOrigin(0.5).setDepth(201);
    b.on('pointerdown',cb); return b;
  }

  /* ── DOM input ────────────────────────────────────────── */
  _bindKeyboard() {
    document.getElementById('dialogue-send')?.addEventListener('click', () => this._sendDialogue());
    document.getElementById('dialogue-text')?.addEventListener('keydown', e => {
      if (e.key==='Enter') this._sendDialogue();
      if (e.key==='Escape') this._closeDialogue();
      e.stopPropagation();
    });
    this.input.keyboard.on('keydown-Q', () => { if(this.worldScene) this.toggleQuestJournal(this.worldScene.questSystem); });
    this.input.keyboard.on('keydown-K', () => this.toggleSkillTree(this._activePlayer||this.worldScene?.player));
    this.input.keyboard.on('keydown-M', () => { if(this.worldScene) this.toggleWorldMap(this.worldScene.mapData); });
    this.input.keyboard.on('keydown-C', () => { if(this.worldScene) this.toggleStatsScreen(this.worldScene.player, this.worldScene.achievements); });
    this.input.keyboard.on('keydown-T', () => { if(this.worldScene?.nearbyNPC && this._tradeSystem) this._openTradeFromNPC(this.worldScene.nearbyNPC); });
    this.input.keyboard.on('keydown-ESC', () => {
      this._closeDialogue();
      [this.questPanel,this.skillPanel,this.mapPanel,this.statsPanel,this.tradePanel].forEach(p=>p?.setVisible(false));
      this.questOpen=this.skillOpen=this.mapOpen=this.statsOpen=this.tradeOpen=false;
    });
  }
}
