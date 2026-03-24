/**
 * AnimationSystem.js
 * Aethoria v0.4 — GLTF Model Loading & Animation Manager
 *
 * Provides:
 *  1. GLTF model loading with cache + graceful fallback to box models
 *  2. Three.js AnimationMixer management for skinned GLTF characters
 *  3. Enhanced procedural animation for existing low-poly box models:
 *     - Idle breathing bob
 *     - Walk cycle (leg/arm swing)
 *     - Attack windup + slash
 *     - Hit stagger flash
 *     - Death collapse
 *     - Floating/hovering (for bosses & shards)
 *
 * Usage — GLTF path:
 *   const animSys = new AnimationSystem(scene3d);
 *   const model   = await animSys.loadGLTF('/assets/models/warrior.glb');
 *   animSys.registerMixer(entityId, model.mixer, model.clips);
 *   animSys.play(entityId, 'Walk');
 *
 * Usage — Procedural path (current box models):
 *   const anim = animSys.createProceduralController(parts, 'WARRIOR');
 *   anim.setState('walk');
 *   anim.update(delta);
 */

import { THREE } from '../engine/Renderer.js';

// ── GLTF Loader (lazy — only imported once) ───────────────────────────────────

let _GLTFLoaderClass = null;

async function _loadGLTFLibrary() {
  if (_GLTFLoaderClass) return _GLTFLoaderClass;
  try {
    // Try to use Three.js GLTFLoader from CDN (addons path)
    const mod = await import('https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/loaders/GLTFLoader.js');
    _GLTFLoaderClass = mod.GLTFLoader;
    return _GLTFLoaderClass;
  } catch (e) {
    console.warn('[AnimationSystem] GLTFLoader not available — using procedural models only.');
    return null;
  }
}

// ── Model cache ───────────────────────────────────────────────────────────────

const _modelCache = new Map();

// ── Easing helpers ────────────────────────────────────────────────────────────

const ease = {
  inOut: t => t < 0.5 ? 2 * t * t : 1 - 2 * (1-t) * (1-t),
  out:   t => 1 - (1-t)*(1-t),
  in:    t => t * t,
  spring:t => {
    const s = 0.65;
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10*t) * Math.sin((t*10 - s) * (2*Math.PI) / 1.5) + 1;
  },
};

// ── Procedural Animation Controller ───────────────────────────────────────────

const STATES = Object.freeze({
  IDLE:   'idle',
  WALK:   'walk',
  RUN:    'run',
  ATTACK: 'attack',
  HIT:    'hit',
  DEATH:  'death',
  FLOAT:  'float',
  TALK:   'talk',
});

export class ProceduralController {
  /**
   * @param {object} parts        Named mesh references, e.g. { torso, head, leftLeg, rightLeg, leftArm, rightArm }
   * @param {string} entityType   'PLAYER', 'NPC', 'GOBLIN', 'WOLF', 'TROLL', 'SKELETON', 'BOSS'
   */
  constructor(parts, entityType = 'PLAYER') {
    this._parts  = parts;
    this._type   = entityType;
    this._state  = STATES.IDLE;
    this._prev   = STATES.IDLE;
    this._t      = 0;      // global timer
    this._stateT = 0;      // time in current state
    this._blend  = 1;      // 0=prev, 1=current (crossfade)
    this._blendSpeed = 6;  // blend units/second

    // Attack sequence
    this._atkPhase = 0;    // 0=ready, 1=windup, 2=slash, 3=recover
    this._atkT     = 0;

    // Hit flash
    this._hitFlash = 0;    // seconds remaining
    this._origColors = {}; // saved material colors

    // Death progress
    this._deathT = 0;

    // Saved original rotations / positions
    this._origRot = {};
    this._origPos = {};
    this._saveOriginals();
  }

  _saveOriginals() {
    for (const [key, mesh] of Object.entries(this._parts)) {
      if (!mesh) continue;
      this._origRot[key] = mesh.rotation.clone();
      this._origPos[key] = mesh.position.clone();
    }
  }

  /** Change animation state. */
  setState(state) {
    if (this._state === state) return;
    this._prev   = this._state;
    this._state  = state;
    this._stateT = 0;
    this._blend  = 0;
    if (state === STATES.ATTACK) { this._atkPhase = 1; this._atkT = 0; }
    if (state === STATES.DEATH)  { this._deathT = 0; }
  }

