const KEY = 'aethoria_memory';

export class AIMemory {
  static load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch (_) { return {}; }
  }

  static save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) {}
  }

  // ── Event recording ──────────────────────────────────────────────────────

  static recordEvent(type, detail) {
    const m = this.load();
    if (!m.events) m.events = [];
    m.events.push({ type, detail, ts: Date.now() });
    if (m.events.length > 80) m.events = m.events.slice(-80);
    this.save(m);
  }

  static recordKill(enemyName)  { this.recordEvent('kill',    enemyName); }
  static recordLevelUp(lv)      { this.recordEvent('level',   lv); }
  static recordQuestDone(title) { this.recordEvent('quest',   title); }
  static recordDungeonRun()     { this.recordEvent('dungeon', 'entered'); }
  static recordBossKill(name)   { this.recordEvent('boss',    name); }
  static recordWorldEvent(name) { this.recordEvent('world',   name); }
  static recordShardCollect(id) { this.recordEvent('shard',   id); }
  static recordFactionChange(f, s) { this.recordEvent('faction', `${f}→${s}`); }
  static recordItemCrafted(item){ this.recordEvent('craft',   item); }
  static recordChoice(desc)     { this.recordEvent('choice',  desc); }

  // ── NPC dialogue summaries ───────────────────────────────────────────────

  static recordNPCSummary(npcName, summary) {
    const m = this.load();
    if (!m.npcs) m.npcs = {};
    if (!m.npcs[npcName]) m.npcs[npcName] = [];
    m.npcs[npcName].push({ text: summary, ts: Date.now() });
    if (m.npcs[npcName].length > 8) m.npcs[npcName] = m.npcs[npcName].slice(-8);
    this.save(m);
  }

  // ── Player stat snapshot (saved when level up / class change) ────────────

  static recordPlayerSnapshot(stats) {
    const m = this.load();
    m.playerSnap = {
      level:  stats.level,
      class:  stats.class ?? null,
      hp:     stats.maxHp,
      act:    stats.act ?? 0,
      ts:     Date.now(),
    };
    this.save(m);
  }

  // ── Context builders ─────────────────────────────────────────────────────

  /**
   * Build NPC-specific context string for AI system prompts.
   * Includes: past chats with this NPC, notable player events, player snapshot.
   */
  static buildNPCContext(npcName) {
    const m = this.load();
    const lines = [];

    // Previous conversations with this NPC
    const npcHistory = (m.npcs?.[npcName] || []).slice(-5);
    if (npcHistory.length) {
      lines.push('Previous exchanges with you: ' + npcHistory.map(h => h.text).join(' | '));
    }

    // Player's recent deeds (last 15 events, filtered for interesting ones)
    const INTERESTING = ['level','boss','quest','shard','faction','choice','dungeon'];
    const notable = (m.events || [])
      .filter(e => INTERESTING.includes(e.type))
      .slice(-10);

    if (notable.length) {
      const parts = notable.map(e => {
        switch (e.type) {
          case 'level':   return `reached level ${e.detail}`;
          case 'boss':    return `defeated ${e.detail}`;
          case 'quest':   return `completed "${e.detail}"`;
          case 'shard':   return `found Shard ${e.detail}`;
          case 'faction': return `faction change: ${e.detail}`;
          case 'choice':  return `chose: ${e.detail}`;
          case 'dungeon': return 'entered the dungeon';
          default:        return `${e.type}: ${e.detail}`;
        }
      });
      lines.push('Player deeds: ' + parts.join(', ') + '.');
    }

    // Kill counts
    const kills = (m.events || []).filter(e => e.type === 'kill');
    if (kills.length > 5) {
      const counts = {};
      kills.forEach(k => { counts[k.detail] = (counts[k.detail] || 0) + 1; });
      const top = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0,3);
      lines.push('Most hunted: ' + top.map(([n,c]) => `${n}×${c}`).join(', ') + '.');
    }

    // Player snapshot
    if (m.playerSnap) {
      const s = m.playerSnap;
      lines.push(`Current: Lv${s.level} ${s.class ?? 'adventurer'}, Act ${s.act}.`);
    }

    return lines.join('\n');
  }

  /**
   * Build a brief world-state summary string for quest/event generation.
   */
  static buildWorldSummary() {
    const m = this.load();
    const events = (m.events || []).slice(-20);
    const parts  = [];

    const bosses = events.filter(e => e.type === 'boss').map(e => e.detail);
    if (bosses.length) parts.push(`Bosses defeated: ${bosses.join(', ')}`);

    const quests = events.filter(e => e.type === 'quest').map(e => e.detail);
    if (quests.length) parts.push(`Recent quests done: ${quests.slice(-3).join(', ')}`);

    const shards = events.filter(e => e.type === 'shard').map(e => e.detail);
    if (shards.length) parts.push(`Shards collected: ${shards.join(', ')}`);

    if (m.playerSnap) parts.push(`Player: Lv${m.playerSnap.level}, Act ${m.playerSnap.act}`);

    return parts.join('. ');
  }

  static clear() {
    localStorage.removeItem(KEY);
  }
}
