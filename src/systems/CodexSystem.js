/**
 * CodexSystem.js — Aethoria v0.6
 *
 * Tracks everything the player has discovered: lore scrolls, bestiary entries,
 * region histories, NPC bios, shard lore. Persists to localStorage.
 *
 * Unlocking logic:
 *   - History entries: unlocked automatically as acts progress
 *   - Bestiary: unlocked on first encounter (enemyKilled OR enemy spotted nearby)
 *   - Scrolls: unlocked when picked up from chest/loot, then readable
 *   - Region lore: unlocked when player first visits a region
 *   - NPC bios: unlocked after first dialogue with an NPC
 *   - Shard lore: unlocked when a shard is collected
 *
 * API:
 *   codex.unlock(category, id)          — unlock an entry
 *   codex.isUnlocked(category, id)      — check
 *   codex.getUnlocked(category)         — list all unlocked in category
 *   codex.getFoundScrolls()             — [{id, title, text}, ...]
 *   codex.addScroll(scrollObj)          — add a found scroll
 *   codex.getProgress()                 — { total, found, pct }
 *   codex.serialize() / deserialize()
 */

import { LORE } from './LoreDatabase.js';

const STORAGE_KEY = 'aethoria_codex';

export class CodexSystem {
  constructor(eventBus) {
    this._bus     = eventBus;
    this._data    = this._load();

    // Wire event bus
    if (eventBus) {
      eventBus.on('enemyKilled',   ({ typeKey }) => this.unlockBestiary(typeKey));
      eventBus.on('regionEntered', ({ region })  => this.unlockRegion(region.id));
      eventBus.on('shardCollected',({ id })       => this.unlockShard(id));
      eventBus.on('npcInteract',   ({ npcIndex, npcName }) => {
        const name = npcName ?? `npc_${npcIndex}`;
        this.unlockNPC(name);
      });
      eventBus.on('scrollRead',    (scroll)       => this.addScroll(scroll));
      eventBus.on('actAdvanced',   ({ actId })    => this.unlockHistory(actId));
    }
  }

  // ── Unlock API ──────────────────────────────────────────────────────────────

  unlock(category, id) {
    if (!this._data.unlocked[category]) this._data.unlocked[category] = new Set();
    const was = this._data.unlocked[category].has(id);
    this._data.unlocked[category].add(id);
    if (!was) {
      this._save();
      this._bus?.emit('codexUnlocked', { category, id });
    }
    return !was;  // true = newly unlocked
  }

  isUnlocked(category, id) {
    return this._data.unlocked[category]?.has(id) ?? false;
  }

  getUnlocked(category) {
    return [...(this._data.unlocked[category] ?? [])];
  }

  // ── Typed shortcuts ─────────────────────────────────────────────────────────

  unlockBestiary(enemyKey) {
    const entry = LORE.bestiary[enemyKey];
    if (!entry) return false;
    return this.unlock('bestiary', enemyKey);
  }

  unlockRegion(regionId) {
    return this.unlock('regions', regionId);
  }

  unlockShard(shardId) {
    return this.unlock('shards', String(shardId));
  }

  unlockNPC(npcName) {
    return this.unlock('npcs', npcName);
  }

  unlockHistory(actId) {
    // Unlock history entries tied to this act
    const actMap = {
      0: ['hearthmoor_founding'],
      1: ['age_of_crowns', 'crown_shattering'],
      2: ['voidlord_rising'],
      3: ['lyra_secret'],
    };
    const ids = actMap[actId] ?? [];
    ids.forEach(id => this.unlock('history', id));
  }

  // ── Scrolls ─────────────────────────────────────────────────────────────────

  addScroll(scrollObj) {
    if (!scrollObj?.id) return;
    const already = this._data.scrolls.some(s => s.id === scrollObj.id);
    if (!already) {
      this._data.scrolls.push({ ...scrollObj, foundAt: Date.now() });
      this._save();
      this._bus?.emit('codexUnlocked', { category: 'scrolls', id: scrollObj.id });
      return true;
    }
    return false;
  }

  getFoundScrolls() {
    return this._data.scrolls;
  }

  hasScroll(id) {
    return this._data.scrolls.some(s => s.id === id);
  }

  // ── Progress ─────────────────────────────────────────────────────────────────

  getProgress() {
    const total = {
      history:  Object.keys(LORE.history).length,
      bestiary: Object.keys(LORE.bestiary).length,
      shards:   LORE.shards.length,
      scrolls:  LORE.scrolls.length,
      regions:  5,
      npcs:     5,
    };
    const found = {
      history:  this.getUnlocked('history').length,
      bestiary: this.getUnlocked('bestiary').length,
      shards:   this.getUnlocked('shards').length,
      scrolls:  this._data.scrolls.length,
      regions:  this.getUnlocked('regions').length,
      npcs:     this.getUnlocked('npcs').length,
    };
    const totalN = Object.values(total).reduce((a, b) => a + b, 0);
    const foundN = Object.values(found).reduce((a, b) => a + b, 0);
    return { total, found, totalN, foundN, pct: Math.round(foundN / totalN * 100) };
  }

  // ── Full data for UI ─────────────────────────────────────────────────────────

  /**
   * Returns all discovered entries for the Codex UI panel.
   */
  getAll() {
    return {
      history: LORE.history
        .filter(h => this.isUnlocked('history', h.id))
        .map(h => ({ ...h, category: 'history' })),

      bestiary: Object.entries(LORE.bestiary)
        .filter(([k]) => this.isUnlocked('bestiary', k))
        .map(([k, v]) => ({ id: k, ...v, category: 'bestiary' })),

      shards: LORE.shards
        .filter(s => this.isUnlocked('shards', String(s.id)))
        .map(s => ({ ...s, category: 'shards' })),

      scrolls: this._data.scrolls
        .map(s => ({ ...s, category: 'scrolls' })),

      npcs: Object.entries(LORE.npcs)
        .filter(([k]) => this.isUnlocked('npcs', k))
        .map(([name, v]) => ({ id: name, name, ...v, category: 'npcs' })),
    };
  }

  // ── Persistence ──────────────────────────────────────────────────────────────

  _load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
      return {
        unlocked: Object.fromEntries(
          Object.entries(raw.unlocked ?? {}).map(([k, v]) => [k, new Set(v)])
        ),
        scrolls: raw.scrolls ?? [],
      };
    } catch (_) {
      return { unlocked: {}, scrolls: [] };
    }
  }

  _save() {
    try {
      const raw = {
        unlocked: Object.fromEntries(
          Object.entries(this._data.unlocked).map(([k, v]) => [k, [...v]])
        ),
        scrolls: this._data.scrolls,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
    } catch (_) {}
  }

  serialize()    { return { unlocked: Object.fromEntries(Object.entries(this._data.unlocked).map(([k,v])=>[k,[...v]])), scrolls: this._data.scrolls }; }
  deserialize(d) {
    if (!d) return;
    this._data.unlocked = Object.fromEntries(Object.entries(d.unlocked ?? {}).map(([k,v])=>[k,new Set(v)]));
    this._data.scrolls  = d.scrolls ?? [];
  }
}