  /** @param {number} speedParam  Current move speed for walk intensity */
  update(delta, speedParam = 0) {
    this._t      += delta;
    this._stateT += delta;
    this._blend   = Math.min(1, this._blend + delta * this._blendSpeed);

    if (this._hitFlash > 0) {
      this._hitFlash -= delta;
      this._applyHitFlash(this._hitFlash > 0);
    }

    switch (this._state) {
      case STATES.IDLE:   this._animIdle(delta);               break;
      case STATES.WALK:   this._animWalk(delta, speedParam);   break;
      case STATES.RUN:    this._animWalk(delta, speedParam * 1.8); break;
      case STATES.ATTACK: this._animAttack(delta);             break;
      case STATES.HIT:    this._animHit(delta);                break;
      case STATES.DEATH:  this._animDeath(delta);              break;
      case STATES.FLOAT:  this._animFloat(delta);              break;
      case STATES.TALK:   this._animTalk(delta);               break;
    }
  }

  /** Trigger a one-shot hit flash + screen wiggle. */
  triggerHit() {
    this._hitFlash = 0.15;
  }

  /** Trigger death animation. Returns duration in seconds. */
  triggerDeath() {
    this.setState(STATES.DEATH);
    return 1.2;
  }

  /** Trigger attack animation. Returns duration in seconds. */
  triggerAttack() {
    this.setState(STATES.ATTACK);
    return 0.45;
  }

  // ── Internal animation functions ─────────────────────────────────────────

  _set(key, rotX, rotY, rotZ) {
    const m = this._parts[key];
    if (!m) return;
    m.rotation.x = rotX;
    m.rotation.y = rotY;
    m.rotation.z = rotZ;
  }

  _animIdle(delta) {
    const s = Math.sin(this._t * 1.8);
    const slow = Math.sin(this._t * 0.9);

    // Gentle breathing — torso
    if (this._parts.torso) {
      this._parts.torso.position.y = (this._origPos.torso?.y ?? 1) + slow * 0.012;
      this._parts.torso.rotation.z = slow * 0.018;
    }
    // Head bob
    if (this._parts.head) {
      this._parts.head.position.y = (this._origPos.head?.y ?? 1.65) + slow * 0.012;
      this._parts.head.rotation.y = slow * 0.04;
    }
    // Arms sway
    const armSway = slow * 0.06;
    if (this._parts.leftArm)  this._parts.leftArm.rotation.z  = -armSway;
    if (this._parts.rightArm) this._parts.rightArm.rotation.z =  armSway;
    // Legs
    if (this._parts.leftLeg)  this._parts.leftLeg.rotation.x  = 0;
    if (this._parts.rightLeg) this._parts.rightLeg.rotation.x  = 0;
  }

  _animWalk(delta, speed) {
    const MAX_SWING = 0.58;
    const swing     = Math.sin(this._t * Math.min(speed * 4.5, 9)) * MAX_SWING * Math.min(1, speed / 2);
    const tiltZ     = Math.cos(this._t * Math.min(speed * 4.5, 9) * 0.5) * 0.03;

    if (this._parts.leftLeg)  this._parts.leftLeg.rotation.x  =  swing;
    if (this._parts.rightLeg) this._parts.rightLeg.rotation.x = -swing;
    if (this._parts.leftArm)  this._parts.leftArm.rotation.x  = -swing * 0.6;
    if (this._parts.rightArm) this._parts.rightArm.rotation.x =  swing * 0.6;

    // Head stays forward
    if (this._parts.head) this._parts.head.rotation.x = swing * 0.05;
    if (this._parts.torso) this._parts.torso.rotation.z = tiltZ;
  }

  _animAttack(delta) {
    this._atkT += delta;

    const WINDUP   = 0.12;
    const SLASH    = 0.10;
    const RECOVER  = 0.23;

    if (this._atkPhase === 1) {
      // Windup — pull arm back
      const t = Math.min(1, this._atkT / WINDUP);
      if (this._parts.rightArm) this._parts.rightArm.rotation.x = -1.8 * ease.in(t);
      if (this._parts.torso)    this._parts.torso.rotation.y     = -0.4 * ease.in(t);
      if (t >= 1) { this._atkPhase = 2; this._atkT = 0; }

    } else if (this._atkPhase === 2) {
      // Slash — fast forward sweep
      const t = Math.min(1, this._atkT / SLASH);
      if (this._parts.rightArm) this._parts.rightArm.rotation.x = -1.8 + 2.8 * ease.out(t);
      if (this._parts.torso)    this._parts.torso.rotation.y     = -0.4 + 0.8 * ease.out(t);
      if (t >= 1) { this._atkPhase = 3; this._atkT = 0; }

    } else if (this._atkPhase === 3) {
      // Recovery — return to idle
      const t = Math.min(1, this._atkT / RECOVER);
      if (this._parts.rightArm) this._parts.rightArm.rotation.x = 1.0 * (1 - ease.out(t));
      if (this._parts.torso)    this._parts.torso.rotation.y     = 0.4 * (1 - ease.out(t));
      if (t >= 1) { this._atkPhase = 0; this.setState(STATES.IDLE); }
    }
  }

