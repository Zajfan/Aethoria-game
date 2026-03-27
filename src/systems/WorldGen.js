import { CONFIG } from '../config.js';

export class WorldGen {
  /**
   * Generate the world.
   * @returns {{ data: number[][], elevMap: Float32Array[] }}
   *   data    — 2D array of tile IDs
   *   elevMap — parallel 2D array, elevMap[y][x] = 0..1 raw elevation
   */
  generate(W, H) {
    const T    = CONFIG.TILES;
    const seed = CONFIG.WORLD_SEED ?? 42;
    const data    = [];
    const elevMap = [];

    for (let y = 0; y < H; y++) {
      const row     = [];
      const elevRow = new Float32Array(W);
      for (let x = 0; x < W; x++) {
        const nx = x / W;
        const ny = y / H;

        // Multi-octave elevation with continent-shaping falloff
        // so edges tend toward ocean
        const raw  = this._fractal(nx * 3.8, ny * 3.8, seed, 6);
        const dist = Math.max(Math.abs(nx - 0.5), Math.abs(ny - 0.5)) * 2;
        const elev = Math.max(0, Math.min(1, raw - dist * 0.25));

        const moist = this._fractal(nx * 2.8, ny * 2.8, seed + 300, 3);
        elevRow[x] = elev;

        let tile;
        if      (elev < 0.23) tile = T.DEEP_WATER;
        else if (elev < 0.33) tile = T.WATER;
        else if (elev < 0.38) tile = T.SAND;
        else if (elev < 0.63) tile = moist > 0.58 ? T.FOREST : T.GRASS;
        else                  tile = T.STONE;

        row.push(tile);
      }
      data.push(row);
      elevMap.push(elevRow);
    }

    const cx = Math.floor(W / 2);
    const cy = Math.floor(H / 2);

    // Town clearing — also flatten elevation so it sits level
    this._carveTown(data, elevMap, cx, cy, 13);

    // Paths
    this._path(data, cx, cy, cx+28, cy,    T.PATH);
    this._path(data, cx, cy, cx-24, cy+12, T.PATH);
    this._path(data, cx, cy, cx+10, cy+30, T.PATH);
    this._path(data, cx, cy, cx,    cy-26, T.PATH);

    // Dungeon entrance
    this._carveDungeon(data, elevMap, cx+50, cy-10, 8);

    return { data, elevMap };
  }

  _carveTown(data, elevMap, cx, cy, r) {
    const T = CONFIG.TILES;
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if (y < 0 || y >= data.length || x < 0 || x >= data[0].length) continue;
        const d = Math.sqrt((x-cx)**2 + (y-cy)**2);
        if (d <= r) {
          data[y][x] = d > r-2 ? T.PATH : T.TOWN_FLOOR;
          // Flatten town to gentle slope toward center
          elevMap[y][x] = 0.42 + (d / r) * 0.04;
        }
      }
    }
  }

  _carveDungeon(data, elevMap, cx, cy, r) {
    const T = CONFIG.TILES;
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if (y < 0 || y >= data.length || x < 0 || x >= data[0].length) continue;
        const d = Math.sqrt((x-cx)**2 + (y-cy)**2);
        if (d <= r) {
          data[y][x]    = d > r-1 ? T.DUNGEON_WALL : T.DUNGEON_FLOOR;
          elevMap[y][x] = 0.40;
        }
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
        if (this._noise(x, y + 0.5) > 0.55 && y+1 < data.length) data[y+1][x] = tileType;
      }
    }
  }

  // Accept both old (plain array) and new ({ data, elevMap }) return formats
  getEnemySpawns(mapData, count) {
    const d = Array.isArray(mapData) ? mapData : (mapData?.data ?? mapData);
    const blocked = new Set(CONFIG.BLOCKED_TILES);
    const cx = Math.floor(d[0].length / 2);
    const cy = Math.floor(d.length    / 2);
    const spawns = [];
    let tries = 0;
    while (spawns.length < count && tries < count * 15) {
      const x = Math.floor(Math.random() * (d[0].length - 8)) + 4;
      const y = Math.floor(Math.random() * (d.length    - 8)) + 4;
      const dist = Math.sqrt((x-cx)**2 + (y-cy)**2);
      if (!blocked.has(d[y][x]) && dist > 18) spawns.push({ x, y });
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

  getSaltmereSpawns(W, H) {
    const sx = Math.floor(W * 0.28);
    const sz = Math.floor(H * 0.78);
    return [
      { x: sx-3, y: sz-3 },   // Captain Redd
      { x: sx+3, y: sz-2 },   // Sister Vashe
      { x: sx,   y: sz+4 },   // Old Brennan
    ];
  }

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
