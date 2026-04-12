/**
 * ConfigEditor.js
 *
 * Inline editor over CONFIG data.  Changes are stored as a JSON "diff" in
 * localStorage under the key 'aethoria_config_overrides'.  The game can
 * optionally load and merge this diff at startup (opt-in — game is unmodified
 * by default).
 *
 * Tabs: Enemies · Items · NPCs · Slayer Tasks · Classes
 *
 * Each tab renders an editable data table.  Cells that differ from the
 * original CONFIG value are highlighted.  An Export button lets you download
 * the full diff as a .json file.
 */

import { toast  } from '../EditorApp.js';
import { CONFIG } from '../../src/config.js';

const LS_KEY = 'aethoria_config_overrides';

// ── Deep-clone helper ─────────────────────────────────────────────────────
function clone(o) { return JSON.parse(JSON.stringify(o)); }

// ── Load overrides from localStorage ─────────────────────────────────────
function loadOverrides() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveOverrides(ov) {
  localStorage.setItem(LS_KEY, JSON.stringify(ov));
}

// ── Tab definitions ───────────────────────────────────────────────────────

const TABS = [
  {
    id: 'enemies',
    label: 'Enemies',
    icon: '👹',
    source: () => CONFIG.ENEMY_TYPES,
    columns: [
      { key: 'name',  label: 'Name',    editable: true  },
      { key: 'hp',    label: 'HP',      editable: true,  type: 'num' },
      { key: 'atk',   label: 'Atk',     editable: true,  type: 'num' },
      { key: 'def',   label: 'Def',     editable: true,  type: 'num' },
      { key: 'xp',    label: 'XP',      editable: true,  type: 'num' },
      { key: 'spd',   label: 'Spd',     editable: true,  type: 'num' },
      { key: 'sz',    label: 'Size',    editable: true,  type: 'num' },
      { key: '_flags', label: 'Flags',  editable: false, render: (row) => _enemyFlags(row) },
    ],
  },
  {
    id: 'items',
    label: 'Items',
    icon: '🎒',
    source: () => CONFIG.ITEMS ?? {},
    columns: [
      { key: 'name',   label: 'Name',    editable: true  },
      { key: 'type',   label: 'Type',    editable: true  },
      { key: 'value',  label: 'Value',   editable: true,  type: 'num' },
      { key: 'effect', label: 'Effect',  editable: false, render: (row) => row.effect ?? '—' },
      { key: 'power',  label: 'Power',   editable: true,  type: 'num' },
    ],
  },
  {
    id: 'npcs',
    label: 'NPCs',
    icon: '🧙',
    source: () => {
      const out = {};
      (CONFIG.NPCS_DATA ?? []).forEach((n, i) => { out[`npc_${i}`] = n; });
      return out;
    },
    columns: [
      { key: 'name',  label: 'Name',  editable: true  },
      { key: 'role',  label: 'Role',  editable: true  },
      { key: 'bio',   label: 'Bio',   editable: false, render: (row) =>
          `<span title="${row.bio ?? ''}" style="color:var(--text-dim);font-size:10px">
            ${(row.bio ?? '').slice(0, 60)}…
          </span>`
      },
    ],
  },
  {
    id: 'slayer',
    label: 'Slayer Tasks',
    icon: '⚔',
    source: () => {
      const out = {};
      (CONFIG.SLAYER_TASKS ?? []).forEach((t, i) => { out[`task_${i}`] = t; });
      return out;
    },
    columns: [
      { key: 'target',   label: 'Target',    editable: true },
      { key: 'minLevel', label: 'Min Level', editable: true, type: 'num' },
      { key: 'pts',      label: 'Points',    editable: true, type: 'num' },
      { key: 'count',    label: 'Count Range', editable: false,
        render: (row) => `[${(row.count ?? []).join(', ')}]` },
    ],
  },
  {
    id: 'classes',
    label: 'Classes',
    icon: '🏹',
    source: () => CONFIG.CLASSES ?? {},
    columns: [
      { key: 'name',          label: 'Name',     editable: true  },
      { key: 'description',   label: 'Desc',     editable: false,
        render: (row) => `<span style="color:var(--text-dim);font-size:10px">${(row.description ?? '').slice(0, 50)}</span>` },
      { key: 'startHp',       label: 'HP',       editable: true,  type: 'num' },
      { key: 'startAttack',   label: 'Atk',      editable: true,  type: 'num' },
      { key: 'startDefense',  label: 'Def',      editable: true,  type: 'num' },
      { key: 'xpMult',        label: 'XP Mult',  editable: true,  type: 'num' },
    ],
  },
];

