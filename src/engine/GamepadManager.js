/**
 * GamepadManager.js — Aethoria v0.7
 *
 * Web Gamepad API integration — works with Xbox, PlayStation, and
 * generic USB controllers. Full analog stick support + button mapping.
 *
 * Default mapping (Xbox layout):
 *   Left stick     → player movement (analog)
 *   Right stick    → camera rotation
 *   A / Cross      → attack nearest enemy
 *   B / Circle     → interact (E key)
 *   X / Square     → ability slot 1
 *   Y / Triangle   → ability slot 2
 *   LB / L1        → ability slot 3
 *   RB / R1        → ability slot 4
 *   Start / Options→ inventory toggle
 *   Select / Share → map toggle
 *   D-pad Up       → skill tree
 *   D-pad Down     → codex
 *   D-pad Left     → quests
 *   D-pad Right    → stat screen
 *   Left stick btn → dodge / sprint
 *
 * Analog deadzone: 0.18 (configurable)
 */

export class GamepadManager {
  constructor(inputManager, eventBus) {
    this._input   = inputManager;
    this._bus     = eventBus;
    this._gamepad = null;
    this._connected = false;

    this._deadzone = 0.18;
    this._prevButtons = new Array(20).fill(false);

    // Current analog values (normalised -1..1 after deadzone)
    this.leftX  = 0;
    this.leftY  = 0;
    this.rightX = 0;
    this.rightY = 0;

    this._onConnect    = this._onConnect.bind(this);
    this._onDisconnect = this._onDisconnect.bind(this);
    window.addEventListener('gamepadconnected',    this._onConnect);
    window.addEventListener('gamepaddisconnected', this._onDisconnect);
  }

  // ── Connection ────────────────────────────────────────────────────────────

  _onConnect(e) {
    this._gamepad   = e.gamepad;
    this._connected = true;
    this._bus?.emit('hudLog', { msg: `🎮 Controller connected: ${e.gamepad.id.slice(0,40)}`, color:'#44ff88' });
    this._bus?.emit('gamepadConnected', { id: e.gamepad.id });
  }

  _onDisconnect(e) {
    this._connected = false;
    this._gamepad   = null;
    this._bus?.emit('hudLog', { msg:'🎮 Controller disconnected.', color:'#ff8844' });
  }

  isConnected() { return this._connected; }

  // ── Poll (call every frame) ───────────────────────────────────────────────

  poll() {
    if (!this._connected) return;

    // Re-fetch gamepad each frame (spec requirement)
    const gamepads = navigator.getGamepads?.() ?? [];
    this._gamepad  = gamepads[this._gamepad?.index ?? 0];
    if (!this._gamepad) return;

    const gp = this._gamepad;

    // ── Analog sticks ──────────────────────────────────────────────────────
    this.leftX  = this._applyDeadzone(gp.axes[0] ?? 0);
    this.leftY  = this._applyDeadzone(gp.axes[1] ?? 0);
    this.rightX = this._applyDeadzone(gp.axes[2] ?? 0);
    this.rightY = this._applyDeadzone(gp.axes[3] ?? 0);

    // Inject stick movement into InputManager's virtual axis
    if (this._input) {
      this._input._gamepadAxis = { x: this.leftX, y: this.leftY };
    }

    // ── Buttons (rising edge only) ─────────────────────────────────────────
    const btns = gp.buttons;
    const fire = (key) => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    };

    // Button index → action mapping (standard gamepad layout)
    const btnMap = {
      0: () => this._bus?.emit('mobileAttack'),              // A / Cross  → attack
      1: () => fire('e'),                                     // B / Circle → interact
      2: () => fire('1'),                                     // X / Square → ability 1
      3: () => fire('2'),                                     // Y / Triangle → ability 2
      4: () => fire('3'),                                     // LB / L1 → ability 3
      5: () => fire('4'),                                     // RB / R1 → ability 4
      8: () => fire('m'),                                     // Select / Share → map
      9: () => fire('i'),                                     // Start / Options → inventory
      12: () => fire('k'),                                    // D-up → skill tree
      13: () => fire('c'),                                    // D-down → codex
      14: () => fire('q'),                                    // D-left → quests
      15: () => fire('p'),                                    // D-right → stat screen
    };

    btns.forEach((btn, idx) => {
      const pressed = btn.pressed || btn.value > 0.5;
      const wasPressed = this._prevButtons[idx];
      if (pressed && !wasPressed && btnMap[idx]) {
        btnMap[idx]();
      }
      this._prevButtons[idx] = pressed;
    });

    // ── Right stick → camera rotation ─────────────────────────────────────
    if (Math.abs(this.rightX) > 0.05) {
      this._bus?.emit('gamepadCamera', { dx: this.rightX });
    }
  }

  // ── Deadzone ──────────────────────────────────────────────────────────────

  _applyDeadzone(v) {
    if (Math.abs(v) < this._deadzone) return 0;
    const sign = v > 0 ? 1 : -1;
    return sign * (Math.abs(v) - this._deadzone) / (1 - this._deadzone);
  }

  // ── Accessors ─────────────────────────────────────────────────────────────

  getMovement() { return { x: this.leftX, y: this.leftY }; }
  setDeadzone(d) { this._deadzone = Math.max(0, Math.min(0.5, d)); }

  dispose() {
    window.removeEventListener('gamepadconnected',    this._onConnect);
    window.removeEventListener('gamepaddisconnected', this._onDisconnect);
  }
}