  _animHit(delta) {
    const MAX = 0.18;
    const t   = Math.min(1, this._stateT / MAX);
    const sh  = Math.sin(t * Math.PI * 3) * (1 - t) * 0.15;
    if (this._parts.torso) this._parts.torso.rotation.z = sh;
    if (t >= 1) this.setState(STATES.IDLE);
  }

  _animDeath(delta) {
    this._deathT += delta;
    const t = Math.min(1, this._deathT / 1.1);

    // Fall forward
    if (this._parts.torso) {
      this._parts.torso.rotation.x = 1.55 * ease.in(t);
      this._parts.torso.position.y = Math.max(0.05, (this._origPos.torso?.y ?? 1) * (1 - t * 0.85));
    }
    if (this._parts.head) {
      this._parts.head.rotation.x = 1.2 * ease.in(t);
    }
    if (this._parts.leftLeg)  this._parts.leftLeg.rotation.x  = 0.3 * t;
    if (this._parts.rightLeg) this._parts.rightLeg.rotation.x = -0.2 * t;
    if (this._parts.leftArm)  this._parts.leftArm.rotation.z  = -0.8 * ease.out(t);
    if (this._parts.rightArm) this._parts.rightArm.rotation.z =  0.8 * ease.out(t);
  }

  _animFloat(delta) {
    const s = Math.sin(this._t * 1.4);
    if (this._parts.torso) {
      this._parts.torso.position.y = (this._origPos.torso?.y ?? 1) + s * 0.08;
      this._parts.torso.rotation.y = this._t * 0.3;
    }
    if (this._parts.head) {
      this._parts.head.position.y = (this._origPos.head?.y ?? 1.65) + s * 0.08;
    }
  }

  _animTalk(delta) {
    const nod = Math.sin(this._t * 4) * 0.06;
    if (this._parts.head) this._parts.head.rotation.x = nod;
    this._animIdle(delta);
  }

  _applyHitFlash(on) {
    for (const mesh of Object.values(this._parts)) {
      if (!mesh) continue;
      if (on) {
        mesh.traverse(obj => {
          if (obj.isMesh && obj.material) {
            if (!this._origColors[obj.uuid]) {
              this._origColors[obj.uuid] = obj.material.color?.clone();
            }
            obj.material.emissive?.set(0xffffff);
            obj.material.emissiveIntensity = 0.9;
          }
        });
      } else {
        mesh.traverse(obj => {
          if (obj.isMesh && obj.material) {
            obj.material.emissive?.set(0x000000);
            obj.material.emissiveIntensity = 0;
          }
        });
        this._origColors = {};
      }
    }
  }
}

// ── GLTF Mixer Wrapper ────────────────────────────────────────────────────────

class GLTFMixerController {
  constructor(mixer, clips) {
    this._mixer  = mixer;
    this._clips  = clips;
    this._current = null;
    this._actions = {};

    // Pre-create actions for all clips
    for (const clip of clips) {
      this._actions[clip.name] = mixer.clipAction(clip);
    }
  }

  play(clipName, crossfade = 0.25) {
    const next = this._actions[clipName];
    if (!next) {
      console.warn(`[AnimationSystem] No clip named "${clipName}"`);
      return;
    }
    if (this._current && this._current !== next) {
      next.reset().play();
      this._current.crossFadeTo(next, crossfade, true);
    } else if (!this._current) {
      next.reset().play();
    }
    this._current = next;
  }

  update(delta) {
    this._mixer.update(delta);
  }

  stop() {
    this._mixer.stopAllAction();
  }
}

// ── AnimationSystem (main export) ─────────────────────────────────────────────

