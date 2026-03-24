/**
 * World3D.js
 * Chunk-based 3D world renderer for the Aethoria RPG engine.
 *
 * Converts a 2-D tile-ID map (produced by WorldGen) into a Three.js scene
 * using InstancedMesh for tile geometry and a simple chunk visibility system.
 *
 * Coordinate convention:
 *   - One tile  = one Three.js unit in X and Z.
 *   - Y is up.
 *   - Tile (tx, tz) occupies world [tx, tx+1) × [tz, tz+1).
 *   - Centre of tile (tx, tz) is at world (tx + 0.5, _, tz + 0.5).
 */

import { THREE } from '../engine/Renderer.js';
import { CONFIG } from '../config.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const T           = CONFIG.TILES;
const CHUNK_SIZE  = 16;           // tiles per chunk side
const VIEW_DIST   = 4;            // visible radius in chunks

// ── Tile definition table ──────────────────────────────────────────────────────
//  topY      – Y of the tile's top surface
//  boxH      – height of the box geometry
//  color     – base hex colour
//  wallBox   – box grows upward from ground (DUNGEON_WALL)
//  isWater   – emit a transparent water-plane overlay
//  waterY    – Y of the water plane (may sit above topY for depth illusion)
//  waterAlpha– opacity of the water plane
//  colorVar  – apply per-tile colour jitter via instanceColor
//  hasTree   – build an instanced tree on this tile

const TILE_DEF = {
  [T.DEEP_WATER]:    { topY: -0.35, boxH: 0.2,  color: 0x0d2030, isWater: true,  waterY: -0.25, waterAlpha: 0.88 },
  [T.WATER]:         { topY: -0.10, boxH: 0.2,  color: 0x1a5c8c, isWater: true,  waterY: -0.10, waterAlpha: 0.72 },
  [T.SAND]:          { topY:  0.00, boxH: 0.2,  color: 0xc8a040 },
  [T.GRASS]:         { topY:  0.05, boxH: 0.2,  color: 0x2d7a2a, colorVar: true  },
  [T.FOREST]:        { topY:  0.05, boxH: 0.2,  color: 0x1a5a1a, hasTree: true   },
  [T.STONE]:         { topY:  0.25, boxH: 0.2,  color: 0x585858 },
  [T.DUNGEON_FLOOR]: { topY:  0.00, boxH: 0.2,  color: 0x303540 },
  [T.DUNGEON_WALL]:  { topY:  0.00, boxH: 1.5,  color: 0x181818, wallBox: true   },
  [T.PATH]:          { topY:  0.02, boxH: 0.2,  color: 0x8a7050 },
  [T.TOWN_FLOOR]:    { topY:  0.04, boxH: 0.2,  color: 0x8a8880 },
};

/** Y-coordinate of a box geometry's centre so its top surface sits at topY. */
function boxCenterY(def) {
  // Walls grow upward from floor level (topY == 0) to height 1.5.
  if (def.wallBox) return def.boxH / 2;
  return def.topY - def.boxH / 2;
}

// ── Colour helper ─────────────────────────────────────────────────────────────

const _tmpColor = new THREE.Color();

function jitteredColor(baseHex, range = 0.1) {
  _tmpColor.setHex(baseHex);
  const v = (Math.random() - 0.5) * range;
  return new THREE.Color(
    Math.max(0, Math.min(1, _tmpColor.r + v)),
    Math.max(0, Math.min(1, _tmpColor.g + v * 0.6)),
    Math.max(0, Math.min(1, _tmpColor.b + v * 0.4)),
  );
}

// ── World3D class ─────────────────────────────────────────────────────────────

