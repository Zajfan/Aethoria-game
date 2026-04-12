/**
 * LoreBrowser.js
 *
 * Read-only browser over LoreDatabase.js entries.
 * Tabs: World · Factions · Shards · Scrolls · Bestiary
 */

import { LORE, randomScroll, beastiaryEntry } from '../../src/systems/LoreDatabase.js';
import { CONFIG } from '../../src/config.js';

export class LoreBrowser {
  constructor(container) {
    this._el  = container;
    this._tab = 'history';
    this._render();
  }

  _render() {
    this._el.innerHTML = `
      <div class="panel-header">
        <h2>📖 Lore Browser</h2>
        <span class="desc">Read-only view of LoreDatabase entries</span>
      </div>
      <div class="tab-bar" id="lb-tabs">
        ${['history','factions','shards','scrolls','regions','bestiary'].map(t => `
          <button class="tab-btn ${t === this._tab ? 'active' : ''}" data-tab="${t}">
            ${t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        `).join('')}
      </div>
      <div class="panel-body" id="lb-body"></div>
    `;

    document.querySelectorAll('#lb-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._tab = btn.dataset.tab;
        document.querySelectorAll('#lb-tabs .tab-btn').forEach(b =>
          b.classList.toggle('active', b.dataset.tab === this._tab));
        this._renderTab();
      });
    });

    this._renderTab();
  }

  _renderTab() {
    const body = document.getElementById('lb-body');
    switch (this._tab) {
      case 'history':  body.innerHTML = this._historyTab();  break;
      case 'factions': body.innerHTML = this._factionsTab(); break;
      case 'shards':   body.innerHTML = this._shardsTab();   break;
      case 'scrolls':  body.innerHTML = this._scrollsTab();  break;
      case 'regions':  body.innerHTML = this._regionsTab();  break;
      case 'bestiary': body.innerHTML = this._bestiaryTab(); break;
    }
  }

  // ── History ───────────────────────────────────────────────────────────

  _historyTab() {
    const entries = LORE.history ?? [];
    if (!entries.length) return this._noData('history');
    return entries.map(e => `
      <div class="card">
        <div class="card-title">${e.title ?? e.id ?? '?'}</div>
        <div class="card-body" style="color:var(--text);line-height:1.7;font-size:12px">${e.text ?? ''}</div>
      </div>
    `).join('');
  }

  // ── Factions ──────────────────────────────────────────────────────────

  _factionsTab() {
    const factions = LORE.factions_lore ?? {};
    return Object.entries(factions).map(([id, f]) => `
      <div class="card">
        <div class="card-title">
          ${f.name ?? id}
          <span class="badge" style="margin-left:8px">${id}</span>
        </div>
        <div class="card-body">
          <p style="color:var(--text);line-height:1.7;font-size:12px;margin-bottom:10px">${f.desc ?? f.description ?? f.text ?? '—'}</p>
          ${f.standing_levels ? `
            <div style="font-size:10px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">Standing Levels</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              ${Object.entries(f.standing_levels).map(([lvl, desc]) =>
                `<span class="badge" title="${desc}">${lvl}</span>`
              ).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `).join('') || this._noData('factions');
  }

  // ── Regions ───────────────────────────────────────────────────────────

  _regionsTab() {
    const regions = LORE.regions ?? {};
    return Object.entries(regions).map(([id, r]) => `
      <div class="card">
        <div class="card-title">
          ${r.name ?? id}
          <span class="badge" style="margin-left:8px">${id}</span>
        </div>
        <div class="card-body" style="color:var(--text);line-height:1.7;font-size:12px">
          ${r.desc ?? r.description ?? r.text ?? '—'}
        </div>
      </div>
    `).join('') || this._noData('regions');
  }

  // ── Shards ────────────────────────────────────────────────────────────

  _shardsTab() {
    const shards = LORE.shards ?? [];
    if (!shards.length) return this._noData('shards');
    return shards.map((s, i) => `
      <div class="card">
        <div class="card-title">
          <span style="color:var(--gold)">Shard ${i + 1}</span>
          <span style="margin-left:8px">${s.name ?? ''}</span>
        </div>
        <div class="card-body">
          <p style="color:var(--text);line-height:1.7;font-size:12px">${s.lore ?? s.desc ?? '—'}</p>
          ${s.location ? `<div style="margin-top:8px;font-size:10px;color:var(--text-dim)">Location: <span style="color:var(--text)">${s.location}</span></div>` : ''}
        </div>
      </div>
    `).join('');
  }

  // ── Scrolls ───────────────────────────────────────────────────────────

  _scrollsTab() {
    const scrolls = LORE.scrolls ?? [];
    if (!scrolls.length) return this._noData('scrolls');
    return `
      <div class="card">
        <div class="card-title">📜 All Scrolls <span class="badge">${scrolls.length}</span></div>
        <div class="card-body" style="padding:0">
          ${scrolls.map((s, i) => `
            <div style="padding:10px 16px;border-bottom:1px solid var(--bg3)">
              <div style="font-size:11px;color:var(--gold);margin-bottom:4px">${s.title ?? `Scroll ${i+1}`}</div>
              <div style="font-size:11px;color:var(--text);line-height:1.6">${s.text ?? s.content ?? '—'}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // ── Bestiary ──────────────────────────────────────────────────────────

  _bestiaryTab() {
    const enemies = CONFIG.ENEMY_TYPES ?? {};
    return `
      <div class="filter-bar" style="margin-bottom:14px">
        <input id="lb-beast-filter" placeholder="Filter enemies…" oninput="
          const q = this.value.toLowerCase();
          document.querySelectorAll('.beast-card').forEach(c => {
            c.style.display = c.textContent.toLowerCase().includes(q) ? '' : 'none';
          });
        " />
      </div>
      ${Object.entries(enemies).map(([key, e]) => {
        let loreEntry = null;
        try { loreEntry = beastiaryEntry?.(key); } catch {}

        const flags = [
          e.void_touch && 'void', e.ranged && 'ranged', e.burn && 'burn',
          e.freeze && 'freeze', e.poison && 'poison', e.ethereal && 'ethereal',
          e.stealth && 'stealth', e.berserk && 'berserk',
        ].filter(Boolean);

        return `
          <div class="card beast-card" style="margin-bottom:10px">
            <div class="card-title">
              <span style="color:var(--text-head)">${e.name ?? key}</span>
              <span class="badge" style="margin-left:6px">${key}</span>
              ${flags.map(f => `<span class="tag tag-${f}" style="margin-left:4px">${f}</span>`).join('')}
              <span style="margin-left:auto;font-size:10px;color:var(--text-dim)">
                HP:${e.hp} Atk:${e.atk} Def:${e.def} XP:${e.xp} Spd:${e.spd}
              </span>
            </div>
            ${loreEntry ? `
              <div class="card-body">
                <p style="font-size:11px;color:var(--text);line-height:1.6">${loreEntry}</p>
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    `;
  }

  _noData(section) {
    return `<p style="color:var(--text-dim);text-align:center;margin-top:60px">
      No ${section} data found in LoreDatabase.js
    </p>`;
  }
}
