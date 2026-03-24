/**
 * Entity3D.js
 * Base class for all 3D entities in the Aethoria RPG.
 * Provides: position, group (Three.js scene node), stats, velocity,
 * DOM label with name + HP bar, scene attachment helpers, and fade support.
 */

import { THREE } from '../engine/Renderer.js';

// Pixels → world-unit scale (1 world unit ≈ 16 original pixels)
export const PX = 1 / 16;

/** @returns {HTMLElement} The #ui-overlay element, falling back to body. */
function _overlay() {
  return document.getElementById('ui-overlay') || document.body;
}

export class Entity3D {
  /**
   * @param {THREE.Camera|null} camera  Camera reference for label projection (may be set later)
   * @param {string} name               Display name shown in the floating label
   */
  constructor(camera, name = 'Entity') {
    this.camera   = camera;
    this.name     = name;

    /** World-space position (group.position is kept in sync). */
    this.position = new THREE.Vector3();

    /** Velocity in world units per second. */
    this.velocity = new THREE.Vector3();

    /** Root scene node — all meshes are children of this. */
    this.group = new THREE.Group();

    this.stats = { hp: 100, maxHp: 100, atk: 10, def: 5, spd: 5 };
    this.isDead = false;

    /** Back-reference set by addToScene / removeFromScene. */
    this._scene = null;

    // Fade state (used by _startFade / _tickFade)
    this._fadeAlpha    = 1;
    this._isFading     = false;
    this._fadeDuration = 1;
    this._fadeElapsed  = 0;
    this._fadeOnComplete = null;

    this._createLabel(name);
  }

  // ── DOM label ────────────────────────────────────────────────────────────

  _createLabel(name) {
    const overlay = _overlay();

    this._labelEl = document.createElement('div');
    this._labelEl.className = 'entity-label';
    Object.assign(this._labelEl.style, {
      position:      'absolute',
      pointerEvents: 'none',
      textAlign:     'center',
      transform:     'translate(-50%, -100%)',
      display:       'none',
      userSelect:    'none',
    });

    const nameEl = document.createElement('div');
    nameEl.className = 'entity-label-name';
    nameEl.textContent = name;
    Object.assign(nameEl.style, {
      fontFamily:  "'Courier New', monospace",
      fontSize:    '11px',
      color:       '#aaccff',
      textShadow:  '0 0 4px #000, 1px 1px 2px #000',
      whiteSpace:  'nowrap',
      marginBottom:'3px',
    });

    const hpTrack = document.createElement('div');
    Object.assign(hpTrack.style, {
      width:        '48px',
      height:       '5px',
      background:   '#330000',
      borderRadius: '3px',
      overflow:     'hidden',
      margin:       '0 auto',
    });

    this._hpFillEl = document.createElement('div');
    Object.assign(this._hpFillEl.style, {
      height:       '100%',
      width:        '100%',
      background:   '#ee3333',
      borderRadius: '3px',
      transition:   'width 0.12s',
    });

    hpTrack.appendChild(this._hpFillEl);
    this._labelEl.appendChild(nameEl);
    this._labelEl.appendChild(hpTrack);
    overlay.appendChild(this._labelEl);
  }

  /** Re-project label position to screen space. Call once per frame. */
  _updateLabelPosition() {
    if (!this._labelEl || !this.camera || !this._scene) return;

    // Project a point slightly above the entity's head
    const worldPos = new THREE.Vector3(
      this.position.x,
      this.position.y + 2.4,
      this.position.z,
    );
    worldPos.project(this.camera);

    // worldPos.z > 1 means the point is behind the camera
    if (worldPos.z > 1) {
      this._labelEl.style.display = 'none';
      return;
    }

    const sx = (worldPos.x *  0.5 + 0.5) * window.innerWidth;
    const sy = (worldPos.y * -0.5 + 0.5) * window.innerHeight;

    this._labelEl.style.display = 'block';
    this._labelEl.style.left    = `${sx}px`;
    this._labelEl.style.top     = `${sy}px`;
    this._labelEl.style.opacity = this._fadeAlpha.toFixed(3);

    const ratio = this.stats.maxHp > 0
      ? Math.max(0, this.stats.hp / this.stats.maxHp)
      : 0;
    this._hpFillEl.style.width = `${(ratio * 100).toFixed(1)}%`;
  }

  // ── Scene management ─────────────────────────────────────────────────────

  /** Add the entity's group to a THREE.Scene. */
  addToScene(scene) {
    this._scene = scene;
    scene.add(this.group);
  }

  /** Remove the entity's group from a THREE.Scene. */
  removeFromScene(scene) {
    scene.remove(this.group);
    this._scene = null;
    if (this._labelEl) this._labelEl.style.display = 'none';
  }

  // ── Utility ──────────────────────────────────────────────────────────────

  /**
   * World-space distance to another Entity3D.
   * @param {Entity3D} other
   * @returns {number}
   */
  distanceTo(other) {
    return this.position.distanceTo(other.position);
  }

  // ── Fade helpers ─────────────────────────────────────────────────────────

  /**
   * Begin a linear fade-out.
   * @param {number}        duration    Seconds to reach opacity 0
   * @param {Function|null} onComplete  Called when fade ends
   */
  _startFade(duration, onComplete = null) {
    this._isFading       = true;
    this._fadeAlpha      = 1;
    this._fadeDuration   = duration;
    this._fadeElapsed    = 0;
    this._fadeOnComplete = onComplete;
  }

  /** Advance the fade; call from update() when _isFading. */
  _tickFade(delta) {
    if (!this._isFading) return;
    this._fadeElapsed += delta;
    this._fadeAlpha    = Math.max(0, 1 - this._fadeElapsed / this._fadeDuration);

    this.group.traverse(obj => {
      if (obj.isMesh && obj.material) {
        obj.material.transparent = true;
        obj.material.opacity     = this._fadeAlpha;
      }
    });

    if (this._labelEl) this._labelEl.style.opacity = this._fadeAlpha.toFixed(3);

    if (this._fadeElapsed >= this._fadeDuration) {
      this._isFading = false;
      this._fadeOnComplete?.();
      this._fadeOnComplete = null;
    }
  }

  // ── Update ───────────────────────────────────────────────────────────────

  /**
   * Base update: apply velocity, sync group position, update label.
   * Subclasses should call super.update(delta) or manage sync themselves.
   * @param {number} delta  Seconds since last frame
   */
  update(delta) {
    this.position.addScaledVector(this.velocity, delta);
    this.group.position.copy(this.position);
    this._updateLabelPosition();
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────

  /** Dispose all GPU resources and remove the DOM label. */
  dispose() {
    if (this._scene) this.removeFromScene(this._scene);

    this.group.traverse(obj => {
      if (!obj.isMesh) return;
      obj.geometry?.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => m?.dispose());
      } else {
        obj.material?.dispose();
      }
    });

    this._labelEl?.parentNode?.removeChild(this._labelEl);
    this._labelEl  = null;
    this._hpFillEl = null;
  }
}
