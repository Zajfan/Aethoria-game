/**
 * server/lobby.js — Session management for Aethoria co-op (CommonJS)
 *
 * Sessions are ephemeral (in-memory). If the server restarts, sessions are
 * gone — players create a new session. This is intentional for a lightweight,
 * self-hosted server.
 *
 * Limits:
 *   - Max 4 players per session (Sacred / Diablo 2 style)
 *   - Session auto-closes when all players disconnect
 *   - Session codes: 6 uppercase alphanumeric chars (no I/O/0/1 ambiguity)
 */

'use strict';

const MAX_PLAYERS = 4;
const CODE_CHARS  = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

// ── LobbyManager ─────────────────────────────────────────────────────────────

class LobbyManager {
  constructor() {
    /** @type {Map<string, Session>} code → session */
    this._sessions = new Map();
  }

  get sessionCount() { return this._sessions.size; }

  /**
   * Create a new session. Returns { code, session }.
   * @param {import('ws').WebSocket} hostWs
   * @param {string} hostName
   */
  createSession(hostWs, hostName) {
    let code;
    do { code = makeCode(); } while (this._sessions.has(code));

    const session = new Session(code, hostWs, hostName);
    this._sessions.set(code, session);
    console.log(`[lobby] session ${code} created by "${hostName}"`);
    return { code, session };
  }

  /**
   * Join an existing session.
   * @returns {{ ok: boolean, error?: string, session?: Session }}
   */
  joinSession(code, ws, playerName) {
    const session = this._sessions.get(code);
    if (!session) return { ok: false, error: 'Session not found.' };
    if (session.isFull())  return { ok: false, error: 'Session is full (max 4 players).' };

    session.addPlayer(ws, playerName);
    console.log(`[lobby] "${playerName}" joined ${code} (${session.playerCount()}/${MAX_PLAYERS})`);
    return { ok: true, session };
  }

  /**
   * Remove a player from their session. Destroys session if empty.
   */
  leave(sessionCode, playerId) {
    const session = this._sessions.get(sessionCode);
    if (!session) return;
    session.removePlayer(playerId);
    console.log(`[lobby] player ${playerId} left session ${sessionCode}`);
    if (session.playerCount() === 0) {
      this._sessions.delete(sessionCode);
      console.log(`[lobby] session ${sessionCode} closed (empty)`);
    }
  }

  getSession(code) {
    return this._sessions.get(code) ?? null;
  }
}

// ── Session ───────────────────────────────────────────────────────────────────

let _nextPlayerId = 1;

class Session {
  constructor(code, hostWs, hostName) {
    this.code    = code;
    this.created = Date.now();
    /** @type {Map<string, object>} id → player */
    this._players = new Map();
    this.addPlayer(hostWs, hostName, true);
  }

  addPlayer(ws, name, isHost = false) {
    const id     = `p${_nextPlayerId++}`;
    const player = { id, name, ws, isHost, joinedAt: Date.now() };
    this._players.set(id, player);
    ws._playerId    = id;
    ws._sessionCode = this.code;
    return player;
  }

  removePlayer(playerId) { this._players.delete(playerId); }

  isFull()       { return this._players.size >= MAX_PLAYERS; }
  playerCount()  { return this._players.size; }

  /** Relay a message to all players except the sender. */
  broadcast(senderId, data) {
    for (const [id, player] of this._players) {
      if (id === senderId) continue;
      if (player.ws.readyState === 1 /* OPEN */) player.ws.send(data);
    }
  }

  /** Relay to every player including the sender. */
  broadcastAll(data) {
    for (const player of this._players.values()) {
      if (player.ws.readyState === 1) player.ws.send(data);
    }
  }

  getRoster() {
    return [...this._players.values()].map(p => ({
      id: p.id, name: p.name, isHost: p.isHost,
    }));
  }
}

module.exports = { LobbyManager };
