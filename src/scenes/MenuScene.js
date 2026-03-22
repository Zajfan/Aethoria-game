import { CONFIG } from '../config.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    const { width:W, height:H } = this.cameras.main;
    const cx = W / 2;

    this.add.rectangle(cx, H/2, W, H, 0x0a0a0f);
    for (let i = 0; i < 220; i++) {
      const x = Phaser.Math.Between(0, W), y = Phaser.Math.Between(0, H);
      const s = Math.random() < 0.15 ? 2 : 1;
      this.add.rectangle(x, y, s, s, 0xffffff, Math.random() * 0.7 + 0.2);
    }

    const title = this.add.text(cx, H * 0.18, 'AETHORIA', {
      fontFamily:'Courier New,monospace',
      fontSize: Math.min(68, W / 11) + 'px',
      color:'#d4af37', stroke:'#6b4a00', strokeThickness: 5,
    }).setOrigin(0.5);
    this.add.text(cx, H * 0.28, 'An AI-Powered Open World RPG', {
      fontFamily:'Courier New,monospace', fontSize:'14px', color:'#555555',
    }).setOrigin(0.5);
    this.tweens.add({ targets: title, alpha: 0.75, duration: 1600, yoyo: true, repeat: -1, ease:'Sine.InOut' });

    // Class selector
    this._selectedClass = null;
    this._classButtons  = {};
    this._buildClassSelector(cx, H);

    // Buttons
    const playBtn = this._btn(cx, H * 0.78, '[ BEGIN YOUR JOURNEY ]', 18, '#d4af37');
    playBtn.on('pointerdown', () => this._startGame());

    const settBtn = this._btn(cx, H * 0.86, '[ API Settings ]', 12, '#445544');
    settBtn.on('pointerdown', () => {
      localStorage.removeItem('aethoria_no_ai');
      document.getElementById('api-modal').classList.add('show');
    });

    this.add.text(cx, H * 0.93,
      'WASD: Move   E: Talk   I: Inventory   M: World Map   Click: Attack',
      { fontFamily:'Courier New,monospace', fontSize:'10px', color:'#333333' }
    ).setOrigin(0.5);
  }

  _buildClassSelector(cx, H) {
    this.add.text(cx, H * 0.37, 'CHOOSE YOUR CLASS', {
      fontFamily:'Courier New,monospace', fontSize:'13px', color:'#888866',
    }).setOrigin(0.5);

    const classes = Object.entries(CONFIG.CLASSES);
    const boxW = Math.min(160, (this.cameras.main.width - 80) / 3);
    const boxH = 90;
    const gap   = 12;
    const totalW = classes.length * boxW + (classes.length - 1) * gap;
    const startX = cx - totalW / 2;

    classes.forEach(([key, cls], i) => {
      const bx = startX + i * (boxW + gap);
      const by = H * 0.41;
      const color = '#' + cls.color.toString(16).padStart(6,'0');

      const bg = this.add.rectangle(bx + boxW/2, by + boxH/2, boxW, boxH, 0x111111)
        .setStrokeStyle(1, 0x333333).setInteractive({ useHandCursor:true });

      const nameT = this.add.text(bx + boxW/2, by + 16, cls.name, {
        fontFamily:'Courier New', fontSize:'14px', color,
      }).setOrigin(0.5);
      const descT = this.add.text(bx + boxW/2, by + 38, cls.desc, {
        fontFamily:'Courier New', fontSize:'9px', color:'#666666',
        wordWrap:{ width: boxW - 12 }, align:'center',
      }).setOrigin(0.5, 0);

      this._classButtons[key] = { bg, nameT, descT };

      bg.on('pointerdown', () => this._selectClass(key));
      bg.on('pointerover', () => { if (this._selectedClass !== key) bg.setStrokeStyle(1, 0x666666); });
      bg.on('pointerout',  () => { if (this._selectedClass !== key) bg.setStrokeStyle(1, 0x333333); });
    });
  }

  _selectClass(key) {
    this._selectedClass = key;
    const cls   = CONFIG.CLASSES[key];
    const color = cls.color;

    Object.entries(this._classButtons).forEach(([k, b]) => {
      if (k === key) {
        b.bg.setStrokeStyle(2, color).setFillStyle(0x1a1a2a);
      } else {
        b.bg.setStrokeStyle(1, 0x333333).setFillStyle(0x111111);
      }
    });
  }

  _startGame() {
    const cls = this._selectedClass || 'WARRIOR';
    localStorage.setItem('aethoria_class', cls);
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.time.delayedCall(620, () => this.scene.start('WorldScene'));
  }

  _btn(x, y, label, size, color) {
    const btn = this.add.text(x, y, label, {
      fontFamily:'Courier New,monospace', fontSize: size + 'px',
      color, backgroundColor:'#0f0f0a', padding:{ x:18, y:10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setColor('#ffffff'));
    btn.on('pointerout',  () => btn.setColor(color));
    return btn;
  }
}
