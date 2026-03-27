/**
 * World3D.js  (v0.5 — Heightmap terrain + proper trees)
 *
 * Changes from v0.4:
 *  • build() now accepts { data, elevMap } so elevation drives actual Y positions
 *  • Tiles are tall pillar boxes (3.5 units deep) so terrain height differences
 *    never show gaps between adjacent tiles
 *  • Per-tile topY is computed from the real elevation value, not just tile type:
 *    - STONE  hills: 0.2 → 2.6 world units (dramatic ridgelines)
 *    - GRASS  rolls: 0.0 → 0.7 world units (gentle meadow undulation)
 *    - FOREST:       0.1 → 0.9 world units (elevated woodland)
 *    - SAND:         0.0 → 0.12 (mostly flat, gentle dunes)
 *    - WATER:        fixed -0.10 (always sea-level)
 *    - DEEP_WATER:   fixed -0.45
 *  • getHeightAt(tx, tz) public method — used by Player3D + Camera
 *  • Trees rebuilt as proper 3-layer conifers:
 *    - Trunk: 2.8 units tall, wider base
 *    - Lower canopy: wide spreading cone (radius 1.4, height 2.2)
 *    - Mid canopy:   mid cone (radius 0.95, height 1.8), shifted up 1.4
 *    - Top canopy:   narrow tip (radius 0.5, height 1.4), shifted up 2.8
 *    - Total height: ~7 units — clearly taller than the player
 *    - Scale variation: 0.65 → 1.35 for forest variety
 *    - Color variation per canopy layer for depth
 *  • Rocky outcrops on STONE tiles (random boulders)
 */

import { THREE } from '../engine/Renderer.js';
import { CONFIG } from '../config.js';

const T          = CONFIG.TILES;
const CHUNK_SIZE = 16;
const VIEW_DIST  = 4;

// ── Tile base definitions  ─────────────────────────────────────────────────────
// These are the baseline properties; actual topY per instance is computed
// from the elevation map.

const TILE_DEF = {
  [T.DEEP_WATER]:    { color: 0x0d1f30, isWater: true,  waterAlpha: 0.90, fixedY: -0.45 },
  [T.WATER]:         { color: 0x1a4e70, isWater: true,  waterAlpha: 0.75, fixedY: -0.10 },
  [T.SAND]:          { color: 0xc8a040, colorVar: true,  elevScale: 0.25, elevBase: 0.00 },
  [T.GRASS]:         { color: 0x2d7a2a, colorVar: true,  elevScale: 1.40, elevBase: 0.00 },
  [T.FOREST]:        { color: 0x1a5a1a, colorVar: true,  elevScale: 1.60, elevBase: 0.10, hasTree: true },
  [T.STONE]:         { color: 0x505050, colorVar: true,  elevScale: 5.50, elevBase: 0.20, hasBoulder: true },
  [T.DUNGEON_FLOOR]: { color: 0x303540, fixedY: 0.00 },
  [T.DUNGEON_WALL]:  { color: 0x181818, fixedY: 0.00, wallBox: true },
  [T.PATH]:          { color: 0x8a7050, fixedY: null,   elevScale: 0.20, elevBase: 0.00 },
  [T.TOWN_FLOOR]:    { color: 0x8a8880, fixedY: null,   elevScale: 0.10, elevBase: 0.00 },
};

// Elevation range thresholds matching WorldGen biome cutoffs
const ELEV_GRASS_MIN  = 0.38;
const ELEV_GRASS_MAX  = 0.63;
const ELEV_STONE_MIN  = 0.63;
const ELEV_STONE_MAX  = 1.00;
const ELEV_SAND_MIN   = 0.33;
const ELEV_SAND_MAX   = 0.38;

/**
 * Compute the actual topY world-space height for a tile given its raw elevation.
 * Returns the Y of the tile's top surface.
 */