export class World3D {
  /**
   * @param {THREE.Scene} scene3d  The Three.js scene to populate.
   */
  constructor(scene3d) {
    this._scene    = scene3d;
    this._mapData  = null;
    this._mapW     = 0;
    this._mapH     = 0;

    // Shared geometries (one instance, referenced by all InstancedMeshes)
    this._geos = this._createGeometries();

    // Shared materials (one per tile-type + water overlays + tree parts)
    this._mats = this._createMaterials();

    /** @type {Map<string, THREE.Group>} chunk key → scene group */
    this._chunks         = new Map();
    this._visibleKeys    = new Set();

    // Light references kept for day/night updates
    this._sunLight       = null;
    this._ambientLight   = null;
    this._hemiLight      = null;

    this._setupLighting();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Store map data and prepare internal structures.
   * Chunks are built lazily by updateVisibleChunks().
   * @param {number[][]} mapData  2-D array [row][col] of tile IDs.
   */
  build(mapData) {
    this._mapData = mapData;
    this._mapH    = mapData.length;
    this._mapW    = mapData[0]?.length ?? 0;
  }

  /**
   * Show chunks near the player and hide/cull distant ones.
   * @param {number} playerTileX  Player tile column (X).
   * @param {number} playerTileZ  Player tile row    (Z).
   */
  updateVisibleChunks(playerTileX, playerTileZ) {
    const cx     = Math.floor(playerTileX / CHUNK_SIZE);
    const cz     = Math.floor(playerTileZ / CHUNK_SIZE);
    const maxCX  = Math.ceil(this._mapW / CHUNK_SIZE);
    const maxCZ  = Math.ceil(this._mapH / CHUNK_SIZE);

    const nextKeys = new Set();

    for (let dz = -VIEW_DIST; dz <= VIEW_DIST; dz++) {
      for (let dx = -VIEW_DIST; dx <= VIEW_DIST; dx++) {
        const ccx = cx + dx;
        const ccz = cz + dz;
        if (ccx < 0 || ccz < 0 || ccx >= maxCX || ccz >= maxCZ) continue;
        nextKeys.add(`${ccx},${ccz}`);
      }
    }

    // Hide chunks that left the view distance
    for (const key of this._visibleKeys) {
      if (!nextKeys.has(key)) {
        const g = this._chunks.get(key);
        if (g) g.visible = false;
      }
    }

    // Build new chunks; re-show existing ones
    for (const key of nextKeys) {
      if (!this._chunks.has(key)) {
        const [ccx, ccz] = key.split(',').map(Number);
        const group = this._buildChunk(ccx, ccz);
        this._chunks.set(key, group);
        this._scene.add(group);
      } else {
        this._chunks.get(key).visible = true;
      }
    }

    this._visibleKeys = nextKeys;
  }

  /**
   * Adjust scene lighting to reflect the time of day.
   * @param {number} t  Normalised time: 0 = midnight, 0.5 = noon, 1 = midnight.
   */
  setTimeOfDay(t) {
    // Sun traces a circle: elevation = sin(phase - π/2) → -1 at midnight, 1 at noon
    const phase     = t * Math.PI * 2;
    const elevation = Math.sin(phase - Math.PI / 2);
    const dayFactor = Math.max(0, elevation);   // 0..1, 0 = below horizon

    // Sun position
    this._sunLight.position.set(
      Math.cos(phase) * 50,
      elevation * 100,
      Math.sin(phase * 0.5 + 1.0) * 30 + 50,  // slight Z drift for variety
    );

    // Sun intensity & colour (warm at horizon, neutral at zenith)
    this._sunLight.intensity = dayFactor;
    const warmth = dayFactor > 0 ? Math.pow(1 - dayFactor, 2) : 0;
    this._sunLight.color
      .setHex(0xfff8e0)
      .lerp(new THREE.Color(0xff9040), warmth);

    // Ambient: moonlight floor at night, soft blue-grey at noon.
    // Minimum raised so the world is navigable without a torch.
    this._ambientLight.intensity = 0.18 + dayFactor * 0.22;
    this._ambientLight.color
      .setHex(0x101030)
      .lerp(new THREE.Color(0x404060), dayFactor);

    // Hemisphere sky colour: deep night → clear blue sky.
    // Night floor raised to give faint moonlit definition to terrain.
    this._hemiLight.intensity = 0.25 + dayFactor * 0.35;
    this._hemiLight.color
      .setHex(0x050d1a)
      .lerp(new THREE.Color(0x89c4f4), dayFactor);
  }

  /** Release all GPU resources and remove scene objects. */
  dispose() {
    // Remove and dispose per-chunk InstancedMesh instance buffers
    for (const group of this._chunks.values()) {
      group.traverse(obj => {
        if (obj.isInstancedMesh) obj.dispose();
      });
      this._scene.remove(group);
    }
    this._chunks.clear();
    this._visibleKeys.clear();

    // Dispose shared geometries and materials
    for (const geo of Object.values(this._geos)) geo.dispose();
    for (const mat of Object.values(this._mats)) mat.dispose();

    this._scene.remove(this._sunLight);
    this._scene.remove(this._ambientLight);
    this._scene.remove(this._hemiLight);
  }

  // ── Helper accessors ──────────────────────────────────────────────────────

  /** @returns {number}  Tile ID at (tx, tz), or 0 if out of bounds. */
  tileAt(tx, tz) {
    if (!this._mapData) return 0;
    if (tz < 0 || tz >= this._mapH || tx < 0 || tx >= this._mapW) return 0;
    return this._mapData[tz][tx];
  }

  /** Convert world XZ coordinates to tile indices. */
  worldToTile(wx, wz) {
    return { x: Math.floor(wx), z: Math.floor(wz) };
  }

  /** Return the world-space centre of the given tile. */
  tileToWorld(tx, tz) {
    return { x: tx + 0.5, z: tz + 0.5 };
  }

  /** @returns {boolean} True when the tile is impassable (water / wall / etc.). */
  isBlocked(tx, tz) {
    return CONFIG.BLOCKED_TILES.includes(this.tileAt(tx, tz));
  }

  // ── Private: setup ────────────────────────────────────────────────────────

  _createGeometries() {
    return {
      box02:      new THREE.BoxGeometry(1, 0.2, 1),
      box15:      new THREE.BoxGeometry(1, 1.5, 1),
      waterPlane: new THREE.PlaneGeometry(1, 1),
      trunk:      new THREE.CylinderGeometry(0.08, 0.12, 0.5, 6),
      canopy:     new THREE.ConeGeometry(0.4, 0.8, 7),
    };
  }

  _createMaterials() {
    const mats = {};

    for (const [id, def] of Object.entries(TILE_DEF)) {
      // Solid ground / wall material
      mats[`tile_${id}`] = new THREE.MeshLambertMaterial({ color: def.color });

      // Transparent water-surface overlay
      if (def.isWater) {
        mats[`water_${id}`] = new THREE.MeshLambertMaterial({
          color:       def.color,
          transparent: true,
          opacity:     def.waterAlpha,
          depthWrite:  false,
          side:        THREE.FrontSide,
        });
      }
    }

    mats.trunk  = new THREE.MeshLambertMaterial({ color: 0x5a3010 });
    mats.canopy = new THREE.MeshLambertMaterial({ color: 0x1a4a1a });

    return mats;
  }

  _setupLighting() {
    // Soft fill from all directions
    this._ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    this._scene.add(this._ambientLight);

    // Sky / ground hemisphere for natural colour grading
    this._hemiLight = new THREE.HemisphereLight(0x89c4f4, 0x403020, 0.6);
    this._scene.add(this._hemiLight);

    // Primary sun – directional, shadow-casting
    this._sunLight = new THREE.DirectionalLight(0xfff8e0, 1.0);
    this._sunLight.position.set(50, 100, 50);
    this._sunLight.castShadow = true;

    const shadow = this._sunLight.shadow;
    shadow.mapSize.width  = 2048;
    shadow.mapSize.height = 2048;
    shadow.bias           = -0.001;

    const sc = shadow.camera;
    sc.near   = 1;
    sc.far    = 600;
    sc.left   = -120;
    sc.right  =  120;
    sc.top    =  120;
    sc.bottom = -120;

    this._scene.add(this._sunLight);
  }

  // ── Private: chunk building ───────────────────────────────────────────────

  /**
   * Build a Three.js Group for a chunk at chunk coordinates (cx, cz).
   * Uses one InstancedMesh per tile-type present in the chunk, plus
   * optional water planes and tree InstancedMeshes.
   */
  _buildChunk(cx, cz) {
    const group  = new THREE.Group();
    group.name   = `chunk_${cx}_${cz}`;
    const startX = cx * CHUNK_SIZE;
    const startZ = cz * CHUNK_SIZE;

    // Bucket tiles by type and note forest positions for tree instancing
    const byType     = new Map();  // tileId → [{tx, tz}]
    const forestList = [];

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
      }
    }

