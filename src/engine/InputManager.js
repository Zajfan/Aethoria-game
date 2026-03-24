/**
 * InputManager.js
 * Unified keyboard / mouse / touch input layer for the Three.js RPG.
 * Call `input.update()` once per frame (after reading state, before next logic tick)
 * to flush just-pressed / just-released buffers.
 */

// ---------------------------------------------------------------------------
// Key identifier constants
// ---------------------------------------------------------------------------
export const Keys = {
  UP:    'ArrowUp',
  DOWN:  'ArrowDown',
  LEFT:  'ArrowLeft',
  RIGHT: 'ArrowRight',
  W: 'w', S: 's', A: 'a', D: 'd',
  E: 'e', I: 'i', M: 'm', Q: 'q',
  ESC:   'Escape',
  SPACE: ' ',
};

// ---------------------------------------------------------------------------
// Mouse button indices
// ---------------------------------------------------------------------------
export const MouseButton = {
  LEFT:   0,
  MIDDLE: 1,
  RIGHT:  2,
};

// ---------------------------------------------------------------------------
// InputManager class
// ---------------------------------------------------------------------------
export class InputManager {
  constructor() {
    // ---- Keyboard --------------------------------------------------------
    /** Keys currently held (keydown and not yet keyup) @type {Set<string>} */
    this.held    = new Set();
    /** Keys pressed THIS frame @type {Set<string>} */
    this.pressed = new Set();
    /** Keys released THIS frame @type {Set<string>} */
    this.released = new Set();

    // ---- Mouse -----------------------------------------------------------
    /** Screen-space pixel position */
    this.mouse = { x: 0, y: 0 };
    /** Normalised Device Coordinates (-1 … 1) used for Three.js raycasting */
    this.mouseNDC = { x: 0, y: 0 };
    /** Mouse buttons currently held @type {Set<number>} */
    this.mouseButtons = new Set();
    /** Mouse buttons pressed THIS frame @type {Set<number>} */
    this.mousePressed = new Set();
    /** Mouse buttons released THIS frame @type {Set<number>} */
    this.mouseReleased = new Set();
    /** Accumulated wheel delta (Y axis) since last update() */
    this.wheelDelta = 0;
    /** Whether the pointer is locked (for future FPS-style modes) */
    this.isPointerLocked = false;

    // ---- Touch / Virtual joystick ----------------------------------------
    /**
     * Virtual joystick axis values in [-1, 1].
     * Populated by touch events when the stick zone is active.
     */
    this.joystick = { x: 0, y: 0 };
    /** Raw active touch points keyed by identifier @type {Map<number,{x,y}>} */
    this._touches = new Map();
    /** Starting position of a joystick-zone touch */
    this._joystickOrigin = null;
    /** Touch identifier being used as the joystick */
    this._joystickTouchId = null;
    /** Left third of screen is joystick zone (configurable) */
    this.joystickZoneRatio = 0.35;
    /** Radius in pixels before joystick reaches max deflection */
    this.joystickRadius = 60;

    // ---- Misc ------------------------------------------------------------
    this._canvas = null; // set by attach()

    this._onKeyDown   = this._onKeyDown.bind(this);
    this._onKeyUp     = this._onKeyUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp   = this._onMouseUp.bind(this);
    this._onWheel     = this._onWheel.bind(this);
    this._onTouchStart  = this._onTouchStart.bind(this);
    this._onTouchMove   = this._onTouchMove.bind(this);
    this._onTouchEnd    = this._onTouchEnd.bind(this);
    this._onContextMenu = (e) => e.preventDefault();
    this._onPointerLockChange = this._onPointerLockChange.bind(this);
  }

  // -------------------------------------------------------------------------
  // Setup / teardown
  // -------------------------------------------------------------------------

  /**
   * Attach event listeners to the window and optionally the canvas element.
   * Call once after the renderer has created its canvas.
   * @param {HTMLCanvasElement} canvas
   */
  attach(canvas) {
    if (!(canvas instanceof EventTarget)) {
      throw new TypeError(
        `[InputManager] attach() requires a valid HTMLCanvasElement; received ${canvas}. ` +
        `Ensure the renderer is fully initialized before calling attach().`
      );
    }
    this._canvas = canvas;

    window.addEventListener('keydown',   this._onKeyDown,   { passive: false });
    window.addEventListener('keyup',     this._onKeyUp,     { passive: false });

    canvas.addEventListener('mousemove', this._onMouseMove, { passive: true });
    canvas.addEventListener('mousedown', this._onMouseDown, { passive: false });
    canvas.addEventListener('mouseup',   this._onMouseUp,   { passive: false });
    canvas.addEventListener('wheel',     this._onWheel,     { passive: false });
    canvas.addEventListener('contextmenu', this._onContextMenu);

    canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  this._onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',   this._onTouchEnd,   { passive: false });
    canvas.addEventListener('touchcancel',this._onTouchEnd,   { passive: false });

    document.addEventListener('pointerlockchange', this._onPointerLockChange);
  }

  /** Remove all event listeners (call on destroy / scene change). */
  detach() {
    window.removeEventListener('keydown',  this._onKeyDown);
    window.removeEventListener('keyup',    this._onKeyUp);
    if (!this._canvas) return;
    this._canvas.removeEventListener('mousemove',  this._onMouseMove);
    this._canvas.removeEventListener('mousedown',  this._onMouseDown);
    this._canvas.removeEventListener('mouseup',    this._onMouseUp);
    this._canvas.removeEventListener('wheel',      this._onWheel);
    this._canvas.removeEventListener('contextmenu',this._onContextMenu);
    this._canvas.removeEventListener('touchstart', this._onTouchStart);
    this._canvas.removeEventListener('touchmove',  this._onTouchMove);
    this._canvas.removeEventListener('touchend',   this._onTouchEnd);
    this._canvas.removeEventListener('touchcancel',this._onTouchEnd);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
    this._canvas = null;
  }

