import { CONFIG } from '../config.js';

export class WorldGen {
  generate(W, H) {
    const T   = CONFIG.TILES;
    const seed = Math.random() * 999;
    const data = [];

    for (let y = 0; y < H; y++) {
      const row = [];
      for (let x = 0; x < W; x++) {
        const nx = x / W;
        const ny = y / H;
        const elev = this._fractal(nx * 3.8, ny * 3.8, seed, 5);
        const moist = this._fractal(nx * 2.8, ny * 2.8, seed + 300, 3);

        let tile;
        if      (elev < 0.23) tile = T.DEEP_WATER;
        else if (elev < 0.33) tile = T.WATER;
        else if (elev < 0.38) tile = T.SAND;
        else if (elev < 0.63) tile = moist > 0.58 ? T.FOREST : T.GRASS;
        else                  tile = T.STONE;

        row.push(tile);
      }
      data.push(row);
    }

    const cx = Math.floor(W / 2);
    const cy = Math.floor(H / 2);

    // Town clearing
    this._carveTown(data, cx, cy, 13);

    // Paths
    this._path(data, cx, cy, cx+28, cy,    T.PATH);
    this._path(data, cx, cy, cx-24, cy+12, T.PATH);
    this._path(data, cx, cy, cx+10, cy+30, T.PATH);
    this._path(data, cx, cy, cx,    cy-26, T.PATH);

    // Small dungeon area to the east
    this._carveDungeon(data, cx+50, cy-10, 8);

    return data;
  }

  _carveTown(data, cx, cy, r) {
    const T = CONFIG.TILES;
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if (y < 0 || y >= data.length || x < 0 || x >= data[0].length) continue;
        const d = Math.sqrt((x-cx)**2 + (y-cy)**2);
        if (d <= r) data[y][x] = d > r-2 ? T.PATH : T.TOWN_FLOOR;
      }
    }
  }

  _carveDungeon(data, cx, cy, r) {
    const T = CONFIG.TILES;
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if (y < 0 || y >= data.length || x < 0 || x >= data[0].length) continue;
        const d = Math.sqrt((x-cx)**2 + (y-cy)**2);
        if (d <= r) data[y][x] = d > r-1 ? T.DUNGEON_WALL : T.DUNGEON_FLOOR;
      }
    }
  }

  _path(data, x1, y1, x2, y2, tileType) {
    const steps = Math.max(Math.abs(x2-x1), Math.abs(y2-y1));
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      const x = Math.round(x1 + (x2-x1)*t);
      const y = Math.round(y1 + (y2-y1)*t);
      if (y >= 0 && y < data.length && x >= 0 && x < data[0].length) {
        data[y][x] = tileType;
        if (Math.random() > 0.55 && y+1 < data.length) data[y+1][x] = tileType;
      }
    }
  }

  getEnemySpawns(data, count) {
    const blocked = new Set(CONFIG.BLOCKED_TILES);
    const cx = Math.floor(data[0].length / 2);
    const cy = Math.floor(data.length   / 2);
    const spawns = [];
    let tries = 0;

    while (spawns.length < count && tries < count * 15) {
      const x = Phaser.Math.Between(4, data[0].length - 4);
      const y = Phaser.Math.Between(4, data.length    - 4);
      const d = Math.sqrt((x-cx)**2 + (y-cy)**2);
      if (!blocked.has(data[y][x]) && d > 18) spawns.push({ x, y });
      tries++;
    }
    return spawns;
  }

  getNPCSpawns(cx, cy) {
    return [
      { x: cx-4, y: cy-4 },
      { x: cx+4, y: cy-4 },
      { x: cx-4, y: cy+4 },
      { x: cx+4, y: cy+4 },
      { x: cx,   y: cy-7 },
    ];
  }

  /* ── Noise ───────────────────────────────────────────────── */
  _noise(x, y) {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }

  _smooth(x, y, seed) {
    const ix = Math.floor(x); const iy = Math.floor(y);
    const fx = x - ix;        const fy = y - iy;
    const ux = fx*fx*(3-2*fx); const uy = fy*fy*(3-2*fy);
    const a = this._noise(ix+seed,   iy+seed);
    const b = this._noise(ix+1+seed, iy+seed);
    const c = this._noise(ix+seed,   iy+1+seed);
    const d = this._noise(ix+1+seed, iy+1+seed);
    return a + (b-a)*ux + (c-a)*uy + (a-b-c+d)*ux*uy;
  }

  _fractal(x, y, seed, octaves = 4) {
    let v = 0, a = 1, f = 1, m = 0;
    for (let i = 0; i < octaves; i++) {
      v += this._smooth(x*f, y*f, seed) * a;
      m += a; a *= 0.5; f *= 2;
    }
    return v / m;
  }
}
