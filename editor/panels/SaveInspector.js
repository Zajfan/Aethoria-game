/**
 * SaveInspector.js
 *
 * Reads the Aethoria IndexedDB save (slot1), renders it as an editable
 * live inspector, and writes changes back to the same IndexedDB store.
 *
 * Sections:
 *   • Player Stats  — editable hp/maxHp/attack/defense/speed/gold/level/xp/mana
 *   • Inventory     — item quantities, editable
 *   • Equipment     — current equipped slots
 *   • Skills        — skill-point allocations
 *   • Gathering     — XP per skill + derived level
 *   • Slayer        — current task + points + streak
 *   • Quests        — active + completed quest list
 *   • Story         — act, flags, shards
 *   • Prestige      — tier, perks
 *   • Quick Presets — one-click test helpers
 */

import { toast } from '../EditorApp.js';
import { CONFIG } from '../../src/config.js';

const DB_NAME = 'AethoriaDB';
const STORE   = 'saves';
const SLOT    = 'slot1';

// ── IndexedDB helpers ─────────────────────────────────────────────────────

async function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = e => res(e.target.result);
    req.onerror   = () => rej(req.error);
  });
}

async function loadSave() {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx  = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(SLOT);
    req.onsuccess = () => res(req.result ?? null);
    req.onerror   = () => rej(req.error);
  });
}

async function writeSave(data) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx  = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).put({ id: SLOT, ts: Date.now(), ...data });
    req.onsuccess = () => res(true);
    req.onerror   = () => rej(req.error);
  });
}

// ── XP helpers (mirrors GatheringSystem) ─────────────────────────────────

const XP_TABLE = CONFIG.GATHERING_XP_TABLE ?? [];

function xpForLevel(lvl) {
  return XP_TABLE[Math.min(lvl, 99)] ?? Math.floor(Math.pow(lvl, 2.5) * 8);
}

function levelFromXP(xp) {
  for (let l = 99; l >= 1; l--) if (xp >= xpForLevel(l)) return l;
  return 1;
}

function gatherProgress(xp) {
  const lvl  = levelFromXP(xp);
  if (lvl >= 99) return 1;
  const curr = xpForLevel(lvl);
  const next = xpForLevel(lvl + 1);
  return (xp - curr) / (next - curr);
}

// ── SaveInspector class ───────────────────────────────────────────────────

export class SaveInspector {
  constructor(container) {
    this._el   = container;
    this._save = null;   // raw save object from IndexedDB
    this._dirty = false; // unsaved changes

    this._render();
    this._load();
  }

  onActivate() { this._load(); }

  // ── Top-level layout ──────────────────────────────────────────────────

  _render() {
    this._el.innerHTML = `
      <div class="panel-header">
        <h2>💾 Save Inspector</h2>
        <span class="desc">Read &amp; edit the active IndexedDB save (slot1)</span>
        <div class="actions">
          <button class="btn" id="si-reload">↺ Reload</button>
          <button class="btn success" id="si-write">✔ Write Save</button>
          <button class="btn danger"  id="si-delete">✕ Delete Save</button>
        </div>
      </div>
      <div class="panel-body" id="si-body">
        <p style="color:var(--text-dim);text-align:center;margin-top:60px;">Loading save…</p>
      </div>
    `;

    this._el.querySelector('#si-reload').addEventListener('click', () => this._load());
    this._el.querySelector('#si-write').addEventListener('click',  () => this._write());
    this._el.querySelector('#si-delete').addEventListener('click', () => this._deleteSave());
  }

  // ── Load ──────────────────────────────────────────────────────────────

  async _load() {
    try {
      const raw = await loadSave();
      if (!raw) {
        document.getElementById('si-body').innerHTML =
          `<p style="color:var(--text-dim);text-align:center;margin-top:60px;">
            No save found — start the game first to create one.
          </p>`;
        document.getElementById('save-status').textContent = 'No save';
        document.getElementById('save-status').className  = 'status-pill warn';
        return;
      }
      this._save = raw;
      this._dirty = false;
      this._renderSave();
      const ts = new Date(raw.ts).toLocaleString();
      document.getElementById('save-status').textContent = `Saved ${ts}`;
      document.getElementById('save-status').className  = 'status-pill ok';
    } catch (e) {
      toast(`Load failed: ${e.message}`, 'err');
    }
  }

  // ── Write ─────────────────────────────────────────────────────────────

  async _write() {
    if (!this._save) { toast('Nothing to write — load a save first.', 'err'); return; }
    this._collectEdits();
    try {
      await writeSave(this._save);
      toast('Save written to IndexedDB', 'ok');
      this._dirty = false;
      document.getElementById('save-status').textContent = `Written ${new Date().toLocaleTimeString()}`;
    } catch (e) {
      toast(`Write failed: ${e.message}`, 'err');
    }
  }

