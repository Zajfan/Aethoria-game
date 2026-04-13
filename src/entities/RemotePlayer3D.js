/**
 * RemotePlayer3D.js
 * Visual avatar for a remote co-op player received from the Aethoria relay server.
 *
 * Unlike Player3D this entity has NO input handling or physics — it is purely
 * a renderer that interpolates toward the latest network state received from
 * CoopClient. The interpolation smooths over the 50 ms state-send interval
 * and network jitter without any prediction complexity.
 *
 * State packet shape (set via applyState):
 *   { x, y, z, ry, hp, maxHp, anim, cls, name, level }
 */

import { THREE }   from '../engine/Renderer.js';
import { Entity3D } from './Entity3D.js';
import { CONFIG }   from '../config.js';

// How fast the avatar catches up to its target position / rotation.
// 8 units/s gives smooth following without rubber-banding.
const LERP_SPEED = 8;

// Per-class colour palettes (mirrors Player3D)
const CLASS_COLORS = {
  WARRIOR:     { body: 0x3a5f8a, accent: 0x7aa0c0, skin: 0xffcc99 },
  MAGE:        { body: 0x6a2fa0, accent: 0xffdd44, skin: 0xffcc99 },
  RANGER:      { body: 0x2d6b2d, accent: 0x8b5e3c, skin: 0xffcc99 },
  NECROMANCER: { body: 0x1a0a2e, accent: 0x8844cc, skin: 0xddbbcc },
  PALADIN:     { body: 0x8a7a2a, accent: 0xffee66, skin: 0xffcc99 },
};
const DEFAULT_COLORS = { body: 0x4a4a6a, accent: 0x8888aa, skin: 0xffcc99 };

// ── RemotePlayer3D ────────────────────────────────────────────────────────────

export class RemotePlayer3D extends Entity3D {
  /**
   * @param {THREE.Scene}   scene3d
   * @param {THREE.Camera}  camera
   * @param {string}        playerClass   e.g. 'WARRIOR'
   * @param {string}        playerName
   */
  constructor(scene3d, camera, playerClass = 'WARRIOR', playerName = 'Adventurer') {
    super(camera, playerName);

    this._playerClass = playerClass;
    this._playerName  = playerName;

    // Network state targets (we lerp toward these each frame)
    this._targetPos = new THREE.Vector3();
    this._targetRY  = 0;

    // Animation
    this._walkCycle = 0;
    this._animState = 'idle'; // 'idle' | 'walk' | 'dead'
    this._parts     = {};

    // Death animation
    this._deathFalling   = false;
    this._deathFallAngle = 0;

    this._buildModel(playerClass);

    // Scale to match the 4-unit tile grid
    this.group.scale.setScalar(CONFIG.WORLD_3D.TILE_SIZE);

    this.addToScene(scene3d);
    this._styleLabel();
  }

  // ── Model ─────────────────────────────────────────────────────────────────

  _buildModel(cls) {
    const cols   = CLASS_COLORS[cls] || DEFAULT_COLORS;
    const body   = new THREE.MeshLambertMaterial({ color: cols.body });
    const accent = new THREE.MeshLambertMaterial({ color: cols.accent });
    const skin   = new THREE.MeshLambertMaterial({ color: cols.skin });

    const add = (key, w, h, d, mat, x, y, z) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      this.group.add(mesh);
      this._parts[key] = mesh;
      return mesh;
    };

    // Humanoid body — identical proportions to Player3D
    add('torso',    0.60, 0.80, 0.35, body,    0,     1.00,  0);
    add('head',     0.45, 0.45, 0.45, skin,    0,     1.65,  0);
    add('leftArm',  0.20, 0.60, 0.20, accent, -0.40,  0.95,  0);
    add('rightArm', 0.20, 0.60, 0.20, accent,  0.40,  0.95,  0);
    add('leftLeg',  0.24, 0.55, 0.24, body,   -0.15,  0.30,  0);
    add('rightLeg', 0.24, 0.55, 0.24, body,    0.15,  0.30,  0);

