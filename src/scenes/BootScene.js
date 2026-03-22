import { CONFIG } from '../config.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {}   // nothing to load — all assets are generated procedurally

  create() {
    const { width: W, height: H } = this.cameras.main;

    // On-screen debug log (removed once MenuScene starts)
    this._log = this.add.text(W/2, H/2 - 20, 'AETHORIA', {
      fontFamily: 'Courier New', fontSize: '32px', color: '#d4af37',
    }).setOrigin(0.5);
    this._status = this.add.text(W/2, H/2 + 22, 'Generating...', {
      fontFamily: 'Courier New', fontSize: '12px', color: '#555555',
    }).setOrigin(0.5);

    // Run each step with a tiny delay so the browser can repaint
    // and we can see which step caused a hang
    const steps = [
      ['Tileset...', () => this._makeTileset()],
      ['Characters...', () => this._makeCharacters()],
      ['Enemies...', () => this._makeEnemies()],
      ['Bosses...', () => this._makeBosses()],
      ['NPCs...', () => this._makeNPCs()],
      ['Items + FX...', () => { this._makeLoot(); this._makeParticle(); }],
    ];

    let i = 0;
    const next = () => {
      if (i >= steps.length) {
        this._status.setText('Starting game...');
        this.time.delayedCall(50, () => this.scene.start('MenuScene'));
        return;
      }
      const [label, fn] = steps[i++];
      this._status.setText(label);
      try { fn(); } catch (err) {
        console.error(`BootScene step "${label}" failed:`, err);
        this._status.setText('ERROR: ' + label + '\n' + (err.message||err).slice(0,120))
          .setColor('#ff4444').setWordWrapWidth(W - 60);
        window.dispatchEvent(new CustomEvent('boot-error', { detail: err }));
        return;   // stop here, do not advance
      }
      this.time.delayedCall(20, next);
    };
    this.time.delayedCall(40, next);
  }

  // ─────────────────────────────────────────────────────────────
  // TILESET  (10 tiles × 32px = 320×32 canvas, each tile 32×32)
  // ─────────────────────────────────────────────────────────────
  _makeTileset() {
    if (this.textures.exists('tileset')) return;
    const T = CONFIG.TILE_SIZE;       // 32
    const cv = this._canvas(T * 10, T);
    const c  = cv.getContext('2d');

    const tiles = [
      { base:'#0d1e30', acc:'#1a4a6e', pat:'wave' },   // 1 deep water
      { base:'#1a4a80', acc:'#3888cc', pat:'wave' },   // 2 water
      { base:'#c8a040', acc:'#d8bc58', pat:'dots' },   // 3 sand
      { base:'#2d6a2a', acc:'#3d8a38', pat:'grass' },  // 4 grass
      { base:'#1a4a1a', acc:'#44aa40', pat:'tree' },   // 5 forest
      { base:'#505050', acc:'#808080', pat:'brick' },  // 6 stone wall
      { base:'#2a3540', acc:'#384550', pat:'grid' },   // 7 dungeon floor
      { base:'#141414', acc:'#2e2e2e', pat:'brick' },  // 8 dungeon wall
      { base:'#8a6a3a', acc:'#a07848', pat:'dots' },   // 9 dirt path
      { base:'#7a7a6a', acc:'#b0b0a0', pat:'cobble' },// 10 town floor
    ];

    tiles.forEach((t, i) => this._drawTile(c, i * T, 0, T, t));
    this.textures.addCanvas('tileset', cv);
  }

  _drawTile(c, ox, oy, T, { base, acc, pat }) {
    // Base fill
    c.fillStyle = base;
    c.fillRect(ox, oy, T, T);

    // Outline
    c.fillStyle = this._darken(base, 0.6);
    c.fillRect(ox, oy, T, 1);
    c.fillRect(ox, oy, 1, T);
    c.fillRect(ox + T - 1, oy, 1, T);
    c.fillRect(ox, oy + T - 1, T, 1);

    c.fillStyle = acc;
    switch (pat) {
      case 'wave':
        for (let y = 4; y < T; y += 8)
          for (let x = 0; x < T; x += 6)
            c.fillRect(ox + x, oy + y, 4, 1);
        break;
      case 'grass':
        for (let i = 0; i < 8; i++)
          c.fillRect(ox + (i * 4 + 1) % (T-2), oy + (i * 7 + 4) % (T-6), 1, 4);
        break;
      case 'tree': {
        // Dark canopy circle
        c.fillStyle = this._darken(base, 0.5);
        c.beginPath(); c.arc(ox + T/2, oy + T/2, T/2-2, 0, Math.PI*2); c.fill();
        c.fillStyle = acc;
        c.beginPath(); c.arc(ox + T/2, oy + T/2-4, T/2-6, 0, Math.PI*2); c.fill();
        break;
      }
      case 'brick': {
        const mortar = this._darken(base, 0.5);
        c.fillStyle = mortar;
        c.fillRect(ox, oy+8, T, 1);
        c.fillRect(ox, oy+16, T, 1);
        c.fillRect(ox, oy+24, T, 1);
        c.fillRect(ox+T/2, oy, 1, 8);
        c.fillRect(ox+T/4, oy+8, 1, 8);
        c.fillRect(ox+3*T/4, oy+16, 1, 8);
        c.fillRect(ox+T/2, oy+24, 1, 8);
        c.fillStyle = acc;
        c.fillRect(ox+2, oy+2, T/2-4, 5);
        c.fillRect(ox+T/2+2, oy+2, T/2-4, 5);
        c.fillRect(ox+T/4+2, oy+10, T/2-4, 5);
        c.fillRect(ox+2, oy+18, T/2-4, 5);
        break;
      }
      case 'grid':
        c.fillStyle = this._darken(base, 0.6);
        c.fillRect(ox, oy+T/2, T, 1);
        c.fillRect(ox+T/2, oy, 1, T);
        break;
      case 'dots':
        for (let i = 0; i < 6; i++)
          c.fillRect(ox + (i*5+2)%(T-4), oy + (i*7+2)%(T-4), 2, 2);
        break;
      case 'cobble': {
        const m = this._darken(base, 0.55);
        c.fillStyle = m;
        for (let row = 0; row < 4; row++) {
          const off = (row % 2) * 8;
          for (let col = 0; col < 3; col++) {
            const cx2 = ox + off + col * T/2;
            const cy2 = oy + row * 8;
            c.fillRect(cx2, cy2, T/2 - 1, 7);
          }
        }
        c.fillStyle = acc;
        for (let row = 0; row < 4; row++) {
          const off = (row % 2) * 8;
          c.fillRect(ox + off + 2, oy + row*8+2, T/2-5, 3);
        }
        break;
      }
    }
  }

  _darken(hex, factor) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.floor(((n >> 16) & 0xff) * factor);
    const g = Math.floor(((n >>  8) & 0xff) * factor);
    const b = Math.floor(( n        & 0xff) * factor);
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  // ─────────────────────────────────────────────────────────────
  // CHARACTERS (all drawn with Graphics.generateTexture)
  // ─────────────────────────────────────────────────────────────
  _makeCharacters() {
    const classes = {
      WARRIOR: { body: 0x2244aa, armor: 0x4466cc, hair: 0x5a3010 },
      MAGE:    { body: 0x553388, armor: 0x7755aa, hair: 0xddaa22 },
      RANGER:  { body: 0x2a5c2a, armor: 0x4a8844, hair: 0x882200 },
    };
    Object.entries(classes).forEach(([cls, pal]) => {
      const key = 'player_' + cls;
      if (this.textures.exists(key)) return;
      const g = this._gfx();
      this._drawCharacter(g, 0, 0, pal);
      g.generateTexture(key, 32, 34);
      g.destroy();
    });
    if (!this.textures.exists('player')) {
      const g = this._gfx();
      this._drawCharacter(g, 0, 0, classes.WARRIOR);
      g.generateTexture('player', 32, 34);
      g.destroy();
    }
  }

  _drawCharacter(g, ox, oy, pal) {
    // Shadow
    g.fillStyle(0x000000, 0.3); g.fillEllipse(ox+16, oy+34, 20, 6);
    // Body / armor
    g.fillStyle(pal.body);    g.fillRect(ox+9, oy+16, 14, 12);
    g.fillStyle(pal.armor);   g.fillRect(ox+10, oy+17, 12, 10);
    // Arms
    g.fillStyle(pal.body);    g.fillRect(ox+5, oy+17, 5, 9); g.fillRect(ox+22, oy+17, 5, 9);
    // Legs
    g.fillStyle(0x334455);    g.fillRect(ox+10, oy+28, 5, 6); g.fillRect(ox+17, oy+28, 5, 6);
    // Boots
    g.fillStyle(0x222222);    g.fillRect(ox+9, oy+32, 6, 2);  g.fillRect(ox+17, oy+32, 6, 2);
    // Head outline
    g.fillStyle(0x111111);    g.fillCircle(ox+16, oy+11, 9);
    // Face
    g.fillStyle(0xf0c090);    g.fillCircle(ox+16, oy+11, 8);
    // Hair
    g.fillStyle(pal.hair);    g.fillRect(ox+8, oy+3, 16, 5); g.fillCircle(ox+16, oy+7, 7);
    // Eyes
    g.fillStyle(0x222222);    g.fillRect(ox+12, oy+9, 2, 2); g.fillRect(ox+18, oy+9, 2, 2);
    // Highlight
    g.fillStyle(0xffffff, 0.5); g.fillRect(ox+12, oy+8, 2, 1);
    // Outline on body
    g.lineStyle(1, 0x111111, 0.8);
    g.strokeRect(ox+9, oy+16, 14, 12);
  }

  // ─────────────────────────────────────────────────────────────
  // ENEMIES
  // ─────────────────────────────────────────────────────────────
  _makeEnemies() {
    const defs = [
      ['enemy_GOBLIN',   24, 26, (g) => {
        g.fillStyle(0x111111); g.fillCircle(12,10,10); g.fillRect(2,17,20,9);
        g.fillStyle(0x44aa33); g.fillCircle(12,10,9);  g.fillRect(3,18,18,7);
        g.fillStyle(0x55cc44); g.fillCircle(12,8,5);
        // Ears
        g.fillStyle(0x44aa33); g.fillTriangle(2,6, 6,12, 2,14); g.fillTriangle(22,6, 18,12, 22,14);
        // Eyes
        g.fillStyle(0xffcc00); g.fillRect(8,8,3,3); g.fillRect(14,8,3,3);
        g.fillStyle(0x111111); g.fillRect(9,9,1,2);  g.fillRect(15,9,1,2);
        // Legs
        g.fillStyle(0x336622); g.fillRect(5,25,5,4); g.fillRect(14,25,5,4);
      }],
      ['enemy_WOLF',     28, 20, (g) => {
        g.fillStyle(0x111111); g.fillRect(0,6,28,14); g.fillRect(4,0,8,8);
        g.fillStyle(0x888888); g.fillRect(1,7,26,12); g.fillRect(5,1,6,7);
        g.fillStyle(0xaaaaaa); g.fillRect(2,8,8,6);
        // Ears
        g.fillStyle(0x111111); g.fillTriangle(5,0,9,0,7,6); g.fillTriangle(15,0,19,0,17,6);
        g.fillStyle(0x666666); g.fillTriangle(6,1,9,1,7,5);
        // Eyes
        g.fillStyle(0xffdd00); g.fillRect(6,4,3,2); g.fillRect(14,4,3,2);
        // Snout
        g.fillStyle(0x777777); g.fillRect(1,9,6,5);
        g.fillStyle(0xcc2222); g.fillRect(3,12,4,2);
        // Legs
        g.fillStyle(0x666666);
        [2,8,16,22].forEach(x => g.fillRect(x, 17, 4, 5));
      }],
      ['enemy_SKELETON', 22, 28, (g) => {
        const W = 0xd8d8c0, K = 0x111111;
        // Skull
        g.fillStyle(K);    g.fillCircle(11,8,9);
        g.fillStyle(W);    g.fillCircle(11,8,8);
        // Eye sockets
        g.fillStyle(K);    g.fillRect(6,6,4,4); g.fillRect(13,6,4,4);
        g.fillStyle(0xcc0000); g.fillRect(7,7,2,2); g.fillRect(14,7,2,2);
        // Jaw
        g.fillStyle(W);    g.fillRect(7,14,8,4);
        g.fillStyle(K);    g.fillRect(8,15,2,3); g.fillRect(11,15,2,3); g.fillRect(14,15,2,3);
        // Spine + ribcage
        g.fillStyle(W);    g.fillRect(10,18,3,8);
        g.fillStyle(W);    g.fillRect(5,20,4,2); g.fillRect(13,20,4,2);
        g.fillRect(4,23,4,2); g.fillRect(14,23,4,2);
        // Legs
        g.fillRect(7,26,3,6); g.fillRect(12,26,3,6);
        g.fillRect(6,30,5,2); g.fillRect(11,30,5,2);
      }],
      ['enemy_TROLL',    34, 34, (g) => {
        // Shadow
        g.fillStyle(0x000000, 0.3); g.fillEllipse(17,34,28,8);
        // Body
        g.fillStyle(0x111111); g.fillRect(5,12,24,20); g.fillCircle(17,12,13);
        g.fillStyle(0x7a5a2a); g.fillRect(6,13,22,18); g.fillCircle(17,12,12);
        g.fillStyle(0x9a7a4a); g.fillCircle(17,10,8);
        // Eyes glow
        g.fillStyle(0xff6600); g.fillRect(10,8,5,4); g.fillRect(19,8,5,4);
        g.fillStyle(0xff9900); g.fillRect(11,9,3,2);  g.fillRect(20,9,3,2);
        // Arms
        g.fillStyle(0x7a5a2a); g.fillRect(0,12,8,16); g.fillRect(26,12,8,16);
        // Claws
        g.fillStyle(0x111111); [0,3,6].forEach(i => g.fillRect(i, 27, 2, 4));
        [26,29,32].forEach(i => g.fillRect(i, 27, 2, 4));
        // Legs
        g.fillStyle(0x5a3a18); g.fillRect(8,30,7,8); g.fillRect(19,30,7,8);
        // Club
        g.fillStyle(0x5a3010); g.fillRect(2,4,4,12);
        g.fillStyle(0x3a1e08); g.fillRect(0,4,6,6);
      }],
    ];

    defs.forEach(([key, w, h, draw]) => {
      if (this.textures.exists(key)) return;
      const g = this._gfx();
      draw(g);
      g.generateTexture(key, w, h);
      g.destroy();
    });
  }

  // ─────────────────────────────────────────────────────────────
  // BOSSES
  // ─────────────────────────────────────────────────────────────
  _makeBosses() {
    if (!this.textures.exists('boss_VOID_KNIGHT')) {
      const g = this._gfx();
      // Cape / body
      g.fillStyle(0x1a0030);   g.fillRect(4,20,40,28);
      g.fillStyle(0x330055);   g.fillRect(10,14,28,22);
      // Pauldrons
      g.fillStyle(0x220044);   g.fillRect(4,14,8,10); g.fillRect(36,14,8,10);
      // Helmet
      g.fillStyle(0x111111);   g.fillRect(12,2,24,14);
      g.fillStyle(0x220044);   g.fillRect(14,4,20,10);
      // Visor glow
      g.fillStyle(0xcc00ff);   g.fillRect(14,8,8,4); g.fillRect(26,8,8,4);
      g.fillStyle(0xff44ff, 0.7); g.fillRect(15,9,6,2); g.fillRect(27,9,6,2);
      // Rune
      g.fillStyle(0x8800cc);   g.fillRect(18,18,4,2); g.fillRect(26,18,4,2);
      g.fillStyle(0xaa00ff);   g.fillRect(22,16,4,6);
      // Boots
      g.fillStyle(0x111111);   g.fillRect(12,44,10,4); g.fillRect(26,44,10,4);
      g.generateTexture('boss_VOID_KNIGHT', 48, 48);
      g.destroy();
    }

    if (!this.textures.exists('boss_STONE_COLOSSUS')) {
      const g = this._gfx();
      g.fillStyle(0x3a2a18);   g.fillRect(4,4,52,56);
      g.fillStyle(0x5a4a30);   g.fillRect(6,6,48,52);
      g.fillStyle(0x7a6040);   g.fillRect(8,8,44,20);
      // Crack lines
      g.lineStyle(1, 0x2a1e10, 1);
      g.lineBetween(12,12,18,28); g.lineBetween(30,10,38,30); g.lineBetween(20,30,28,50);
      // Eyes
      g.fillStyle(0xdd4400);   g.fillRect(14,16,12,8); g.fillRect(34,16,12,8);
      g.fillStyle(0xff8800);   g.fillRect(16,18,8,4);  g.fillRect(36,18,8,4);
      // Mouth
      g.fillStyle(0x111111);   g.fillRect(20,36,20,3);
      // Rock highlight
      g.fillStyle(0x9a8050);   g.fillRect(10,32,8,3); g.fillRect(22,32,8,3); g.fillRect(40,32,8,3);
      g.generateTexture('boss_STONE_COLOSSUS', 60, 64);
      g.destroy();
    }
  }

  // ─────────────────────────────────────────────────────────────
  // NPCs
  // ─────────────────────────────────────────────────────────────
  _makeNPCs() {
    const cfgs = [
      { robe:0xccaa22, trim:0xffe060, hat:0x8a6a10, skin:0xf0c090 },  // Elder Lyra
      { robe:0x884422, trim:0xcc6633, hat:0x552211, skin:0xe0a870 },  // Gareth
      { robe:0x2a6622, trim:0x55aa33, hat:0x1a4414, skin:0xd49060 },  // Mira
      { robe:0x2244aa, trim:0x5577dd, hat:0x112266, skin:0xf5d0a8 },  // Dorin
      { robe:0x226688, trim:0x4499bb, hat:0x113344, skin:0xc88050 },  // Capt. Vel
    ];
    cfgs.forEach((cfg, i) => {
      const key = 'npc_' + i;
      if (this.textures.exists(key)) return;
      const g = this._gfx();
      // Shadow
      g.fillStyle(0x000000, 0.25); g.fillEllipse(16,34,18,5);
      // Robe body
      g.fillStyle(0x111111); g.fillRect(8,18,16,14);
      g.fillStyle(cfg.robe);  g.fillRect(9,19,14,12);
      g.fillStyle(cfg.trim);  g.fillRect(9,26,14,2);
      // Arms
      g.fillStyle(cfg.robe);  g.fillRect(5,19,5,10); g.fillRect(22,19,5,10);
      g.fillStyle(cfg.skin);  g.fillRect(6,27,4,3);  g.fillRect(22,27,4,3);
      // Feet
      g.fillStyle(0x222222);  g.fillRect(10,31,5,3); g.fillRect(17,31,5,3);
      // Head
      g.fillStyle(0x111111);  g.fillCircle(16,12,9);
      g.fillStyle(cfg.skin);  g.fillCircle(16,12,8);
      // Hat
      g.fillStyle(0x111111);  g.fillRect(8,4,16,6); g.fillRect(10,2,12,4);
      g.fillStyle(cfg.hat);   g.fillRect(9,5,14,4);  g.fillRect(11,3,10,3);
      // Eyes
      g.fillStyle(0x222222);  g.fillRect(12,10,2,2); g.fillRect(18,10,2,2);
      // Smile
      g.fillStyle(0xcc7755);  g.fillRect(13,15,6,1);
      g.generateTexture(key, 32, 36);
      g.destroy();
    });
  }

  // ─────────────────────────────────────────────────────────────
  // LOOT + PARTICLE
  // ─────────────────────────────────────────────────────────────
  _makeLoot() {
    if (this.textures.exists('loot')) return;
    const g = this._gfx();
    g.fillStyle(0x111111);  g.fillCircle(10,10,9);
    g.fillStyle(0xc8a000);  g.fillCircle(10,10,8);
    g.fillStyle(0xf0c800);  g.fillCircle(10,10,6);
    g.fillStyle(0xfff088);  g.fillRect(7,6,5,3);
    g.fillStyle(0xa07800);  g.fillRect(9,11,2,4);
    g.generateTexture('loot', 20, 20);
    g.destroy();
  }

  _makeParticle() {
    if (this.textures.exists('particle')) return;
    const g = this._gfx();
    g.fillStyle(0xffffff);  g.fillCircle(4,4,4);
    g.generateTexture('particle', 8, 8);
    g.destroy();
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────
  _canvas(w, h) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    return cv;
  }

  _gfx() {
    return this.make.graphics({ add: false });
  }
}
