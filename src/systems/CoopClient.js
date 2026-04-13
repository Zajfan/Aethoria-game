/**
 * CoopClient.js — Client-side co-op networking for Aethoria
 *
 * Connects to the Aethoria co-op server (server/index.js) via WebSocket.
 * This is a relay client: the game runs its full simulation locally and this
 * class synchronises player state with peers (Diablo 2 / Sacred style).
 *
 * Usage:
 *   const coop = new CoopClient(eventBus);
 *   await coop.host('Alice');                     // creates a session
 *   await coop.join('Bob', 'ABC123');             // joins an existing session
 *
 *   // Each frame, send your own state:
 *   coop.sendState({ x, z, hp, animation });
 *
 *   // Listen for peer updates:
 *   eventBus.on('coop:peerState', ({ from, state }) => { ... });
 *   eventBus.on('coop:peerLeft',  ({ playerId })    => { ... });
 *   eventBus.on('coop:roster',    (roster)          => { ... });
 */

const RECONNECT_DELAY_MS = 3000;
const PING_INTERVAL_MS   = 20_000;
const STATE_THROTTLE_MS  = 50;   // max 20 state updates/sec per player

export class CoopClient {
  /**
   * @param {import('../engine/EventBus.js').EventBus} eventBus
   */
  constructor(eventBus) {
    this.eventBus = eventBus;

    /** @type {WebSocket|null} */
    this._ws = null;

    this.isConnected  = false;
    this.isHost       = false;
    this.sessionCode  = null;
    this.playerId     = null;
    this.playerName   = null;
    this.serverUrl    = null;

    /** @type {Map<string, object>} playerId → last known state */
    this.remotePlayers = new Map();

    this._pingTimer    = null;
    this._lastStateSent = 0;

    // Reconnect state
    this._reconnectTimer  = null;
    this._intentCode      = null; // set when joining, used for reconnect
    this._intentMode      = null; // 'host' | 'join'
    this._intentName      = null;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Connect to the server and create a new session.
   * @param {string} serverUrl  WebSocket URL, e.g. "ws://localhost:3000"
   * @param {string} playerName
   * @returns {Promise<string>} resolves with the 6-char session code
   */
  host(serverUrl, playerName) {
    this._intentMode = 'host';
    this._intentName = playerName;
    this.serverUrl   = serverUrl;
    return this._connect().then(() => {
      this._send({ type: 'host', name: playerName });
      return new Promise((resolve, reject) => {
        this._onHosted = resolve;
        this._onError  = reject;
      });
    });
  }

  /**
   * Connect to the server and join an existing session.
   * @param {string} serverUrl
   * @param {string} playerName
   * @param {string} code        6-char session code
   * @returns {Promise<void>}
   */
  join(serverUrl, playerName, code) {
    this._intentMode = 'join';
    this._intentName = playerName;
    this._intentCode = code.toUpperCase().trim();
    this.serverUrl   = serverUrl;
    return this._connect().then(() => {
      this._send({ type: 'join', name: playerName, code: this._intentCode });
      return new Promise((resolve, reject) => {
        this._onJoined = resolve;
        this._onError  = reject;
      });
    });
  }

  /**
   * Send the local player's position/state to all peers.
   * Throttled to STATE_THROTTLE_MS — safe to call every frame.
   * @param {object} state  { x, y, z, rotation, hp, animation, ... }
   */
  sendState(state) {
    if (!this.isConnected) return;
    const now = performance.now();
    if (now - this._lastStateSent < STATE_THROTTLE_MS) return;
    this._lastStateSent = now;
    this._send({ type: 'state', state });
  }

  /**
   * Send a game event to all peers (attack hit, item pickup, NPC kill, etc.)
   * @param {string} eventType
   * @param {object} payload
   */
  sendEvent(eventType, payload) {
    if (!this.isConnected) return;
    this._send({ type: 'event', eventType, payload });
  }

  /** Gracefully close the connection. */
  disconnect() {
    this._clearTimers();
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
    this.isConnected  = false;
    this.sessionCode  = null;
    this.playerId     = null;
    this.remotePlayers.clear();
    this.eventBus.emit('coop:disconnected');
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  _connect() {
    return new Promise((resolve, reject) => {
      if (this._ws && this._ws.readyState === WebSocket.OPEN) {
        resolve(); return;
      }

      try {
        this._ws = new WebSocket(this.serverUrl);
      } catch (err) {
        reject(new Error(`Invalid server URL: ${this.serverUrl}`));
        return;
      }

      this._ws.onopen = () => {
        this.isConnected = true;
        this._startPing();
        console.log('[coop] connected to', this.serverUrl);
        this.eventBus.emit('coop:connected', { serverUrl: this.serverUrl });
        resolve();
      };

      this._ws.onerror = (err) => {
        console.error('[coop] WebSocket error', err);
        if (!this.isConnected) reject(new Error('Connection failed.'));
      };

      this._ws.onclose = () => {
        this.isConnected = false;
        this._clearTimers();
        console.log('[coop] disconnected');
        this.eventBus.emit('coop:disconnected');
        // Attempt automatic reconnect
        this._scheduleReconnect();
      };

      this._ws.onmessage = (event) => {
        try {
          this._handleMessage(JSON.parse(event.data));
        } catch (e) {
          console.warn('[coop] bad message', e);
        }
      };
    });
  }

  _handleMessage(msg) {
    switch (msg.type) {

      case 'hosted':
        this.playerId    = msg.playerId;
        this.sessionCode = msg.code;
        this.isHost      = true;
        console.log(`[coop] session created: ${msg.code}`);
        this.eventBus.emit('coop:hosted', { code: msg.code, roster: msg.roster });
        // Expose session code in the co-op modal if it's still open
        const codeEl = document.getElementById('coop-code-display');
        if (codeEl) { codeEl.textContent = msg.code; document.getElementById('coop-host-code').style.display = 'block'; }
        if (this._onHosted) { this._onHosted(msg.code); this._onHosted = null; }
        break;

      case 'joined':
        this.playerId    = msg.playerId;
        this.sessionCode = msg.code;
        this.isHost      = false;
        console.log(`[coop] joined session: ${msg.code} as ${msg.playerId}`);
        this.eventBus.emit('coop:joined', { code: msg.code, roster: msg.roster });
        if (this._onJoined) { this._onJoined(); this._onJoined = null; }
        break;

      case 'roster':
        this.eventBus.emit('coop:roster', msg.roster);
        break;

      case 'relay': {
        const { from, type: _type, ...rest } = msg;
        if (rest.state) {
          this.remotePlayers.set(from, rest.state);
          this.eventBus.emit('coop:peerState', { from, state: rest.state });
        } else if (rest.eventType) {
          this.eventBus.emit('coop:peerEvent', { from, eventType: rest.eventType, payload: rest.payload });
        }
        break;
      }

      case 'left':
        this.remotePlayers.delete(msg.playerId);
        this.eventBus.emit('coop:peerLeft', { playerId: msg.playerId });
        break;

      case 'error':
        console.error('[coop] server error:', msg.message);
        this.eventBus.emit('coop:error', msg.message);
        if (this._onError) { this._onError(new Error(msg.message)); this._onError = null; }
        break;

      case 'pong':
        // keepalive acknowledged
        break;

      default:
        console.warn('[coop] unknown message type:', msg.type);
    }
  }

  _send(obj) {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(obj));
    }
  }

  _startPing() {
    this._clearTimers();
    this._pingTimer = setInterval(() => {
      this._send({ type: 'ping' });
    }, PING_INTERVAL_MS);
  }

  _clearTimers() {
    if (this._pingTimer)     { clearInterval(this._pingTimer);  this._pingTimer = null; }
    if (this._reconnectTimer){ clearTimeout(this._reconnectTimer); this._reconnectTimer = null; }
  }

  _scheduleReconnect() {
    if (this._reconnectTimer || !this._intentMode) return;
    console.log(`[coop] reconnecting in ${RECONNECT_DELAY_MS}ms…`);
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      if (this._intentMode === 'host') {
        this.host(this.serverUrl, this._intentName).catch(() => {});
      } else if (this._intentMode === 'join' && this._intentCode) {
        this.join(this.serverUrl, this._intentName, this._intentCode).catch(() => {});
      }
    }, RECONNECT_DELAY_MS);
  }
}