// ── Enemy flags renderer ──────────────────────────────────────────────────

function _enemyFlags(row) {
  const tags = [];
  if (row.void_touch) tags.push('<span class="tag tag-void">void</span>');
  if (row.ranged)     tags.push('<span class="tag tag-ranged">ranged</span>');
  if (row.burn)       tags.push('<span class="tag tag-burn">burn</span>');
  if (row.freeze)     tags.push('<span class="tag tag-freeze">freeze</span>');
  if (row.poison)     tags.push('<span class="tag tag-poison">poison</span>');
  if (row.ethereal)   tags.push('<span class="tag" style="background:#112233;color:#88ccff">ethereal</span>');
  if (row.stealth)    tags.push('<span class="tag" style="background:#1a1a2e;color:#aaaacc">stealth</span>');
  if (row.berserk)    tags.push('<span class="tag" style="background:#330000;color:#ff8844">berserk</span>');
  if (row.drain)      tags.push('<span class="tag" style="background:#220033;color:#cc44cc">drain</span>');
  return tags.join('') || '<span style="color:var(--text-dim)">—</span>';
}

// ── ConfigEditor class ────────────────────────────────────────────────────

export class ConfigEditor {
  constructor(container) {
    this._el        = container;
    this._overrides = loadOverrides();
    this._originals = {};    // section id → original data clone
    this._activeTab = 'enemies';

    // Pre-clone originals for dirty-checking
    TABS.forEach(tab => {
      this._originals[tab.id] = clone(tab.source());
    });

    this._render();
  }

  // ── Shell ─────────────────────────────────────────────────────────────

  _render() {
    this._el.innerHTML = `
      <div class="panel-header">
        <h2>⚙ Config Editor</h2>
        <span class="desc">Edit game data · changes stored in localStorage</span>
        <div class="actions">
          <button class="btn" id="ce-clear">Clear Overrides</button>
          <button class="btn success" id="ce-export">↓ Export JSON</button>
          <button class="btn primary" id="ce-apply">✔ Apply to localStorage</button>
        </div>
      </div>
      <div class="tab-bar" id="ce-tabs"></div>
      <div class="panel-body" style="padding:0" id="ce-body"></div>
    `;

    this._buildTabs();
    this._el.querySelector('#ce-apply').addEventListener('click',  () => this._applyAll());
    this._el.querySelector('#ce-export').addEventListener('click', () => this._exportJSON());
    this._el.querySelector('#ce-clear').addEventListener('click',  () => this._clearOverrides());

    this._switchTab(this._activeTab);
  }