    // Teal ring at feet — distinguishes co-op allies from local NPCs at a glance
    const auraGeo = new THREE.TorusGeometry(0.52, 0.045, 6, 18);
    const auraMat = new THREE.MeshLambertMaterial({
      color:            0x44aaff,
      emissive:         new THREE.Color(0x224488),
      emissiveIntensity: 0.8,
    });
    const aura = new THREE.Mesh(auraGeo, auraMat);
    aura.rotation.x = Math.PI / 2;
    aura.position.y = 0.04;
    this.group.add(aura);
    this._auraRing = aura;
  }

  _styleLabel() {
    if (!this._labelEl) return;

    const nameEl = this._labelEl.querySelector('.entity-label-name');
    if (nameEl) {
      nameEl.textContent  = `⚔ ${this._playerName}`;
      nameEl.style.color  = '#44ccff';
      nameEl.style.fontSize = '12px';
    }

    // Wider HP bar in the co-op player's brand colour
    const hpTrack = this._labelEl.querySelector('div > div');
    if (hpTrack) hpTrack.style.width = '56px';
    if (this._hpFillEl) this._hpFillEl.style.background = '#44aaff';
  }

  // ── Network state ─────────────────────────────────────────────────────────

  /**
   * Apply a state snapshot received from the relay server.
   * Called up to 20× per second — does NOT teleport, just sets target.
   *
   * @param {{ x,y,z, ry, hp, maxHp, anim, cls, name, level }} state
   */
  applyState(state) {
    if (state.x  !== undefined) this._targetPos.set(state.x, state.y ?? 0, state.z);
    if (state.ry !== undefined) this._targetRY = state.ry;

    if (state.hp    !== undefined) this.stats.hp    = state.hp;
    if (state.maxHp !== undefined) this.stats.maxHp = state.maxHp;
    if (state.anim  !== undefined) this._animState  = state.anim;

    if (state.name && state.name !== this._playerName) {
      this._playerName = state.name;
      const nameEl = this._labelEl?.querySelector('.entity-label-name');
      if (nameEl) nameEl.textContent = `⚔ ${state.name}`;
    }
  }

  /** Called when a `coop:peerEvent` with type 'death' is received. */
  setDead() {
    this._animState   = 'dead';
    this._deathFalling = true;
    this._deathFallAngle = 0;
    this.isDead = true;
  }

  /** Called when a `coop:peerEvent` with type 'respawn' is received. */
  setAlive(state) {
    this._animState      = 'idle';
    this._deathFalling   = false;
    this._deathFallAngle = 0;
    this.group.rotation.z = 0;
    this.isDead = false;
    if (state) this.applyState(state);
  }

  // ── Update ────────────────────────────────────────────────────────────────

  /** @param {number} delta  Seconds since last frame */
  update(delta) {
    // Death fall animation
    if (this._deathFalling) {
      this._deathFallAngle = Math.min(Math.PI / 2, this._deathFallAngle + delta * 2.8);
      this.group.rotation.z = this._deathFallAngle;
    }

    // ── Position interpolation ──────────────────────────────────────────────
    // Lerp smooths over the 50 ms between network packets + jitter.
    // LERP_SPEED=8 means: closes ~55% of gap per frame at 60fps, fully caught
    // up within ~3 packets — imperceptible to the eye.
    const lerpT = Math.min(1, delta * LERP_SPEED);
    this.position.lerp(this._targetPos, lerpT);

    // Rotation — use same lerp factor (no gimbal issues for a Y-axis only rotation)
    let dRY = this._targetRY - this.group.rotation.y;
    // Wrap to [-π, π] so we always take the short arc
    if (dRY >  Math.PI) dRY -= 2 * Math.PI;
    if (dRY < -Math.PI) dRY += 2 * Math.PI;
    this.group.rotation.y += dRY * lerpT;

    // ── Walk animation ──────────────────────────────────────────────────────
    const moving = this._animState === 'walk';
    this._animateWalk(delta, moving ? 5 : 0);

    // ── Sync Three.js group ─────────────────────────────────────────────────
    this.group.position.copy(this.position);
    this._updateLabelPosition();
  }

  _animateWalk(delta, speed) {
    const MAX_SWING = 0.55;
    if (speed > 0.1) {
      this._walkCycle += delta * speed * 3.5;
    } else {
      this._walkCycle *= Math.max(0, 1 - delta * 8);
    }
    const swing = Math.sin(this._walkCycle) * MAX_SWING * Math.min(1, speed / 5);
    const { leftLeg, rightLeg, leftArm, rightArm } = this._parts;
    if (leftLeg)  leftLeg.rotation.x  =  swing;
    if (rightLeg) rightLeg.rotation.x = -swing;
    if (leftArm)  leftArm.rotation.x  = -swing * 0.6;
    if (rightArm) rightArm.rotation.x =  swing * 0.6;
  }
}
