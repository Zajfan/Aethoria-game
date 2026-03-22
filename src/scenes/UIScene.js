import { CONFIG } from '../config.js';

export class UIScene extends Phaser.Scene {
  constructor() { super({ key:'UIScene', active:false }); }

  create() {
    this.worldScene    = null;
    this.dialogueNPC   = null;
    this.invOpen       = false;
    this.invItems      = [];
    this._msgQueue     = [];

    this._buildHUD();
    this._buildDialogueBox();
    this._buildInventory();
    this._bindInput();
  }

  bindWorld(worldScene) {
    this.worldScene = worldScene;
    const p = worldScene.player;

    worldScene.events.on('statsChanged',    s  => this._updateStats(s));
    worldScene.events.on('inventoryChanged',inv => { this.invItems = inv; if (this.invOpen) this._renderInv(p); });
    worldScene.events.on('levelUp',         lv => this._logMsg('★ Level Up! Now level ' + lv, '#ffd700'));

    this._updateStats(p.stats);
  }

  /* ── HUD ──────────────────────────────────────────────── */
  _buildHUD() {
    const W = this.cameras.main.width;

    // HP bar
    this.add.text(10, 10, 'HP', { fontFamily:'Courier New', fontSize:'11px', color:'#aaaaaa' });
    this.hpBarBg   = this.add.rectangle(36,  16, 130, 10, 0x330000).setOrigin(0, 0.5);
    this.hpBarFill = this.add.rectangle(36,  16, 130, 10, 0xdd3333).setOrigin(0, 0.5);
    this.hpText    = this.add.text(170, 10, '100/100', { fontFamily:'Courier New', fontSize:'10px', color:'#ff7777' });

    // XP bar
    this.add.text(10, 26, 'XP', { fontFamily:'Courier New', fontSize:'11px', color:'#aaaaaa' });
    this.xpBarBg   = this.add.rectangle(36,  32, 130, 6,  0x222200).setOrigin(0, 0.5);
    this.xpBarFill = this.add.rectangle(36,  32, 130, 6,  0xddaa00).setOrigin(0, 0.5);

    // Level / Gold
    this.levelText = this.add.text(10, 40, 'Lv.1', { fontFamily:'Courier New', fontSize:'11px', color:'#d4af37' });
    this.goldText  = this.add.text(10, 54, '♦ 0',  { fontFamily:'Courier New', fontSize:'11px', color:'#ffee77' });

    // Controls hint (top-right)
    this.add.text(W - 8, 10,
      'WASD: Move  E: Talk  I: Inventory  Click: Attack',
      { fontFamily:'Courier New', fontSize:'9px', color:'#333333' }
    ).setOrigin(1, 0);

    // Message log (bottom-left)
    this.msgTexts = [];
    for (let i = 0; i < 5; i++) {
      this.msgTexts.push(
        this.add.text(10, this.cameras.main.height - 20 - i * 16, '', {
          fontFamily:'Courier New', fontSize:'11px', color:'#888888',
          stroke:'#000000', strokeThickness:2,
        })
      );
    }
  }

  _updateStats(s) {
    const ratio = Math.max(0, s.hp / s.maxHp);
    this.hpBarFill.setSize(130 * ratio, 10);
    this.hpText.setText(s.hp + '/' + s.maxHp);

    const xpRatio = s.xp / s.xpNeeded;
    this.xpBarFill.setSize(130 * xpRatio, 6);

    this.levelText.setText('Lv.' + s.level);
    this.goldText.setText('♦ ' + (s.gold || 0));
  }

  _logMsg(msg, color = '#888888') {
    // Shift existing messages up
    this.msgTexts.forEach((t, i) => {
      if (i < this.msgTexts.length - 1) {
        const src = this.msgTexts[i + 1];
        t.setText(src.text).setColor(src.style.color);
      }
    });
    const last = this.msgTexts[this.msgTexts.length - 1];
    last.setText(msg).setColor(color);

    // Reposition in case of resize
    const H = this.cameras.main.height;
    this.msgTexts.forEach((t, i) => t.setY(H - 20 - (this.msgTexts.length - 1 - i) * 16));
  }

  /* ── Dialogue box ─────────────────────────────────────── */
  _buildDialogueBox() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const PW = Math.min(600, W - 24);
    const PH = 160;
    const px = W / 2;
    const py = H - PH / 2 - 12;

    this.dialoguePanel = this.add.container(px, py).setVisible(false).setDepth(80);

    this.dialogueBg = this.add.rectangle(0, 0, PW, PH, 0x080810, 0.94)
      .setStrokeStyle(1, 0xd4af37, 0.8);

    this.dialogueName = this.add.text(-PW/2 + 14, -PH/2 + 12, '', {
      fontFamily:'Courier New', fontSize:'12px', color:'#d4af37',
    });
    this.dialogueText = this.add.text(-PW/2 + 14, -PH/2 + 32, '', {
      fontFamily:'Courier New', fontSize:'12px', color:'#cccccc',
      wordWrap:{ width: PW - 28 }, lineSpacing: 4,
    });
    this.dialogueTyping = this.add.text(-PW/2 + 14, -PH/2 + 32, '...', {
      fontFamily:'Courier New', fontSize:'12px', color:'#555555',
    }).setVisible(false);
    this.dialogueClose = this.add.text(PW/2 - 14, -PH/2 + 12, '✕', {
      fontFamily:'Courier New', fontSize:'13px', color:'#884444',
    }).setOrigin(1, 0).setInteractive({ useHandCursor:true });
    this.dialogueClose.on('pointerdown', () => this._closeDialogue());