  _buildTabs() {
    const bar = document.getElementById('ce-tabs');
    bar.innerHTML = TABS.map(t => `
      <button class="tab-btn ${t.id === this._activeTab ? 'active' : ''}" data-tab="${t.id}">
        ${t.icon} ${t.label}
      </button>
    `).join('');
    bar.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this._switchTab(btn.dataset.tab));
    });
  }

  _switchTab(id) {
    this._activeTab = id;
    // Update active state
    document.querySelectorAll('#ce-tabs .tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === id);
    });
    const tab = TABS.find(t => t.id === id);
    if (tab) this._renderTab(tab);
  }

  // ── Tab content ───────────────────────────────────────────────────────

  _renderTab(tab) {
    const body = document.getElementById('ce-body');
    const data = tab.source();
    const ovSection = this._overrides[tab.id] ?? {};

    const headerRow = `<tr>${tab.columns.map(c => `<th>${c.label}</th>`).join('')}</tr>`;

    const dataRows = Object.entries(data).map(([rowKey, rowData]) => {
      const ov = ovSection[rowKey] ?? {};
      const merged = { ...rowData, ...ov };

      const cells = tab.columns.map(col => {
        if (!col.editable) {
          return `<td>${col.render ? col.render(merged) : (merged[col.key] ?? '—')}</td>`;
        }
        const orig = this._originals[tab.id]?.[rowKey]?.[col.key];
        const val  = merged[col.key] ?? orig ?? '';
        const dirty = String(val) !== String(orig);
        return `<td>
          <input
            type="${col.type === 'num' ? 'number' : 'text'}"
            value="${val}"
            data-tab="${tab.id}"
            data-row="${rowKey}"
            data-col="${col.key}"
            style="${dirty ? 'color:var(--gold)' : ''}"
          />
        </td>`;
      }).join('');

      return `<tr data-rowkey="${rowKey}">${cells}</tr>`;
    }).join('');

    // Build a label for the first column header
    const firstKey = tab.columns[0]?.key ?? 'id';

    body.innerHTML = `
      <div style="padding:12px 20px;">
        <div class="filter-bar">
          <input id="ce-filter" placeholder="Filter rows…" />
          <span style="font-size:11px;color:var(--text-dim)">${Object.keys(data).length} entries</span>
        </div>
        <div class="table-scroll">
          <table class="data-table" id="ce-table">
            <thead>${headerRow}</thead>
            <tbody>${dataRows}</tbody>
          </table>
        </div>
        <div style="margin-top:14px;">
          <div style="font-size:10px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">
            Pending overrides for this section
          </div>
          <div class="diff-area" id="ce-diff">
            ${Object.keys(ovSection).length === 0
              ? '(none)'
              : JSON.stringify(ovSection, null, 2)}
          </div>
        </div>
      </div>
    `;

    // Wire filter
    document.getElementById('ce-filter').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('#ce-table tbody tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });

    // Wire cell edits
    document.querySelectorAll('#ce-table input[data-row]').forEach(input => {
      input.addEventListener('change', () => {
        this._recordEdit(
          input.dataset.tab,
          input.dataset.row,
          input.dataset.col,
          input.value,
        );
        // Highlight dirty cells
        const orig = this._originals[input.dataset.tab]?.[input.dataset.row]?.[input.dataset.col];
        input.style.color = String(input.value) !== String(orig) ? 'var(--gold)' : '';
        this._updateDiff(tab);
      });
    });
  }

  // ── Override tracking ─────────────────────────────────────────────────

  _recordEdit(tabId, rowKey, colKey, rawValue) {
    const tab = TABS.find(t => t.id === tabId);
    const col = tab?.columns.find(c => c.key === colKey);

    const value = col?.type === 'num' ? parseFloat(rawValue) : rawValue;

    if (!this._overrides[tabId])        this._overrides[tabId] = {};
    if (!this._overrides[tabId][rowKey]) this._overrides[tabId][rowKey] = {};
    this._overrides[tabId][rowKey][colKey] = value;

    // Remove if equal to original
    const orig = this._originals[tabId]?.[rowKey]?.[colKey];
    if (String(value) === String(orig)) {
      delete this._overrides[tabId][rowKey][colKey];
      if (Object.keys(this._overrides[tabId][rowKey]).length === 0)
        delete this._overrides[tabId][rowKey];
      if (Object.keys(this._overrides[tabId]).length === 0)
        delete this._overrides[tabId];
    }
  }

  _updateDiff(tab) {
    const el = document.getElementById('ce-diff');
    if (!el) return;
    const ov = this._overrides[tab.id] ?? {};
    el.textContent = Object.keys(ov).length === 0 ? '(none)' : JSON.stringify(ov, null, 2);
  }

  // ── Actions ───────────────────────────────────────────────────────────

  _applyAll() {
    saveOverrides(this._overrides);
    toast('Overrides saved to localStorage — reload the game to apply.', 'ok');
  }

  _exportJSON() {
    if (Object.keys(this._overrides).length === 0) {
      toast('No overrides to export.', 'err'); return;
    }
    const blob = new Blob([JSON.stringify(this._overrides, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'aethoria-config-overrides.json';
    a.click();
    URL.revokeObjectURL(url);
    toast('Exported config overrides.json', 'ok');
  }

  _clearOverrides() {
    if (!confirm('Clear all config overrides from localStorage?')) return;
    this._overrides = {};
    localStorage.removeItem(LS_KEY);
    toast('Overrides cleared', 'ok');
    this._switchTab(this._activeTab); // re-render
  }
}
