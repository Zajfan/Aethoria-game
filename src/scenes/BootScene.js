import { CONFIG } from '../config.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    const { width:W, height:H } = this.cameras.main;
    this.add.text(W/2, H/2 - 22, 'AETHORIA', {
      fontFamily:'Courier New', fontSize:'36px', color:'#d4af37',
    }).setOrigin(0.5);
    this.add.text(W/2, H/2 + 16, 'Generating world...', {
      fontFamily:'Courier New', fontSize:'14px', color:'#666666',
    }).setOrigin(0.5);
  }

  create() {
    this._makeTileset();
    this._makePlayer();
    this._makeEnemies();
    this._makeBosses();
    this._makeNPCs();
    this._makeLoot();
    this._makeParticle();
    this.scene.start('MenuScene');
  }

  /* ── Tileset ─────────────────────────────────────────────── */
  _makeTileset() {
    const T = CONFIG.TILE_SIZE;
    const NUM = 10;
    const canvas = document.createElement('canvas');
    canvas.width  = T * NUM;
    canvas.height = T;
    const c = canvas.getContext('2d');

    const tiles = [
      { base:'#0d2137', style:'water',   detail:'#091a2a' }, // 1 deep water
      { base:'#1a4a80', style:'water',   detail:'#0f3060' }, // 2 water
      { base:'#c8a848', style:'dots',    detail:'#b89030' }, // 3 sand
      { base:'#2d6a30', style:'grass',   detail:'#1e4f20' }, // 4 grass
      { base:'#1a4520', style:'forest',  detail:'#0f2e14' }, // 5 forest
      { base:'#5a5a5a', style:'stone',   detail:'#404040' }, // 6 stone
      { base:'#2a3540', style:'dungeon', detail:'#1e2730' }, // 7 dungeon floor
      { base:'#141414', style:'wall',    detail:'#0a0a0a' }, // 8 dungeon wall
      { base:'#7a5a3a', style:'path',    detail:'#6a4a28' }, // 9 dirt path
      { base:'#8a9a8a', style:'town',    detail:'#7a8a7a' }, // 10 town floor
    ];

    tiles.forEach((t, i) => {
      const ox = i * T;
      c.fillStyle = t.base;
      c.fillRect(ox, 0, T, T);
      c.fillStyle = t.detail;

      switch (t.style) {
        case 'water':
          for (let wy = 5; wy < T; wy += 9) {
            for (let wx = 0; wx < T; wx += 7) c.fillRect(ox+wx, wy, 5, 1);
          }
          break;
        case 'grass':
          for (let g = 0; g < 6; g++) {
            c.fillRect(ox + (g*7+3)%T, (g*11+5)%(T-5), 1, 4);
          }
          break;
        case 'forest':
          c.fillStyle = '#0a2010';
          c.beginPath(); c.arc(ox+T/2, T/2, T/2-2, 0, Math.PI*2); c.fill();
          c.fillStyle = '#2a6a20';
          c.beginPath(); c.arc(ox+T/2, T/2, T/2-5, 0, Math.PI*2); c.fill();
          c.fillStyle = '#3a8a28';
          c.beginPath(); c.arc(ox+T/2, T/2-4, T/2-8, 0, Math.PI*2); c.fill();
          break;
        case 'stone':
          c.strokeStyle = t.detail; c.lineWidth = 1;
          c.beginPath(); c.moveTo(ox+5,5); c.lineTo(ox+14,13); c.lineTo(ox+22,11); c.stroke();
          c.beginPath(); c.moveTo(ox+18,18); c.lineTo(ox+26,28); c.stroke();
          break;
        case 'dungeon':
          c.fillRect(ox, T/2, T, 1);
          c.fillRect(ox+T/2, 0, 1, T);
          break;
        case 'wall':
          c.fillStyle = '#202020';
          for (let row = 0; row < 4; row++) {
            const off = (row % 2) * 8;
            for (let col = 0; col < 2; col++) c.fillRect(ox+off+col*16, row*8+1, 15, 6);
          }
          break;
        case 'path':
          c.fillStyle = '#9a7a5a';
          for (let p = 0; p < 4; p++) {
            c.beginPath(); c.arc(ox+(p*9+4)%T, (p*7+6)%(T-4), 2, 0, Math.PI*2); c.fill();
          }
          break;
        case 'town':
          c.fillRect(ox, T/2, T, 1);
          c.fillRect(ox+T/4, 0, 1, T/2);
          c.fillRect(ox+3*T/4, T/2, 1, T/2);
          break;
        case 'dots':
          for (let d = 0; d < 6; d++) c.fillRect(ox+(d*5+3)%T, (d*7+2)%T, 2, 2);
          break;
      }
    });

    this.textures.addCanvas('tileset', canvas);
  }

  /* ── Player ──────────────────────────────────────────────── */
  _makePlayer() {
    const g = this.make.graphics({ add: false });
    const S = 26;
    g.fillStyle(0x2255cc); g.fillCircle(S/2, S/2, S/2-1);
    g.fillStyle(0x3366ee); g.fillCircle(S/2-2, S/2-3, 6);
    g.fillStyle(0xffd0a0); g.fillCircle(S/2, S/2-3, 5);
    g.fillStyle(0x222222); g.fillCircle(S/2-1, S/2-4, 1); g.fillCircle(S/2+2, S/2-4, 1);
    g.fillStyle(0xccddff); g.fillCircle(S/2-4, S/2+1, 3);
    g.generateTexture('player', S, S);
    g.destroy();
  }

  /* ── Enemies ─────────────────────────────────────────────── */
  _makeEnemies() {
    Object.entries(CONFIG.ENEMY_TYPES).forEach(([key, d]) => {
      const g = this.make.graphics({ add: false });
      const S = d.sz * 2 + 6;
      g.fillStyle(d.color);
      if (key === 'WOLF') {
        g.fillTriangle(S/2,2, S-2,S-2, 2,S-2);
      } else if (key === 'TROLL') {
        g.fillRect(2, 4, S-4, S-6);
        g.fillStyle(Phaser.Display.Color.ValueToColor(d.color).darken(30).color);
        g.fillRect(5, 7, S-10, S-14);
      } else if (key === 'SKELETON') {
        g.fillRect(4, 2, S-8, S-4);
        g.fillStyle(0xddddaa); g.fillCircle(S/2, S/4, S/4);
      } else {
        g.fillCircle(S/2, S/2, S/2-1);
      }
      g.fillStyle(0xff2222);
      g.fillCircle(S/2-3, S/2-2, 2);
      g.fillCircle(S/2+3, S/2-2, 2);
      g.generateTexture('enemy_' + key, S, S);
      g.destroy();
    });
  }

  /* ── NPCs ────────────────────────────────────────────────── */
  _makeNPCs() {
    CONFIG.NPCS_DATA.forEach((npc, i) => {
      const g = this.make.graphics({ add: false });
      const S = 28;
      g.fillStyle(npc.color); g.fillCircle(S/2, S/2, S/2-1);
      g.fillStyle(0xffe0c0); g.fillCircle(S/2, S/2-4, 7);
      g.fillStyle(npc.color & 0xcccccc);
      g.fillTriangle(4, S-2, S-4, S-2, S/2, S/2+4);
      g.fillStyle(0x333333); g.fillCircle(S/2-2, S/2-5, 1.5); g.fillCircle(S/2+2, S/2-5, 1.5);
      g.generateTexture('npc_' + i, S, S);
      g.destroy();
    });
  }

  /* ── Loot ────────────────────────────────────────────────── */
  _makeLoot() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(0xffd700); g.fillCircle(8, 8, 7);
    g.fillStyle(0xffaa00); g.fillCircle(7, 7, 4);
    g.fillStyle(0xffee44); g.fillRect(6, 5, 2, 2);
    g.generateTexture('loot', 16, 16);
    g.destroy();
  }

  /* ── Bosses ──────────────────────────────────────────────── */
  _makeBosses() {
    Object.entries(CONFIG.BOSS_TYPES).forEach(([key, d]) => {
      const g = this.make.graphics({ add: false });
      const S = d.sz * 2 + 8;
      g.fillStyle(d.color);
      if (key === 'VOID_KNIGHT') {
        g.fillRect(4, 4, S-8, S-8);
        g.fillStyle(0x220044);
        g.fillRect(8, 8, S-16, S-16);
        g.fillStyle(0xcc44ff);
        g.fillCircle(S/2, S/2, S/4);
        g.fillStyle(0xff88ff);
        g.fillCircle(S/2-5, S/2-4, 4);
        g.fillCircle(S/2+5, S/2-4, 4);
      } else {
        g.fillRect(2, 6, S-4, S-10);
        g.fillStyle(Phaser.Display.Color.ValueToColor(d.color).darken(40).color);
        g.fillRect(6, 10, S-12, S-20);
        g.fillStyle(0xffdd66);
        g.fillCircle(S/2-7, S/2-4, 5);
        g.fillCircle(S/2+7, S/2-4, 5);
      }
      g.generateTexture('boss_' + key, S, S);
      g.destroy();
    });
  }

  /* ── Particle ────────────────────────────────────────────── */
  _makeParticle() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(0xffffff); g.fillCircle(4, 4, 4);
    g.generateTexture('particle', 8, 8);
    g.destroy();
  }
}