  async _deleteSave() {
    if (!confirm('Delete the save slot? This cannot be undone.')) return;
    const db  = await openDB();
    await new Promise((res, rej) => {
      const tx  = db.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).delete(SLOT);
      req.onsuccess = res;
      req.onerror   = () => rej(req.error);
    });
    this._save = null;
    toast('Save deleted', 'ok');
    await this._load();
  }

  // ── Collect edits from DOM → this._save ──────────────────────────────

  _collectEdits() {
    const s = this._save;

    // Stats
    for (const k of ['hp','maxHp','attack','defense','speed','gold','level','xp','mana','maxMana']) {
      const el = document.getElementById(`si-stat-${k}`);
      if (el && s.stats) {
        const v = parseFloat(el.value);
        if (!isNaN(v)) s.stats[k] = v;
      }
    }

    // Inventory
    document.querySelectorAll('[data-inv-key]').forEach(el => {
      const key = el.dataset.invKey;
      const qty = parseInt(el.value);
      if (!isNaN(qty) && s.inventory) s.inventory[key] = Math.max(0, qty);
    });

    // Gathering XP
    for (const skill of ['mining','woodcut','fishing','herbalism','hunting']) {
      const el = document.getElementById(`si-gather-${skill}`);
      if (el && s.gathering?.xp) {
        const v = parseInt(el.value);
        if (!isNaN(v)) s.gathering.xp[skill] = Math.max(0, v);
      }
    }

    // Slayer
    const slPts = document.getElementById('si-slayer-pts');
    if (slPts && s.slayer) s.slayer.points = parseInt(slPts.value) || 0;
  }

  // ── Render all sections ───────────────────────────────────────────────

  _renderSave() {
    const s = this._save;
    const body = document.getElementById('si-body');

    body.innerHTML = `
      ${this._sectionPresets()}
      <div class="grid-2">
        <div>
          ${this._sectionStats(s.stats)}
          ${this._sectionGathering(s.gathering)}
          ${this._sectionSlayer(s.slayer)}
        </div>
        <div>
          ${this._sectionInventory(s.inventory, s.equipment)}
          ${this._sectionStory(s.story, s.shards)}
          ${this._sectionQuests(s.quests)}
        </div>
      </div>
    `;

    this._wirePresets();
  }

  // ── Quick Presets ─────────────────────────────────────────────────────

  _sectionPresets() {
    return `
      <div class="card" style="margin-bottom:20px;">
        <div class="card-title">⚡ Quick Presets</div>
        <div class="card-body" style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn" data-preset="maxgold">Max Gold (99999)</button>
          <button class="btn" data-preset="maxhp">Full HP</button>
          <button class="btn" data-preset="maxmana">Full Mana</button>
          <button class="btn" data-preset="level20">Set Level 20</button>
          <button class="btn" data-preset="level50">Set Level 50</button>
          <button class="btn" data-preset="level99">Set Level 99</button>
          <button class="btn" data-preset="fillInventory">Fill Potions ×99</button>
          <button class="btn" data-preset="gatherMax">Max Gathering XP</button>
          <button class="btn" data-preset="slayerPts">+500 Slayer Pts</button>
          <button class="btn danger" data-preset="wipeQuests">Reset Quests</button>
        </div>
      </div>
    `;
  }

  _wirePresets() {
    document.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._collectEdits();
        this._applyPreset(btn.dataset.preset);
        this._renderSave();
        toast(`Preset applied: ${btn.dataset.preset}`, 'ok');
      });
    });
  }

  _applyPreset(id) {
    if (!this._save) return;
    const s = this._save;

    switch (id) {
      case 'maxgold':
        s.stats.gold = 99999; break;
      case 'maxhp':
        s.stats.hp = s.stats.maxHp ?? 100; break;
      case 'maxmana':
        s.stats.mana = s.stats.maxMana ?? 100; break;
      case 'level20':
        s.stats.level = 20;
        s.stats.xp    = 20 * (CONFIG.PLAYER?.XP_PER_LEVEL ?? 100); break;
      case 'level50':
        s.stats.level = 50;
        s.stats.xp    = 50 * (CONFIG.PLAYER?.XP_PER_LEVEL ?? 100); break;
      case 'level99':
        s.stats.level = 99;
        s.stats.xp    = 99 * (CONFIG.PLAYER?.XP_PER_LEVEL ?? 100); break;
      case 'fillInventory':
        if (!s.inventory) s.inventory = {};
        s.inventory.potion  = 99;
        s.inventory.elixir  = 99;
        s.inventory.antidote = 99; break;
      case 'gatherMax':
        if (!s.gathering) s.gathering = { xp: {} };
        if (!s.gathering.xp) s.gathering.xp = {};
        for (const sk of ['mining','woodcut','fishing','herbalism','hunting']) {
          s.gathering.xp[sk] = xpForLevel(99);
        }
        break;
      case 'slayerPts':
        if (!s.slayer) s.slayer = { points: 0 };
        s.slayer.points = (s.slayer.points ?? 0) + 500; break;
      case 'wipeQuests':
        if (s.quests) { s.quests.active = []; s.quests.done = []; }
        break;
    }
    this._dirty = true;
  }

  // ── Stats section ─────────────────────────────────────────────────────

  _sectionStats(stats = {}) {
    const fields = [
      ['hp',      'HP',      stats.hp      ?? '—'],
      ['maxHp',   'Max HP',  stats.maxHp   ?? '—'],
      ['mana',    'Mana',    stats.mana    ?? '—'],
      ['maxMana', 'Max Mana',stats.maxMana ?? '—'],
      ['attack',  'Attack',  stats.attack  ?? '—'],
      ['defense', 'Defense', stats.defense ?? '—'],
      ['speed',   'Speed',   stats.speed   ?? '—'],
      ['gold',    'Gold',    stats.gold    ?? 0],
      ['level',   'Level',   stats.level   ?? 1],
      ['xp',      'XP',      stats.xp      ?? 0],
    ];

    const rows = fields.map(([k, label, val]) => `
      <div class="field">
        <label>${label}</label>
        <input id="si-stat-${k}" type="number" value="${val}" />
      </div>
    `).join('');

    const cls = stats.class ?? stats.playerClass ?? '—';

    return `
      <div class="card">
        <div class="card-title">
          ⚔ Player Stats
          <span class="badge hi">${cls}</span>
        </div>
        <div class="card-body">
          <div class="grid-2">${rows}</div>
        </div>
      </div>
    `;
  }

  // ── Inventory section ─────────────────────────────────────────────────

  _sectionInventory(inventory = {}, equipment = {}) {
    const eqSlots = Object.entries(equipment)
      .filter(([, v]) => v)
      .map(([slot, key]) => `
        <div style="display:flex;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid var(--bg3)">
          <span style="color:var(--text-dim);font-size:10px;min-width:70px;text-transform:uppercase">${slot}</span>
          <span style="color:var(--gold)">${CONFIG.ITEMS?.[key]?.name ?? key}</span>
        </div>
      `).join('') || '<span style="color:var(--text-dim)">Nothing equipped</span>';

    const invRows = Object.entries(inventory)
      .filter(([, qty]) => qty > 0)
      .map(([key, qty]) => {
        const def = CONFIG.ITEMS?.[key] ?? {};
        return `
          <tr>
            <td>${def.name ?? key}</td>
            <td style="color:var(--text-dim);font-size:10px">${def.type ?? '—'}</td>
            <td><input data-inv-key="${key}" type="number" value="${qty}" min="0" max="9999" style="width:64px" /></td>
          </tr>
        `;
      }).join('') || '<tr><td colspan="3" style="color:var(--text-dim)">Empty</td></tr>';

    return `
      <div class="card">
        <div class="card-title">🎒 Equipment</div>
        <div class="card-body">${eqSlots}</div>
      </div>
      <div class="card">
        <div class="card-title">📦 Inventory</div>
        <div class="card-body" style="padding:0">
          <table class="data-table">
            <thead><tr><th>Item</th><th>Type</th><th>Qty</th></tr></thead>
            <tbody>${invRows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ── Gathering section ─────────────────────────────────────────────────

  _sectionGathering(gathering = {}) {
    const xpData = gathering?.xp ?? {};
    const skills = [
      { key: 'mining',    name: 'Mining',    icon: '⛏' },
      { key: 'woodcut',   name: 'Woodcut',   icon: '🪓' },
      { key: 'fishing',   name: 'Fishing',   icon: '🎣' },
      { key: 'herbalism', name: 'Herbalism', icon: '🌿' },
      { key: 'hunting',   name: 'Hunting',   icon: '🏹' },
    ];

    const rows = skills.map(({ key, name, icon }) => {
      const xp  = xpData[key] ?? 0;
      const lvl = levelFromXP(xp);
      const pct = (gatherProgress(xp) * 100).toFixed(1);
      return `
        <div class="xp-bar-wrap">
          <span class="xp-bar-label">${icon} ${name}</span>
          <div class="xp-bar-track">
            <div class="xp-bar-fill" style="width:${pct}%"></div>
          </div>
          <span style="font-size:11px;color:var(--gold);min-width:30px;text-align:center">Lv${lvl}</span>
          <input id="si-gather-${key}" type="number" value="${xp}" min="0"
            style="width:80px;background:var(--bg3);border:1px solid var(--border);
                   border-radius:4px;color:var(--text);font-family:var(--font-mono);
                   font-size:11px;padding:3px 6px;outline:none;" />
        </div>
      `;
    }).join('');

    return `
      <div class="card">
        <div class="card-title">⛏ Gathering Skills</div>
        <div class="card-body">${rows}</div>
      </div>
    `;
  }

  // ── Slayer section ────────────────────────────────────────────────────

  _sectionSlayer(slayer = {}) {
    const task = slayer?.currentTask;
    const taskHtml = task
      ? `<div style="color:var(--gold)">
           ${task.targetLabel} — ${task.progress}/${task.count} killed
           <span class="badge">${task.pts} pts</span>
           ${task.streakBonus ? '<span class="badge hi">STREAK BONUS</span>' : ''}
         </div>`
      : `<span style="color:var(--text-dim)">No active task</span>`;

    return `
      <div class="card">
        <div class="card-title">⚔ Slayer</div>
        <div class="card-body">
          <div class="grid-2" style="margin-bottom:10px">
            <div class="field">
              <label>Points</label>
              <input id="si-slayer-pts" type="number" value="${slayer?.points ?? 0}" />
            </div>
            <div>
              <div style="font-size:10px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px">Streak</div>
              <div style="font-size:20px;color:var(--text-head)">${slayer?.streak ?? 0}
                <span style="font-size:11px;color:var(--text-dim)"> / ${slayer?.tasksTotal ?? 0} done</span>
              </div>
            </div>
          </div>
          <div style="font-size:10px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">Current Task</div>
          ${taskHtml}
        </div>
      </div>
    `;
  }

  // ── Story / Act section ───────────────────────────────────────────────

  _sectionStory(story = {}, shardsCount) {
    const act    = story?.act ?? 0;
    const shards = story?.shards ?? shardsCount ?? 0;
    const flags  = story?.flags ?? {};
    const flagList = Object.entries(flags)
      .filter(([, v]) => v)
      .map(([k]) => `<span class="badge" style="margin:2px">${k}</span>`)
      .join('') || '<span style="color:var(--text-dim)">none</span>';

    return `
      <div class="card">
        <div class="card-title">📖 Story Progress</div>
        <div class="card-body">
          <div style="display:flex;gap:16px;margin-bottom:12px">
            <div class="stat-chip">
              <span class="val">${act}</span>
              <span class="lbl">Act</span>
            </div>
            <div class="stat-chip">
              <span class="val">${shards}</span>
              <span class="lbl">Shards</span>
            </div>
            <div class="stat-chip">
              <span class="val">${(story?.activeStory ?? []).length}</span>
              <span class="lbl">Active</span>
            </div>
            <div class="stat-chip">
              <span class="val">${(story?.doneSide ?? []).length}</span>
              <span class="lbl">Side Done</span>
            </div>
          </div>
          <div style="font-size:10px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">Story Flags</div>
          <div style="line-height:2">${flagList}</div>
        </div>
      </div>
    `;
  }

  // ── Quests section ────────────────────────────────────────────────────

  _sectionQuests(quests = {}) {
    const active = quests?.active ?? [];
    const done   = (quests?.done ?? []).slice(-10).reverse();

    const activeRows = active.map(q => `
      <div class="quest-row">
        <div class="quest-dot active"></div>
        <div class="quest-title">${q.title ?? q.id ?? '?'}</div>
        <div class="quest-prog">${q.progress ?? 0}/${q.needed ?? 1}</div>
      </div>
    `).join('') || '<p style="color:var(--text-dim);font-size:11px">No active quests</p>';

    const doneRows = done.map(q => `
      <div class="quest-row">
        <div class="quest-dot done"></div>
        <div class="quest-title" style="color:var(--text-dim)">${q.title ?? q.id ?? '?'}</div>
        <div class="quest-prog" style="color:var(--green)">Done</div>
      </div>
    `).join('') || '<p style="color:var(--text-dim);font-size:11px">None completed</p>';

    return `
      <div class="card">
        <div class="card-title">📜 Quests
          <span class="badge">${active.length} active</span>
          <span class="badge">${quests?.done?.length ?? 0} done</span>
        </div>
        <div class="card-body">
          <div style="font-size:10px;color:var(--accent);text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">Active</div>
          ${activeRows}
          <div style="font-size:10px;color:var(--green);text-transform:uppercase;letter-spacing:.8px;margin:12px 0 6px">Last 10 Completed</div>
          ${doneRows}
        </div>
      </div>
    `;
  }
}