export class AnimationSystem {
  constructor(scene3d) {
    this._scene    = scene3d;
    this._mixers   = new Map(); // entityId → GLTFMixerController
    this._procCtrls = new Map(); // entityId → ProceduralController
  }

  // ── GLTF loading ───────────────────────────────────────────────────────────

  /**
   * Load a GLTF/GLB model. Returns null if loading fails (use fallback).
   * @param {string} url      URL to the .glb file
   * @param {object} [opts]
   * @param {number} [opts.scale=1]
   * @param {THREE.Vector3} [opts.offset]
   * @returns {Promise<{group:THREE.Group, mixer:THREE.AnimationMixer, clips:THREE.AnimationClip[]}|null>}
   */
  async loadGLTF(url, opts = {}) {
    if (_modelCache.has(url)) {
      return this._cloneGLTF(_modelCache.get(url), opts);
    }

    const GLTFLoader = await _loadGLTFLibrary();
    if (!GLTFLoader) return null;

    return new Promise((resolve) => {
      const loader = new GLTFLoader();
      loader.load(
        url,
        (gltf) => {
          _modelCache.set(url, gltf);
          resolve(this._cloneGLTF(gltf, opts));
        },
        undefined,
        (err) => {
          console.warn(`[AnimationSystem] Failed to load GLTF: ${url}`, err);
          resolve(null);
        }
      );
    });
  }

  _cloneGLTF(gltf, opts) {
    const scale  = opts.scale  ?? 1;
    const offset = opts.offset ?? new THREE.Vector3(0, 0, 0);

    const group = gltf.scene.clone(true);
    group.scale.setScalar(scale);
    group.position.copy(offset);

    // Enable shadows on all meshes
    group.traverse(obj => {
      if (obj.isMesh) {
        obj.castShadow    = true;
        obj.receiveShadow = true;
        // Upgrade to standard material if lambert (for better shading)
        if (obj.material?.isMeshLambertMaterial) {
          const oldMat = obj.material;
          obj.material = new THREE.MeshStandardMaterial({
            color:        oldMat.color,
            map:          oldMat.map,
            roughness:    0.7,
            metalness:    0.1,
          });
          oldMat.dispose();
        }
      }
    });

    const mixer = new THREE.AnimationMixer(group);
    const clips = gltf.animations ?? [];

    return { group, mixer, clips };
  }

  // ── Mixer registration (GLTF path) ────────────────────────────────────────

  /**
   * Register a GLTF entity's animation mixer.
   * @param {string} id     Unique entity identifier
   * @param {THREE.AnimationMixer} mixer
   * @param {THREE.AnimationClip[]} clips
   * @returns {GLTFMixerController}
   */
  registerMixer(id, mixer, clips) {
    const ctrl = new GLTFMixerController(mixer, clips);
    this._mixers.set(id, ctrl);
    return ctrl;
  }

  /** Get a registered GLTF controller. */
  getMixer(id) { return this._mixers.get(id) ?? null; }

  /** Play a GLTF animation by clip name. */
  play(id, clipName, crossfade = 0.25) {
    this._mixers.get(id)?.play(clipName, crossfade);
  }

  // ── Procedural animation ───────────────────────────────────────────────────

  /**
   * Create and register a procedural animation controller for a box-model entity.
   * @param {string} id    Entity ID
   * @param {object} parts Named mesh refs (torso, head, leftLeg, rightLeg, leftArm, rightArm)
   * @param {string} type  Entity type hint ('PLAYER', 'NPC', etc.)
   * @returns {ProceduralController}
   */
  createProceduralController(id, parts, type = 'PLAYER') {
    const ctrl = new ProceduralController(parts, type);
    this._procCtrls.set(id, ctrl);
    return ctrl;
  }

  /** Get a procedural controller. */
  getProcedural(id) { return this._procCtrls.get(id) ?? null; }

  // ── Global update ──────────────────────────────────────────────────────────

  /** Call every frame. @param {number} delta seconds */
  update(delta) {
    for (const ctrl of this._mixers.values())   ctrl.update(delta);
    for (const ctrl of this._procCtrls.values()) ctrl.update(delta);
  }

  /** Remove and clean up an entity. */
  unregister(id) {
    this._mixers.get(id)?.stop();
    this._mixers.delete(id);
    this._procCtrls.delete(id);
  }

  dispose() {
    for (const ctrl of this._mixers.values()) ctrl.stop();
    this._mixers.clear();
    this._procCtrls.clear();
  }
}