  // -------------------------------------------------------------------------
  // Per-frame update — MUST be called once per frame, after game logic reads state
  // -------------------------------------------------------------------------

  /**
   * Flush per-frame buffers.  Call at the END of each game loop iteration
   * (or at the start, before processing — just be consistent).
   */
  update() {
    this.pressed.clear();
    this.released.clear();
    this.mousePressed.clear();
    this.mouseReleased.clear();
    this.wheelDelta = 0;
  }

  // -------------------------------------------------------------------------
  // Keyboard query helpers
  // -------------------------------------------------------------------------

  /** @param {string} key  Key.value constant or raw key string */
  isHeld(key)     { return this.held.has(key); }
  isPressed(key)  { return this.pressed.has(key); }
  isReleased(key) { return this.released.has(key); }

  /** True while any movement key is held. */
  get isMoving() {
    return this.held.has(Keys.W) || this.held.has(Keys.S) ||
           this.held.has(Keys.A) || this.held.has(Keys.D) ||
           this.held.has(Keys.UP) || this.held.has(Keys.DOWN) ||
           this.held.has(Keys.LEFT) || this.held.has(Keys.RIGHT) ||
           this.joystick.x !== 0 || this.joystick.y !== 0;
  }

  /**
   * Returns a [-1, 1] movement vector combining keyboard and virtual joystick.
   * @returns {{ x: number, y: number }}
   */
  getMovementVector() {
    let x = 0, y = 0;

    if (this.held.has(Keys.A) || this.held.has(Keys.LEFT))  x -= 1;
    if (this.held.has(Keys.D) || this.held.has(Keys.RIGHT)) x += 1;
    if (this.held.has(Keys.W) || this.held.has(Keys.UP))    y -= 1;
    if (this.held.has(Keys.S) || this.held.has(Keys.DOWN))  y += 1;

    // Blend joystick if keyboard is idle
    if (x === 0) x = this.joystick.x;
    if (y === 0) y = this.joystick.y;

    // Normalise diagonal keyboard input
    const len = Math.sqrt(x * x + y * y);
    if (len > 1) { x /= len; y /= len; }

    return { x, y };
  }

  // -------------------------------------------------------------------------
  // Mouse query helpers
  // -------------------------------------------------------------------------

  isMouseHeld(btn)     { return this.mouseButtons.has(btn); }
  isMousePressed(btn)  { return this.mousePressed.has(btn); }
  isMouseReleased(btn) { return this.mouseReleased.has(btn); }

  // -------------------------------------------------------------------------
  // Private event handlers — Keyboard
  // -------------------------------------------------------------------------

  _onKeyDown(e) {
    // Prevent browser shortcuts for game keys while canvas is active
    const blockedDefaults = new Set([
      'ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Tab',
    ]);
    if (blockedDefaults.has(e.key) && document.activeElement === this._canvas) {
      e.preventDefault();
    }

    if (!this.held.has(e.key)) {
      this.pressed.add(e.key);
    }
    this.held.add(e.key);
  }

  _onKeyUp(e) {
    this.held.delete(e.key);
    this.released.add(e.key);
  }

  // -------------------------------------------------------------------------
  // Private event handlers — Mouse
  // -------------------------------------------------------------------------

  _onMouseMove(e) {
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;

    if (this._canvas) {
      const rect = this._canvas.getBoundingClientRect();
      this.mouseNDC.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      this.mouseNDC.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    }
  }

  _onMouseDown(e) {
    if (!this.mouseButtons.has(e.button)) {
      this.mousePressed.add(e.button);
    }
    this.mouseButtons.add(e.button);
  }

  _onMouseUp(e) {
    this.mouseButtons.delete(e.button);
    this.mouseReleased.add(e.button);
  }

  _onWheel(e) {
    e.preventDefault();
    // Normalise across different browser/device wheel modes
    this.wheelDelta += e.deltaY;
  }

  _onPointerLockChange() {
    this.isPointerLocked = document.pointerLockElement === this._canvas;
  }

  // -------------------------------------------------------------------------
  // Private event handlers — Touch / Virtual joystick
  // -------------------------------------------------------------------------

  _onTouchStart(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      this._touches.set(t.identifier, { x: t.clientX, y: t.clientY });

      // Determine if this touch is in the joystick zone (left side of screen)
      const isJoystickZone =
        this._joystickTouchId === null &&
        t.clientX < window.innerWidth * this.joystickZoneRatio;

      if (isJoystickZone) {
        this._joystickTouchId = t.identifier;
        this._joystickOrigin  = { x: t.clientX, y: t.clientY };
        this.joystick = { x: 0, y: 0 };
      }
    }
  }

  _onTouchMove(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      this._touches.set(t.identifier, { x: t.clientX, y: t.clientY });

      if (t.identifier === this._joystickTouchId && this._joystickOrigin) {
        const dx = t.clientX - this._joystickOrigin.x;
        const dy = t.clientY - this._joystickOrigin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clamped = Math.min(dist, this.joystickRadius);
        const angle = Math.atan2(dy, dx);
        const norm  = clamped / this.joystickRadius;

        this.joystick = {
          x:  Math.cos(angle) * norm,
          y:  Math.sin(angle) * norm, // positive Y = down (matches keyboard)
        };
      }
    }
  }

  _onTouchEnd(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      this._touches.delete(t.identifier);

      if (t.identifier === this._joystickTouchId) {
        this._joystickTouchId = null;
        this._joystickOrigin  = null;
        this.joystick = { x: 0, y: 0 };
      }
    }
  }
}

// Shared singleton
export const inputManager = new InputManager();
export default inputManager;
