/**
 * server/index.js — Aethoria Co-op Server (CommonJS)
 *
 * Lightweight WebSocket relay for 2-4 player co-op sessions.
 * Intentionally NOT an authoritative server — it is a dumb relay.
 * Each client runs the full simulation locally (Diablo 2 / Sacred style).
 *
 * Self-host:  node server/index.js
 * Dev watch:  npm run server:dev
 *
 * Environment:
 *   PORT  — listen port (default 3000)
 *   HOST  — bind address (default 0.0.0.0)
 *
 * Packet protocol (all messages are JSON with a `type` field):
 *
 * Client → Server:
 *   { type: "host",  name }            → create session
 *   { type: "join",  name, code }      → join session
 *   { type: "state", state: {...} }    → relay player state to peers
 *   { type: "event", eventType, payload } → relay game event to peers
 *   { type: "ping" }                   → keepalive
 *
 * Server → Client:
 *   { type: "hosted",  code, playerId, roster }
 *   { type: "joined",  code, playerId, roster }
 *   { type: "roster",  roster }        → sent to all on change
 *   { type: "relay",   from, ...msg }  → relayed peer packet
 *   { type: "left",    playerId }      → peer disconnected
 *   { type: "error",   message }
 *   { type: "pong" }
 */

'use strict';

const { WebSocketServer } = require('ws');
const { LobbyManager }   = require('./lobby.js');

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const HOST = process.env.HOST ?? '0.0.0.0';

const wss   = new WebSocketServer({ port: PORT, host: HOST });
const lobby = new LobbyManager();

console.log(`[aethoria-server] listening on ws://${HOST}:${PORT}`);
console.log('[aethoria-server] max players per session: 4');

// ── Connection handler ────────────────────────────────────────────────────────

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress ?? 'unknown';
  console.log(`[server] connect from ${ip}  (total connections: ${wss.clients.size})`);

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); }
    catch { send(ws, { type: 'error', message: 'Invalid JSON.' }); return; }
    handleMessage(ws, msg);
  });

  ws.on('close', () => onDisconnect(ws));

  ws.on('error', (err) => {
    console.error(`[server] ws error (${ip}):`, err.message);
  });
});

// ── Message router ────────────────────────────────────────────────────────────

function handleMessage(ws, msg) {
  switch (msg.type) {

    case 'host': {
      const name           = sanitizeName(msg.name);
      const { code, session } = lobby.createSession(ws, name);
      send(ws, { type: 'hosted', code, playerId: ws._playerId, roster: session.getRoster() });
      break;
    }

    case 'join': {
      const name   = sanitizeName(msg.name);
      const code   = String(msg.code ?? '').toUpperCase().trim();
      const result = lobby.joinSession(code, ws, name);
      if (!result.ok) { send(ws, { type: 'error', message: result.error }); return; }

      const { session } = result;
      send(ws, { type: 'joined', code, playerId: ws._playerId, roster: session.getRoster() });
      // Notify peers of updated roster
      session.broadcast(ws._playerId, JSON.stringify({ type: 'roster', roster: session.getRoster() }));
      break;
    }

    case 'state':
    case 'event': {
      if (!ws._sessionCode) return;
      const session = lobby.getSession(ws._sessionCode);
      if (!session) return;
      // Tag with sender id so clients can identify who sent it
      const relayed = JSON.stringify({ ...msg, type: 'relay', from: ws._playerId });
      session.broadcast(ws._playerId, relayed);
      break;
    }

    case 'ping':
      send(ws, { type: 'pong' });
      break;

    default:
      send(ws, { type: 'error', message: `Unknown message type: ${msg.type}` });
  }
}

// ── Disconnect cleanup ────────────────────────────────────────────────────────

function onDisconnect(ws) {
  const { _sessionCode, _playerId } = ws;
  if (!_sessionCode || !_playerId) return;

  const session = lobby.getSession(_sessionCode);
  if (session) {
    session.broadcast(_playerId, JSON.stringify({ type: 'left', playerId: _playerId }));
  }
  lobby.leave(_sessionCode, _playerId);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function send(ws, obj) {
  if (ws.readyState === 1 /* OPEN */) ws.send(JSON.stringify(obj));
}

function sanitizeName(raw) {
  return String(raw ?? 'Adventurer').trim().slice(0, 24) || 'Adventurer';
}

// ── Periodic stats log ────────────────────────────────────────────────────────

setInterval(() => {
  if (wss.clients.size > 0 || lobby.sessionCount > 0) {
    console.log(`[server] sessions: ${lobby.sessionCount}  connections: ${wss.clients.size}`);
  }
}, 60_000);
