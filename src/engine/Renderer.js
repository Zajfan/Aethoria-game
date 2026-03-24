/**
 * Renderer.js
 * Three.js WebGLRenderer wrapper for the Aethoria RPG engine.
 * Handles canvas creation, shadow maps, pixel-ratio, and resize events.
 *
 * Usage:
 *   import { renderer, THREE } from './engine/Renderer.js';
 *   renderer.render(scene, camera);
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';

// Re-export THREE so every other module can import it from here,
// keeping the CDN URL in exactly ONE place.
export { THREE };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAX_PIXEL_RATIO = 2;

// ---------------------------------------------------------------------------
// Renderer class
// ---------------------------------------------------------------------------
class Renderer {
  /**
   * @param {object}  [opts]
   * @param {string}  [opts.containerId='game-container']  id of the mount element
   * @param {boolean} [opts.antialias=true]
   * @param {string}  [opts.clearColor='#0a0a0f']
   */
  constructor(opts = {}) {
    const {
      containerId = 'game-container',
      antialias   = true,
      clearColor  = '#0a0a0f',
    } = opts;

    // ---- WebGLRenderer ---------------------------------------------------
    this.webgl = new THREE.WebGLRenderer({
      antialias,
      powerPreference: 'high-performance',
    });

    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.webgl.setSize(window.innerWidth, window.innerHeight);
    this.webgl.setClearColor(new THREE.Color(clearColor));

    // ---- Shadow maps -------------------------------------------------------
    this.webgl.shadowMap.enabled = true;
    this.webgl.shadowMap.type    = THREE.PCFSoftShadowMap;

    // ---- Tone-mapping (improves PBR material appearance) -------------------
    this.webgl.toneMapping         = THREE.ACESFilmicToneMapping;
    this.webgl.toneMappingExposure = 1.0;
    this.webgl.outputColorSpace    = THREE.SRGBColorSpace;

    // ---- DOM ---------------------------------------------------------------
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(
        `[Renderer] Mount element #${containerId} not found in the DOM.`
      );
    }
    container.appendChild(this.webgl.domElement);

    // Style the canvas so it fills the container
    const canvas = this.webgl.domElement;
    canvas.style.display = 'block';
    canvas.style.width   = '100%';
    canvas.style.height  = '100%';

    // ---- Clock for delta-time tracking ------------------------------------
    this._clock = new THREE.Clock();

    // ---- Resize handling --------------------------------------------------
    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize, { passive: true });
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** The underlying HTMLCanvasElement (needed by InputManager.attach). */
  get canvas() { return this.webgl.domElement; }

  /** Current render target width in physical pixels. */
  get width()  { return this.webgl.domElement.width; }

  /** Current render target height in physical pixels. */
  get height() { return this.webgl.domElement.height; }

  /** Aspect ratio (width / height) used to update camera projections. */
  get aspect() { return this.width / this.height; }

  /**
   * Return seconds elapsed since the last `getDelta()` call.
   * Typically called once per frame at the top of the game loop.
   * @returns {number} delta in seconds (clamped to 0.1 s to avoid spiral-of-death)
   */
  getDelta() {
    return Math.min(this._clock.getDelta(), 0.1);
  }

  /**
   * Draw the scene from the given camera's perspective.
   * @param {THREE.Scene}  scene
   * @param {THREE.Camera} camera
   */
  render(scene, camera) {
    this.webgl.render(scene, camera);
  }

  /**
   * Resize the renderer and notify listeners.
   * Can be called manually (e.g. when the container size changes via CSS).
   */
  forceResize() {
    this._onResize();
  }

  /**
   * Dispose GPU resources and remove DOM element.
   * Call when tearing down the engine.
   */
  dispose() {
    window.removeEventListener('resize', this._onResize);
    this.webgl.dispose();
    if (this.webgl.domElement.parentNode) {
      this.webgl.domElement.parentNode.removeChild(this.webgl.domElement);
    }
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.webgl.setSize(w, h);

    // Fire a custom DOM event so Camera and any other listeners can update
    window.dispatchEvent(
      new CustomEvent('renderer-resize', { detail: { width: w, height: h } })
    );
  }
}

// ---------------------------------------------------------------------------
// Singleton instance — lazily created so import order doesn't matter
// ---------------------------------------------------------------------------
let _instance = null;

/**
 * Get (or create) the global renderer singleton.
 * @param {object} [opts]  passed to `new Renderer(opts)` on first call only
 * @returns {Renderer}
 */
export function getRenderer(opts) {
  if (!_instance) _instance = new Renderer(opts);
  return _instance;
}

// Named default export for convenience
export { Renderer };
export default getRenderer;
