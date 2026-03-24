/**
 * Camera.js
 * Isometric-style RPG camera (RuneScape / Diablo / Albion Online feel).
 *
 * Behaviour:
 *  - Orbits around a target position at a fixed pitch angle (~50-55°)
 *  - Q / E keys (or programmatic calls) rotate the orbit yaw
 *  - Mouse wheel zooms (distance clamped to [MIN_ZOOM, MAX_ZOOM])
 *  - Smoothly lerps toward the current target each frame
 *
 * Usage:
 *   import { camera } from './engine/Camera.js';
 *   // each frame:
 *   camera.update(delta, inputManager);
 *   camera.follow(player.position);
 *   renderer.render(scene, camera.threeCamera);
 */

import { THREE, getRenderer } from './Renderer.js';
import { Keys } from './InputManager.js';

// ---------------------------------------------------------------------------
// Tuning constants
// ---------------------------------------------------------------------------
const DEFAULT_ZOOM      = 20;     // initial distance from target
const MIN_ZOOM          = 8;      // closest the camera can get
const MAX_ZOOM          = 30;     // furthest the camera can get
const ZOOM_SPEED        = 0.015;  // wheel units → zoom units
const ROTATE_SPEED      = 1.8;    // radians per second for Q/E keys
const PITCH_DEGREES     = 52;     // fixed vertical angle (degrees)
const LERP_FACTOR       = 0.06;   // camera smoothing (0 = no movement, 1 = instant)
const INITIAL_YAW       = 0;      // starting horizontal angle (radians)

// ---------------------------------------------------------------------------
// Camera class
// ---------------------------------------------------------------------------
class Camera {
  /**
   * @param {import('./Renderer.js').Renderer} renderer
   */
  constructor(renderer) {
    this._renderer = renderer;

    // ---- THREE.PerspectiveCamera -------------------------------------------
    this.threeCamera = new THREE.PerspectiveCamera(
      50,                        // vertical FOV (degrees) — narrower = less distortion
      renderer.aspect,
      0.1,                       // near clip
      500,                       // far clip — enough for large open worlds
    );

    // ---- Orbit state -------------------------------------------------------
    /** Current yaw (horizontal rotation) in radians */
    this.yaw  = INITIAL_YAW;
    /** Fixed pitch in radians (negative = looking down) */
    this.pitch = -(PITCH_DEGREES * Math.PI / 180);
    /** Current distance from target */
    this.zoom = DEFAULT_ZOOM;
    /** Smoothed target position (lerp destination) */
    this._smoothTarget = new THREE.Vector3();
    /** Desired target (set by follow()) */
    this._desiredTarget = new THREE.Vector3();

    // ---- Initial placement -------------------------------------------------
    this._applyOrbit();

    // ---- Resize listener ---------------------------------------------------
    this._onResize = this._onResize.bind(this);
    window.addEventListener('renderer-resize', this._onResize, { passive: true });
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Set the world-space position the camera should look at / orbit around.
   * Call every frame with the player's current position.
   * @param {THREE.Vector3} position
   */
  follow(position) {
    this._desiredTarget.copy(position);
  }

  /**
   * Per-frame update.  Must be called after `follow()` and before rendering.
   * @param {number}                          delta  seconds since last frame
   * @param {import('./InputManager.js').InputManager} input
   */
  update(delta, input) {
    // --- Yaw rotation (Q / E) --------------------------------------------
    if (input.isHeld(Keys.Q)) {
      this.yaw -= ROTATE_SPEED * delta;
    }
    if (input.isHeld(Keys.E)) {
      this.yaw += ROTATE_SPEED * delta;
    }
    // Keep yaw in [-π, π] for tidiness
    this.yaw = ((this.yaw + Math.PI) % (Math.PI * 2)) - Math.PI;

    // --- Zoom (mouse wheel) -----------------------------------------------
    if (input.wheelDelta !== 0) {
      this.zoom += input.wheelDelta * ZOOM_SPEED;
      this.zoom  = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.zoom));
    }

    // --- Smooth follow the desired target ----------------------------------
    this._smoothTarget.lerp(this._desiredTarget, LERP_FACTOR);

    // --- Reposition camera around smooth target ---------------------------
    this._applyOrbit();
  }

  /**
   * Instantly snap the camera to a position (e.g. on scene load).
   * @param {THREE.Vector3} position
   */
  snapTo(position) {
    this._desiredTarget.copy(position);
    this._smoothTarget.copy(position);
    this._applyOrbit();
  }

  /**
   * Programmatically set the yaw angle.
   * @param {number} radians
   */
  setYaw(radians) {
    this.yaw = radians;
    this._applyOrbit();
  }

  /**
   * Programmatically set zoom distance.
   * @param {number} distance  clamped to [MIN_ZOOM, MAX_ZOOM]
   */
  setZoom(distance) {
    this.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, distance));
    this._applyOrbit();
  }

  /**
   * Returns the camera's current forward direction projected onto the XZ plane.
   * Useful for translating WASD movement into world space.
   * @returns {THREE.Vector3} normalised
   */
  getForwardXZ() {
    const dir = new THREE.Vector3(
      -Math.sin(this.yaw),
       0,
      -Math.cos(this.yaw),
    );
    return dir.normalize();
  }

  /**
   * Returns the camera's right vector (perpendicular to forward, in XZ plane).
   * @returns {THREE.Vector3} normalised
   */
  getRightXZ() {
    const fwd = this.getForwardXZ();
    return new THREE.Vector3(fwd.z, 0, -fwd.x);
  }

  /** Clean up event listeners. */
  dispose() {
    window.removeEventListener('renderer-resize', this._onResize);
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  /**
   * Compute and apply camera position based on current yaw, pitch, zoom,
   * and smooth target.  Also points the camera at the target.
   */
  _applyOrbit() {
    const t = this._smoothTarget;

    // Spherical → Cartesian offset from target
    const cosP = Math.cos(this.pitch);
    const sinP = Math.sin(this.pitch);
    const cosY = Math.cos(this.yaw);
    const sinY = Math.sin(this.yaw);

    // pitch is negative so camera is above; standard spherical coords:
    //   x = r * cos(pitch) * sin(yaw)
    //   y = r * sin(pitch)          (negative pitch → positive Y offset)
    //   z = r * cos(pitch) * cos(yaw)
    const offset = new THREE.Vector3(
       this.zoom * cosP * sinY,
      -this.zoom * sinP,          // sinP is negative, so this is positive
       this.zoom * cosP * cosY,
    );

    this.threeCamera.position.copy(t).add(offset);
    this.threeCamera.lookAt(t);
  }

  _onResize(e) {
    const { width, height } = e.detail;
    this.threeCamera.aspect = width / height;
    this.threeCamera.updateProjectionMatrix();
  }
}

// ---------------------------------------------------------------------------
// Singleton factory (mirrors Renderer pattern)
// ---------------------------------------------------------------------------
let _instance = null;

/**
 * Get (or create) the global Camera singleton.
 * @param {import('./Renderer.js').Renderer} [rendererInstance]
 * @returns {Camera}
 */
export function getCamera(rendererInstance) {
  if (!_instance) {
    const r = rendererInstance ?? getRenderer();
    _instance = new Camera(r);
  }
  return _instance;
}

export { Camera };
export default getCamera;
