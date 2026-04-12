/**
 * QuestBrowser.js
 *
 * Read-only reference view of all STORY_QUESTS and SIDE_QUESTS.
 * Organised by act with search / filter.  Shows full quest details
 * including type, target, reward, and act gate.
 */

import { ACTS, STORY_QUESTS, SIDE_QUESTS } from '../../src/systems/StorySystem.js';
import { CONFIG } from '../../src/config.js';

const TYPE_COLORS = {
  KILL:    '#ff6644',
  COLLECT: '#44cc88',
  EXPLORE: '#4488ff',
  TALK:    '#ffcc44',
  BOSS:    '#cc44ff',
  DUNGEON: '#aa4422',
  SHARD:   '#ffdd88',
  SURVIVE: '#888888',
};

export class QuestBrowser {
  constructor(container) {
    this._el = container;
    this._render();
  }

  _render() {
    this._el.innerHTML = `
      <div class="panel-header">
        <h2>📜 Quest Browser</h2>
        <span class="desc">${STORY_QUESTS.length} story · ${SIDE_QUESTS.length} side</span>
        <div class="actions">
          <label style="font-size:11px;color:var(--text-dim);display:flex;align-items:center;gap:6px;">
            <input type="checkbox" id="qb-show-side" checked /> Show side quests
          </label>
        </div>
      </div>
      <div style="padding:10px 20px;background:var(--bg2);border-bottom:1px solid var(--border);flex-shrink:0">
        <div class="filter-bar">
          <input id="qb-filter" placeholder="Search quests, types, targets, givers…" />
          <select id="qb-type-filter" style="background:var(--bg3);border:1px solid var(--border);color:var(--text);
            font-family:var(--font-mono);font-size:12px;padding:5px 8px;border-radius:4px;outline:none;">
            <option value="">All types</option>
            ${['KILL','COLLECT','EXPLORE','TALK','BOSS','DUNGEON','SHARD','SURVIVE'].map(t =>
              `<option value="${t}">${t}</option>`
            ).join('')}
          </select>
        </div>
      </div>
      <div class="panel-body" id="qb-body"></div>
    `;

    document.getElementById('qb-filter').addEventListener('input', () => this._refilter());
    document.getElementById('qb-type-filter').addEventListener('change', () => this._refilter());
    document.getElementById('qb-show-side').addEventListener('change', () => this._refilter());

    this._buildContent();
  }

  _buildContent() {
    const body = document.getElementById('qb-body');

    // Group story quests by act
    const actGroups = {};
    STORY_QUESTS.forEach(q => {
      if (!actGroups[q.act]) actGroups[q.act] = [];
      actGroups[q.act].push(q);
    });

    let html = '';

    // Story acts
    Object.entries(actGroups).forEach(([actId, quests]) => {
      const actData = ACTS[parseInt(actId)] ?? { name: `Act ${actId}`, title: '' };
      html += `
        <div class="card quest-group" data-group="story-${actId}">
          <div class="card-title" style="cursor:pointer" onclick="this.closest('.card').classList.toggle('collapsed')">
            <span style="color:var(--gold)">Act ${actId}</span>
            <span style="color:var(--text);margin-left:4px">${actData.title}</span>
            <span class="badge" style="margin-left:auto">${quests.length} quests</span>
          </div>
          <div class="card-body quest-list" style="padding:0">
            ${quests.map(q => this._questRow(q, 'story')).join('')}
          </div>
        </div>
      `;
    });

    // Side quests
    html += `
      <div class="card quest-group" id="qb-side-card">
        <div class="card-title" style="cursor:pointer" onclick="this.closest('.card').classList.toggle('collapsed')">
          <span style="color:var(--accent2)">Side Quests</span>
          <span class="badge" style="margin-left:auto">${SIDE_QUESTS.length} quests</span>
        </div>
        <div class="card-body quest-list" style="padding:0">
          ${SIDE_QUESTS.map(q => this._questRow(q, 'side')).join('')}
        </div>
      </div>
    `;

    body.innerHTML = html;
  }

  _questRow(q, category) {
    const typeColor = TYPE_COLORS[q.type] ?? '#888';
    const rewardStr = [
      q.reward?.xp   ? `${q.reward.xp}xp`      : null,
      q.reward?.gold  ? `${q.reward.gold}g`     : null,
      q.reward?.item  ? CONFIG.ITEMS?.[q.reward.item]?.name ?? q.reward.item : null,
    ].filter(Boolean).join(' · ');

    return `
      <div class="quest-row" data-quest-type="${q.type}" data-quest-cat="${category}"
           style="padding:8px 16px;flex-direction:column;align-items:flex-start;gap:4px;">
        <div style="display:flex;align-items:center;gap:8px;width:100%">
          <span style="background:${typeColor}22;color:${typeColor};font-size:9px;padding:2px 6px;
                border-radius:3px;min-width:58px;text-align:center">${q.type}</span>
          <span style="font-size:12px;color:var(--text-head)">${q.title}</span>
          <span style="margin-left:auto;font-size:10px;color:var(--text-dim)">${q.giver ?? '—'}</span>
        </div>
        <div style="font-size:10px;color:var(--text-dim);padding-left:74px">${q.desc ?? ''}</div>
        <div style="display:flex;gap:12px;padding-left:74px;font-size:10px">
          <span style="color:var(--text-dim)">Target: <span style="color:var(--text)">${q.target}</span> ×${q.needed}</span>
          ${rewardStr ? `<span style="color:var(--green)">${rewardStr}</span>` : ''}
        </div>
      </div>
    `;
  }

  _refilter() {
    const q    = document.getElementById('qb-filter').value.toLowerCase();
    const type = document.getElementById('qb-type-filter').value;
    const showSide = document.getElementById('qb-show-side').checked;

    document.querySelectorAll('.quest-row[data-quest-type]').forEach(row => {
      const catOk  = row.dataset.questCat !== 'side' || showSide;
      const typeOk = !type || row.dataset.questType === type;
      const textOk = !q    || row.textContent.toLowerCase().includes(q);
      row.style.display = catOk && typeOk && textOk ? '' : 'none';
    });
  }
}