    // Build one InstancedMesh per tile type
    for (const [tileId, tiles] of byType) {
      this._addTileInstances(group, tileId, tiles);
    }

    // Build tree instances (trunk + canopy as separate InstancedMeshes)
    if (forestList.length > 0) {
      this._addTreeInstances(group, forestList);
    }

    return group;
  }

  /** Create InstancedMesh(es) for all tiles of a given type within a chunk. */
  _addTileInstances(group, tileId, tiles) {
    const def     = TILE_DEF[tileId];
    const geo     = def.boxH === 1.5 ? this._geos.box15 : this._geos.box02;
    const mat     = this._mats[`tile_${tileId}`];
    const count   = tiles.length;
    const centerY = boxCenterY(def);

    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.castShadow    = !!def.wallBox;
    mesh.receiveShadow = true;

    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      const { tx, tz } = tiles[i];
      dummy.position.set(tx + 0.5, centerY, tz + 0.5);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      if (def.colorVar) {
        mesh.setColorAt(i, jitteredColor(def.color, 0.08));
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    group.add(mesh);

    // Semi-transparent water plane on top of water tiles
    if (def.isWater) {
      const waterMat  = this._mats[`water_${tileId}`];
      const waterMesh = new THREE.InstancedMesh(this._geos.waterPlane, waterMat, count);
      waterMesh.castShadow    = false;
      waterMesh.receiveShadow = false;

      const wd = new THREE.Object3D();
      for (let i = 0; i < count; i++) {
        const { tx, tz } = tiles[i];
        wd.position.set(tx + 0.5, def.waterY + 0.001, tz + 0.5);
        wd.rotation.x = -Math.PI / 2;
        wd.updateMatrix();
        waterMesh.setMatrixAt(i, wd.matrix);
      }
      waterMesh.instanceMatrix.needsUpdate = true;
      group.add(waterMesh);
    }
  }

  /** Build instanced trunks and canopies for all forest tiles in a chunk. */
  _addTreeInstances(group, forestList) {
    const count = forestList.length;
    const groundY = TILE_DEF[T.FOREST].topY;

    const trunkMesh  = new THREE.InstancedMesh(this._geos.trunk,  this._mats.trunk,  count);
    const canopyMesh = new THREE.InstancedMesh(this._geos.canopy, this._mats.canopy, count);
    trunkMesh.castShadow  = canopyMesh.castShadow  = true;
    trunkMesh.receiveShadow = canopyMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      const { tx, tz } = forestList[i];
      // Randomise per-tree scale ±15 %
      const s = 0.85 + Math.random() * 0.30;

      // Trunk: CylinderGeometry default height 0.5, centred at origin
      dummy.position.set(tx + 0.5, groundY + (0.25 * s), tz + 0.5);
      dummy.scale.setScalar(s);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
      dummy.updateMatrix();
      trunkMesh.setMatrixAt(i, dummy.matrix);

      // Canopy: ConeGeometry (bottom to top ≈ 0.8 units, apex at top)
      dummy.position.set(tx + 0.5, groundY + (0.70 * s), tz + 0.5);
      dummy.updateMatrix();
      canopyMesh.setMatrixAt(i, dummy.matrix);
    }

    trunkMesh.instanceMatrix.needsUpdate  = true;
    canopyMesh.instanceMatrix.needsUpdate = true;
    group.add(trunkMesh);
    group.add(canopyMesh);
  }
}
