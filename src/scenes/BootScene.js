import { CONFIG } from '../config.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    const { width:W, height:H } = this.cameras.main;

    this.add.text(W/2, H/2 - 28, 'AETHORIA', {
      fontFamily:'Courier New', fontSize:'38px', color:'#d4af37',
    }).setOrigin(0.5);
    const loadTxt = this.add.text(W/2, H/2 + 18, 'Loading...', {
      fontFamily:'Courier New', fontSize:'14px', color:'#555555',
    }).setOrigin(0.5);

    // Load all sprite assets from the assets/ folder
    this.load.image('tileset',   'assets/tileset.png');
    this.load.image('player',    'assets/player.png');
    this.load.image('loot',      'assets/loot.png');
    this.load.image('particle',  'assets/particle.png');

    Object.keys(CONFIG.ENEMY_TYPES).forEach(k => {
      this.load.image('enemy_' + k, `assets/enemy_${k}.png`);
    });
    Object.keys(CONFIG.BOSS_TYPES).forEach(k => {
      this.load.image('boss_' + k, `assets/boss_${k}.png`);
    });
    CONFIG.NPCS_DATA.forEach((_, i) => {
      this.load.image('npc_' + i, `assets/npc_${i}.png`);
    });

    // Progress bar
    const barBg = this.add.rectangle(W/2, H/2 + 44, 260, 8, 0x222222).setOrigin(0.5);
    const barFg = this.add.rectangle(W/2 - 130, H/2 + 44, 0, 8, 0xd4af37).setOrigin(0, 0.5);

    this.load.on('progress', v => {
      barFg.width = 260 * v;
      loadTxt.setText('Loading... ' + Math.floor(v * 100) + '%');
    });
  }

  create() {
    this.scene.start('MenuScene');
  }
}
