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

    // Town clearing — 5× bigger radius
    this._carveTown(data, elevMap, cx, cy, 34);

    // ── Primary roads from Hearthmoor ────────────────────────────────────────
    this._path(data, cx, cy, cx+1040, cy,       T.PATH);  // East road
    this._path(data, cx, cy, cx-928,  cy+400,   T.PATH);  // SW road
    this._path(data, cx, cy, cx+352,  cy+1120,  T.PATH);  // SE road
    this._path(data, cx, cy, cx,      cy-992,   T.PATH);  // North road
    this._path(data, cx, cy, cx+640,  cy-800,   T.PATH);  // NE road
    this._path(data, cx, cy, cx-720,  cy-560,   T.PATH);  // NW road
    this._path(data, cx, cy, cx-800,  cy+880,   T.PATH);  // Far SW road
    this._path(data, cx, cy, cx+920,  cy+680,   T.PATH);  // Far SE road

    // ── Extended roads connecting outer settlements ───────────────────────────
    // NW road extension → Ironhaven
    this._path(data, cx-720, cy-560, cx-750, cy-900, T.PATH);
    // NE road extension → Thornwall Keep
    this._path(data, cx+640, cy-800, cx+1100, cy-1000, T.PATH);
    // SE road → Deepfen Village
    this._path(data, cx+352, cy+1120, cx+800, cy+900, T.PATH);
    // East road extension → Crossroads Station
    this._path(data, cx+1040, cy, cx+1400, cy-200, T.PATH);
    // West spur → Ironfang Stronghold
    this._path(data, cx-928, cy+400, cx-1100, cy+200, T.PATH);
    // North road extension → Frostwatch
    this._path(data, cx, cy-992, cx, cy-1600, T.PATH);

    // ── Main dungeon entrance (Ashveil direction) ─────────────────────────────
    this._carveDungeon(data, elevMap, cx+640,   cy-160,   10); // Ashveil Depths

    // ── Settlements ───────────────────────────────────────────────────────────
    this._carveTown(data, elevMap, cx-720,   cy-560,  10); // Elandor outpost (NW)
    this._carveTown(data, elevMap, cx+720,   cy+720,  10); // Marsh camp (SE)
    this._carveTown(data, elevMap, cx+880,   cy-640,   8); // Ashveil forge (NE)
    this._carveTown(data, elevMap, cx-750,   cy-900,  12); // Ironhaven — mining settlement (NW)
    this._carveTown(data, elevMap, cx+800,   cy+900,  10); // Deepfen Village — fishing (SE)
    this._carveTown(data, elevMap, cx+1100,  cy-1000,  9); // Thornwall Keep — ruined fortress (NE)
    this._carveTown(data, elevMap, cx+1400,  cy-200,  10); // Crossroads Station — trade hub (E)
    this._carveTown(data, elevMap, cx-1100,  cy+200,   9); // Ironfang Stronghold — mercenaries (W)
    this._carveTown(data, elevMap, cx-800,   cy+600,   9); // Verdant Grove — druid sanctuary (SW)
    this._carveTown(data, elevMap, cx-820,   cy+1400,  8); // Fisherman's Cove — coastal (S)
    this._carveTown(data, elevMap, cx+900,   cy+700,   8); // Marshwarden Outpost (SE)
    this._carveTown(data, elevMap, cx,       cy-1600,  7); // Frostwatch — far north outpost
    this._carveTown(data, elevMap, cx-400,   cy-1200,  7); // Coldhollow — northern village

    // ── Dungeon entrances ─────────────────────────────────────────────────────
    this._carveDungeon(data, elevMap, cx-800,   cy+880,   8); // Shattered crypt (SW)
    this._carveDungeon(data, elevMap, cx+800,   cy+560,   8); // Marsh tomb (SE)
    this._carveDungeon(data, elevMap, cx-1200,  cy-1000,  9); // Frozen Tomb — deep NW
    this._carveDungeon(data, elevMap, cx+1500,  cy-1300,  9); // Void Citadel entrance — far NE
    this._carveDungeon(data, elevMap, cx+1100,  cy-900,   8); // Dragon's Maw — near Thornwall
    this._carveDungeon(data, elevMap, cx+300,   cy+500,   8); // Old City Sewers — SE of town
    this._carveDungeon(data, elevMap, cx+600,   cy+700,   9); // The Necropolis — undead king
    this._carveDungeon(data, elevMap, cx-500,   cy-700,   8); // Corrupted Temple — NW wilderness
    this._carveDungeon(data, elevMap, cx+1300,  cy+600,   8); // Crystal Caverns — east
    this._carveDungeon(data, elevMap, cx-1400,  cy+1000,  8); // Ancient Vault — far SW

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
    // Keep enemies well outside the expanded town (safe zone radius = 40)
    while (spawns.length < count && tries < count * 30) {
      const x = Math.floor(Math.random() * (d[0].length - 8)) + 4;
      const y = Math.floor(Math.random() * (d.length    - 8)) + 4;
      const dist = Math.sqrt((x-cx)**2 + (y-cy)**2);
      if (!blocked.has(d[y][x]) && dist > 50) spawns.push({ x, y });
      tries++;
    }
    return spawns;
  }

  getNPCSpawns(cx, cy) {
    // Spread across the larger town area
    return [
      { x: cx-10, y: cy-10 },   // Elder Lyra (near town hall)
      { x: cx+10, y: cy-8  },   // Gareth     (forge district)
      { x: cx-12, y: cy+8  },   // Mira        (herb garden)
      { x: cx+8,  y: cy+10 },   // Dorin       (market)
      { x: cx,    y: cy-16 },   // Capt. Vel   (north gate)
    ];
  }

  getSaltmereSpawns(W, H) {
    const sx = Math.floor(W * 0.28);  // ~1147 on 4096×4096
    const sz = Math.floor(H * 0.78);  // ~3195 on 4096×4096
    return [
      { x: sx-3, y: sz-3 },   // NPC idx 5 — Sister Vashe
      { x: sx+3, y: sz-2 },   // NPC idx 6 — Master Theron
      { x: sx,   y: sz+4 },   // NPC idx 7 — Aldric
      { x: sx+5, y: sz+2 },   // NPC idx 8 — High Priestess Solara
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