function computeTopY(tileId, elev) {
  const def = TILE_DEF[tileId];
  if (!def) return 0;

  // Fixed-height tiles (water, dungeon)
  if (def.fixedY !== undefined && def.fixedY !== null) return def.fixedY;
  if (def.wallBox) return 0;

  // Elevation-driven tiles
  const base  = def.elevBase  ?? 0;
  const scale = def.elevScale ?? 1;

  switch (tileId) {
    case T.STONE: {
      // Map stone elevation (0.63→1.0) to height (0.2→2.6)
      const t = Math.max(0, Math.min(1, (elev - ELEV_STONE_MIN) / (ELEV_STONE_MAX - ELEV_STONE_MIN)));
      return base + t * scale;
    }
    case T.GRASS:
    case T.FOREST: {
      const t = Math.max(0, Math.min(1, (elev - ELEV_GRASS_MIN) / (ELEV_GRASS_MAX - ELEV_GRASS_MIN)));
      return base + t * scale * (tileId === T.FOREST ? 0.70 : 0.50);
    }
    case T.SAND: {
      const t = Math.max(0, Math.min(1, (elev - ELEV_SAND_MIN) / (ELEV_SAND_MAX - ELEV_SAND_MIN)));
      return base + t * scale;
    }
    case T.PATH:
    case T.TOWN_FLOOR: {
      // Paths follow terrain gently
      const t = Math.max(0, Math.min(1, (elev - ELEV_GRASS_MIN) / (ELEV_GRASS_MAX - ELEV_GRASS_MIN)));
      return base + t * scale;
    }
    default:
      return base;
  }
}

const PILLAR_DEPTH = 3.5; // height of terrain pillars — deep enough to fill all gaps

const _tmpColor = new THREE.Color();
function jitteredColor(baseHex, range = 0.10) {
  _tmpColor.setHex(baseHex);
  const v = (Math.random() - 0.5) * range;
  return new THREE.Color(
    Math.max(0, Math.min(1, _tmpColor.r + v)),
    Math.max(0, Math.min(1, _tmpColor.g + v * 0.6)),
    Math.max(0, Math.min(1, _tmpColor.b + v * 0.4)),
  );
}

// ── World3D ───────────────────────────────────────────────────────────────────