    this.dialoguePanel.add([
      this.dialogueBg, this.dialogueName, this.dialogueText,
      this.dialogueTyping, this.dialogueClose,
    ]);
  }

  async openDialogue(npc, playerStats) {
    this.dialogueNPC   = npc;
    this._playerStats  = playerStats;

    const col = '#' + npc.npcData.color.toString(16).padStart(6,'0');
    this.dialogueName.setText(npc.npcData.name + '  [' + npc.npcData.role + ']').setColor(col);
    this.dialogueText.setText('').setVisible(true);
    this.dialogueTyping.setVisible(true);
    this.dialoguePanel.setVisible(true);

    // Initial greeting via AI
    const greeting = await npc.talk('Hello, greet me as I approach for the first time.', playerStats);
    this.dialogueTyping.setVisible(false);
    this.dialogueText.setText(greeting);

    this._logMsg(npc.npcData.name + ': ' + greeting.slice(0, 60) + (greeting.length > 60 ? '...' : ''), col);

    // Show DOM input bar
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
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const IW = Math.min(520, W - 24);
    const IH = Math.min(440, H - 80);

    this.invPanel = this.add.container(W/2, H/2).setVisible(false).setDepth(90);
    this.invBg    = this.add.rectangle(0, 0, IW, IH, 0x08080f, 0.96)
      .setStrokeStyle(1, 0xd4af37, 0.7);

    this.invTitle = this.add.text(-IW/2 + 14, -IH/2 + 14, '[ INVENTORY ]', {
      fontFamily:'Courier New', fontSize:'13px', color:'#d4af37',
    });
    this.invCloseBtn = this.add.text(IW/2 - 14, -IH/2 + 14, '✕', {
      fontFamily:'Courier New', fontSize:'14px', color:'#884444',
    }).setOrigin(1, 0).setInteractive({ useHandCursor:true });
    this.invCloseBtn.on('pointerdown', () => this.toggleInventory(null));

    this.invContent = this.add.container(0, 0);
    this.invPanel.add([this.invBg, this.invTitle, this.invCloseBtn, this.invContent]);

    // Crafting header
    this.craftTitle = this.add.text(-IW/2 + 14, IH/2 - 120, '[ CRAFT ]', {
      fontFamily:'Courier New', fontSize:'12px', color:'#88aaff',
    });
    this.invPanel.add(this.craftTitle);

    this._IW = IW; this._IH = IH;
  }

  toggleInventory(player) {
    this.invOpen = !this.invOpen;
    this.invPanel.setVisible(this.invOpen);
    if (this.invOpen && player) {
      this._activePlayer = player;
      this.invItems = player.inventory;
      this._renderInv(player);
    }
    if (!this.invOpen) this.invContent.removeAll(true);
  }

  _renderInv(player) {
    this.invContent.removeAll(true);
    const IW = this._IW, IH = this._IH;
    const ox = -IW/2 + 14;
    let y    = -IH/2 + 46;

    if (Object.keys(this.invItems).length === 0) {
      const empty = this.add.text(ox, y, 'Your pack is empty.', {
        fontFamily:'Courier New', fontSize:'11px', color:'#555555',
      });
      this.invContent.add(empty);
      return;
    }

    Object.entries(this.invItems).forEach(([key, qty]) => {
      const item = CONFIG.ITEMS[key];
      if (!item) return;

      const isEquipped = player.equipment.weapon === key || player.equipment.armor === key;
      const color      = isEquipped ? '#88ffaa' : '#cccccc';
      const eqTag      = isEquipped ? ' [E]' : '';

      const row = this.add.text(ox, y,
        `• ${item.name}${eqTag}  x${qty}  (${item.type})`,
        { fontFamily:'Courier New', fontSize:'11px', color }
      );

      if (item.type === 'consumable' || item.type === 'weapon' || item.type === 'armor') {
        const btn = this.add.text(IW/2 - 80, y, '[Use]', {
          fontFamily:'Courier New', fontSize:'11px', color:'#d4af37',
        }).setInteractive({ useHandCursor:true });
        btn.on('pointerdown', () => { player.useItem(key); this._renderInv(player); });
        this.invContent.add(btn);
      }

      this.invContent.add(row);
      y += 20;
    });

    // Crafting recipes
    y = IH/2 - 100;
    CONFIG.RECIPES.forEach(recipe => {
      const canCraft = Object.entries(recipe.materials).every(
        ([k, n]) => (this.invItems[k] || 0) >= n
      );
      const craftBtn = this.add.text(ox, y, (canCraft ? '▶ ' : '✗ ') + recipe.label, {
        fontFamily:'Courier New', fontSize:'11px',
        color: canCraft ? '#aaccff' : '#444444',
      });
      if (canCraft) {
        craftBtn.setInteractive({ useHandCursor:true });
        craftBtn.on('pointerdown', () => {
          Object.entries(recipe.materials).forEach(([k, n]) => player.removeItem(k, n));
          player.addItem(recipe.result);
          this._logMsg('Crafted: ' + CONFIG.ITEMS[recipe.result].name, '#88aaff');
          this._renderInv(player);
        });
      }
      this.invContent.add(craftBtn);
      y += 20;
    });
  }

  /* ── DOM input binding ────────────────────────────────── */
  _bindInput() {
    const sendBtn   = document.getElementById('dialogue-send');
    const inputEl   = document.getElementById('dialogue-text');
    const closeKeys = new Set(['Escape']);

    sendBtn.addEventListener('click', () => this._sendDialogue());
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._sendDialogue();
      if (closeKeys.has(e.key)) this._closeDialogue();
      e.stopPropagation();
    });
  }
}
