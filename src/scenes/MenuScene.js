export class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    const { width:W, height:H } = this.cameras.main;
    const cx = W / 2;

    this.add.rectangle(cx, H/2, W, H, 0x0a0a0f);

    // Stars
    for (let i = 0; i < 220; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(0, H);
      const a = Math.random() * 0.7 + 0.2;
      const s = Math.random() < 0.15 ? 2 : 1;
      this.add.rectangle(x, y, s, s, 0xffffff, a);
    }

    // Title
    const title = this.add.text(cx, H * 0.22, 'AETHORIA', {
      fontFamily:'Courier New,monospace',
      fontSize: Math.min(68, W / 11) + 'px',
      color:'#d4af37',
      stroke:'#6b4a00',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(cx, H * 0.33, 'An AI-Powered Open World RPG', {
      fontFamily:'Courier New,monospace', fontSize:'14px', color:'#666666',
    }).setOrigin(0.5);

    this.add.text(cx, H * 0.40, '◆ Hearthmoor — The Last Haven ◆', {
      fontFamily:'Courier New,monospace', fontSize:'12px', color:'#3a3a2a',
    }).setOrigin(0.5);

    // Play button
    const playBtn = this._btn(cx, H * 0.56, '[ BEGIN YOUR JOURNEY ]', 20, '#d4af37');
    playBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.time.delayedCall(620, () => {
        this.scene.start('WorldScene');
      });
    });

    // Settings
    const settBtn = this._btn(cx, H * 0.66, '[ API Settings ]', 13, '#445544');
    settBtn.on('pointerdown', () => {
      localStorage.removeItem('aethoria_no_ai');
      document.getElementById('api-modal').classList.add('show');
    });

    // Controls hint
    this.add.text(cx, H * 0.85, 'WASD / Arrows: Move   E: Talk   I: Inventory   Click Enemy: Attack', {
      fontFamily:'Courier New,monospace', fontSize:'11px', color:'#3a3a3a',
    }).setOrigin(0.5);

    // Pulse title
    this.tweens.add({ targets: title, alpha: 0.75, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
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