export class World3D {
  constructor(scene3d) {
    this._scene   = scene3d;
    this._mapData = null;
    this._elevMap = null;
    this._mapW    = 0;
    this._mapH    = 0;

    this._geos = this._createGeometries();
    this._mats = this._createMaterials();

    this._chunks      = new Map();
    this._visibleKeys = new Set();

    this._sunLight     = null;
    this._ambientLight = null;
    this._hemiLight    = null;

    this._setupLighting();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * @param {{ data: number[][], elevMap: Float32Array[] } | number[][]} mapInput
   *   Accepts either the new { data, elevMap } format or the legacy plain array.
   */
  build(mapInput) {
    if (Array.isArray(mapInput)) {
      // Legacy support
      this._mapData = mapInput;
      this._elevMap = null;
    } else {
      this._mapData = mapInput.data ?? mapInput;
      this._elevMap = mapInput.elevMap ?? null;
    }
    this._mapH = this._mapData.length;
    this._mapW = this._mapData[0]?.length ?? 0;
  }

  updateVisibleChunks(playerTileX, playerTileZ) {
    const cx    = Math.floor(playerTileX / CHUNK_SIZE);
    const cz    = Math.floor(playerTileZ / CHUNK_SIZE);
    const maxCX = Math.ceil(this._mapW / CHUNK_SIZE);
    const maxCZ = Math.ceil(this._mapH / CHUNK_SIZE);

    const want = new Set();
    for (let dz = -VIEW_DIST; dz <= VIEW_DIST; dz++) {
      for (let dx = -VIEW_DIST; dx <= VIEW_DIST; dx++) {
        const ccx = cx + dx;
        const ccz = cz + dz;
        if (ccx < 0 || ccz < 0 || ccx >= maxCX || ccz >= maxCZ) continue;
        want.add(`${ccx}_${ccz}`);
      }
    }

    // Build newly visible chunks
    for (const key of want) {
      if (!this._chunks.has(key)) {
        const [ccx, ccz] = key.split('_').map(Number);
        const group = this._buildChunk(ccx, ccz);
        this._scene.add(group);
        this._chunks.set(key, group);
      }
    }

    // Show / hide
    for (const [key, group] of this._chunks) {
      group.visible = want.has(key);
    }
    this._visibleKeys = want;
  }

  /**
   * Returns the world-space Y height of the terrain surface at tile (tx, tz).
   * Used by Player3D and Camera to track terrain.
   */
  getHeightAt(tx, tz) {
    const x = Math.floor(tx);
    const z = Math.floor(tz);
    if (x < 0 || z < 0 || x >= this._mapW || z >= this._mapH) return 0;
    const tileId = this._mapData[z]?.[x] ?? 0;
    const elev   = this._elevMap?.[z]?.[x] ?? 0.42;
    return computeTopY(tileId, elev);
  }

  /** Alias for getHeightAt — used by GameScene, Player3D, Enemy3D. */
  getGroundY(tx, tz) { return this.getHeightAt(tx, tz); }

  /** World-space coords version. */
  getGroundYWorld(wx, wz) { return this.getHeightAt(Math.floor(wx), Math.floor(wz)); }

  worldToTile(wx, wz) { return { x: Math.floor(wx), z: Math.floor(wz) }; }
  tileToWorld(tx, tz) { return { x: tx + 0.5, z: tz + 0.5 }; }

  isBlocked(tx, tz) {
    if (tx < 0 || tz < 0 || tx >= this._mapW || tz >= this._mapH) return true;
    return CONFIG.BLOCKED_TILES.includes(this._mapData[tz]?.[tx]);
  }

  setTimeOfDay(t) {
    // t: 0=midnight, 0.5=noon, 1=midnight
    const phase  = t * Math.PI * 2;
    const sunY   = Math.sin(phase - Math.PI / 2);
    const day    = Math.max(0, sunY);                    // 0 night, 1 noon
    const night  = 1 - day;

    // Sun arc
    const angle  = t * Math.PI * 2 - Math.PI / 2;
    if (this._sunLight) {
      this._sunLight.position.set(
        Math.cos(angle) * 120,
        Math.max(5, Math.sin(angle) * 120),
        60,
      );
      // Warm daytime, cool dawn/dusk
      const dusk = 1 - Math.abs(day - 0.3) / 0.3;
      this._sunLight.color.setRGB(
        0.95 + dusk * 0.05,
        0.85 + day  * 0.15 - dusk * 0.25,
        0.65 + day  * 0.35,
      );
      this._sunLight.intensity = 0.15 + day * 1.10;
    }

    if (this._ambientLight) {
      this._ambientLight.intensity = 0.08 + day * 0.35;
      this._ambientLight.color.setRGB(
        0.18 + day * 0.55,
        0.20 + day * 0.62,
        0.28 + day * 0.45,
      );
    }

    if (this._hemiLight) {
      this._hemiLight.intensity = 0.10 + day * 0.55;
    }
  }

  dispose() {
    for (const group of this._chunks.values()) {
      this._scene.remove(group);
      group.traverse(obj => {
        if (obj.isMesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material?.dispose();
        }
      });
    }
    this._chunks.clear();
    for (const geo of Object.values(this._geos)) geo.dispose();
    for (const mat of Object.values(this._mats)) mat.dispose();
  }

  // ── Lighting ──────────────────────────────────────────────────────────────

  _setupLighting() {
    this._ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    this._scene.add(this._ambientLight);

    this._hemiLight = new THREE.HemisphereLight(0x89c4f4, 0x403020, 0.6);
    this._scene.add(this._hemiLight);

    this._sunLight = new THREE.DirectionalLight(0xfff8e0, 1.0);
    this._sunLight.position.set(50, 100, 50);
    this._sunLight.castShadow = true;

    const shadow = this._sunLight.shadow;
    shadow.mapSize.width  = 2048;
    shadow.mapSize.height = 2048;
    shadow.bias           = -0.001;
    const sc = shadow.camera;
    sc.near = 1; sc.far = 600;
    sc.left = -140; sc.right = 140;
    sc.top  =  140; sc.bottom = -140;

    this._scene.add(this._sunLight);
  }

  // ── Geometries & materials ────────────────────────────────────────────────

  _createGeometries() {
    return {
      pillar:      new THREE.BoxGeometry(1, PILLAR_DEPTH, 1),
      wall:        new THREE.BoxGeometry(1, 1.8, 1),
      waterPlane:  new THREE.PlaneGeometry(1, 1),
      // Tree parts
      trunk:       new THREE.CylinderGeometry(0.14, 0.22, 2.8, 7),
      canopyLow:   new THREE.ConeGeometry(1.40, 2.20, 8),
      canopyMid:   new THREE.ConeGeometry(0.95, 1.80, 8),
      canopyTop:   new THREE.ConeGeometry(0.50, 1.40, 8),
      // Boulder
      boulder:     new THREE.DodecahedronGeometry(0.38, 0),
    };
  }

  _createMaterials() {
    const mats = {};
    for (const [id, def] of Object.entries(TILE_DEF)) {
      mats[`tile_${id}`] = new THREE.MeshLambertMaterial({ color: def.color });
      if (def.isWater) {
        mats[`water_${id}`] = new THREE.MeshLambertMaterial({
          color: def.color, transparent: true,
          opacity: def.waterAlpha, depthWrite: false,
        });
      }
    }

    // Tree canopy layers — three slightly different greens for depth
    mats.trunk     = new THREE.MeshLambertMaterial({ color: 0x4a2810 });
    mats.canopyLow = new THREE.MeshLambertMaterial({ color: 0x1a4e18 }); // darkest
    mats.canopyMid = new THREE.MeshLambertMaterial({ color: 0x226620 });
    mats.canopyTop = new THREE.MeshLambertMaterial({ color: 0x2d7a2a }); // lightest tip

    // Boulder
    mats.boulder = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });

    return mats;
  }

  // ── Chunk building ────────────────────────────────────────────────────────

  _buildChunk(cx, cz) {
    const group  = new THREE.Group();
    group.name   = `chunk_${cx}_${cz}`;
    const startX = cx * CHUNK_SIZE;
    const startZ = cz * CHUNK_SIZE;

    const byType     = new Map();
    const forestList = [];
    const boulderList = [];

    for (let dz = 0; dz < CHUNK_SIZE; dz++) {
      for (let dx = 0; dx < CHUNK_SIZE; dx++) {
        const tx = startX + dx;
        const tz = startZ + dz;
        if (tx >= this._mapW || tz >= this._mapH) continue;

        const tileId = this._mapData[tz][tx];
        const def    = TILE_DEF[tileId];
        if (!def) continue;

        if (!byType.has(tileId)) byType.set(tileId, []);
        byType.get(tileId).push({ tx, tz });

        if (def.hasTree) forestList.push({ tx, tz });

        // ~20% of stone tiles get a boulder
        if (def.hasBoulder && Math.random() < 0.20) {
          boulderList.push({ tx, tz });
        }
      }
    }

    for (const [tileId, tiles] of byType) {
      this._addTileInstances(group, tileId, tiles);
    }

    if (forestList.length > 0) this._addTreeInstances(group, forestList);
    if (boulderList.length > 0) this._addBoulderInstances(group, boulderList);

    return group;
  }

  _addTileInstances(group, tileId, tiles) {
    const def = TILE_DEF[tileId];

    if (def.wallBox) {
      // Dungeon walls — fixed height pillars
      const mesh = new THREE.InstancedMesh(this._geos.wall, this._mats[`tile_${tileId}`], tiles.length);
      mesh.castShadow = mesh.receiveShadow = true;
      const d = new THREE.Object3D();
      tiles.forEach((t, i) => {
        d.position.set(t.tx + 0.5, 0.9, t.tz + 0.5);
        d.scale.setScalar(1);
        d.rotation.set(0, 0, 0);
        d.updateMatrix();
        mesh.setMatrixAt(i, d.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      group.add(mesh);
      return;
    }

    const geo   = this._geos.pillar;
    const mat   = this._mats[`tile_${tileId}`];
    const mesh  = new THREE.InstancedMesh(geo, mat, tiles.length);
    mesh.castShadow    = false;
    mesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < tiles.length; i++) {
      const { tx, tz } = tiles[i];
      const elev = this._elevMap?.[tz]?.[tx] ?? 0.42;
      const topY = computeTopY(tileId, elev);
      // Centre of pillar is topY - half-depth so the top surface is at topY
      const centerY = topY - PILLAR_DEPTH / 2;

      dummy.position.set(tx + 0.5, centerY, tz + 0.5);
      dummy.scale.setScalar(1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      if (def.colorVar) {
        mesh.setColorAt(i, jitteredColor(def.color, 0.10));
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    group.add(mesh);

    // Water overlay plane
    if (def.isWater) {
      const wm  = new THREE.InstancedMesh(this._geos.waterPlane, this._mats[`water_${tileId}`], tiles.length);
      wm.castShadow = wm.receiveShadow = false;
      const wd = new THREE.Object3D();
      for (let i = 0; i < tiles.length; i++) {
        const { tx, tz } = tiles[i];
        wd.position.set(tx + 0.5, (def.fixedY ?? -0.10) + 0.002, tz + 0.5);
        wd.rotation.x = -Math.PI / 2;
        wd.scale.setScalar(1);
        wd.updateMatrix();
        wm.setMatrixAt(i, wd.matrix);
      }
      wm.instanceMatrix.needsUpdate = true;
      group.add(wm);
    }
  }

  /**
   * Build instanced trees. Each tree has 4 meshes: trunk + 3 canopy cones.
   * Trees sit ON TOP of the terrain height at their tile.
   */
  _addTreeInstances(group, forestList) {
    const count = forestList.length;

    const trunkMesh  = new THREE.InstancedMesh(this._geos.trunk,     this._mats.trunk,     count);
    const lowMesh    = new THREE.InstancedMesh(this._geos.canopyLow,  this._mats.canopyLow, count);
    const midMesh    = new THREE.InstancedMesh(this._geos.canopyMid,  this._mats.canopyMid, count);
    const topMesh    = new THREE.InstancedMesh(this._geos.canopyTop,  this._mats.canopyTop, count);

    for (const m of [trunkMesh, lowMesh, midMesh, topMesh]) {
      m.castShadow = m.receiveShadow = true;
    }

    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      const { tx, tz } = forestList[i];
      const elev  = this._elevMap?.[tz]?.[tx] ?? 0.42;
      const groundY = computeTopY(T.FOREST, elev);

      // Scale variation — trees range from small saplings to large conifers
      const s  = 0.65 + Math.random() * 0.70;   // 0.65 → 1.35
      // Slight random offset within the tile so forest doesn't look grid-aligned
      const ox = (Math.random() - 0.5) * 0.45;
      const oz = (Math.random() - 0.5) * 0.45;
      const rot = Math.random() * Math.PI * 2;

      // Trunk  — bottom at groundY, extends 2.8*s upward, cylinder centred at midpoint
      dummy.position.set(tx + 0.5 + ox, groundY + 1.4 * s, tz + 0.5 + oz);
      dummy.scale.setScalar(s);
      dummy.rotation.set(0, rot, 0);
      dummy.updateMatrix();
      trunkMesh.setMatrixAt(i, dummy.matrix);

      // Low canopy — base sits at top of trunk bottom third (~groundY + 1.2*s)
      dummy.position.set(tx + 0.5 + ox, groundY + 2.0 * s, tz + 0.5 + oz);
      dummy.updateMatrix();
      lowMesh.setMatrixAt(i, dummy.matrix);

      // Mid canopy — overlaps low canopy, shifted up 1.4*s
      dummy.position.set(tx + 0.5 + ox, groundY + 3.4 * s, tz + 0.5 + oz);
      dummy.updateMatrix();
      midMesh.setMatrixAt(i, dummy.matrix);

      // Top canopy — pointed tip
      dummy.position.set(tx + 0.5 + ox, groundY + 4.6 * s, tz + 0.5 + oz);
      dummy.updateMatrix();
      topMesh.setMatrixAt(i, dummy.matrix);
    }

    for (const m of [trunkMesh, lowMesh, midMesh, topMesh]) {
      m.instanceMatrix.needsUpdate = true;
      group.add(m);
    }
  }

  /** Scatter boulder props on stone tiles. */
  _addBoulderInstances(group, boulderList) {
    const mesh = new THREE.InstancedMesh(this._geos.boulder, this._mats.boulder, boulderList.length);
    mesh.castShadow = mesh.receiveShadow = true;
    const d = new THREE.Object3D();
    for (let i = 0; i < boulderList.length; i++) {
      const { tx, tz } = boulderList[i];
      const elev    = this._elevMap?.[tz]?.[tx] ?? 0.42;
      const groundY = computeTopY(T.STONE, elev);
      const s  = 0.55 + Math.random() * 0.85;
      const ox = (Math.random() - 0.5) * 0.5;
      const oz = (Math.random() - 0.5) * 0.5;
      d.position.set(tx + 0.5 + ox, groundY + 0.38 * s, tz + 0.5 + oz);
      d.scale.setScalar(s);
      d.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      );
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  }
}

// v0.6 cache-bust: ensure all public API methods are present
// worldToTile, tileToWorld, getGroundY, getGroundYWorld, getHeightAt, isBlocked all defined above
