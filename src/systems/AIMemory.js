const KEY = 'aethoria_memory';

export class AIMemory {
  static load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch (_) { return {}; }
  }

  static save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) {}
  }

  static recordEvent(type, detail) {
    const m = this.load();
    if (!m.events) m.events = [];
    m.events.push({ type, detail, ts: Date.now() });
    if (m.events.length > 60) m.events = m.events.slice(-60);
    this.save(m);
  }

  static recordKill(enemyName)  { this.recordEvent('kill',  enemyName); }
  static recordLevelUp(lv)      { this.recordEvent('level', lv); }
  static recordQuestDone(title) { this.recordEvent('quest', title); }
  static recordDungeonRun()     { this.recordEvent('dungeon', 'entered'); }
  static recordBossKill(name)   { this.recordEvent('boss',  name); }
  static recordWorldEvent(name) { this.recordEvent('world', name); }

  static recordNPCSummary(npcName, summary) {
    const m = this.load();
    if (!m.npcs) m.npcs = {};
    if (!m.npcs[npcName]) m.npcs[npcName] = [];
    m.npcs[npcName].push(summary);
    if (m.npcs[npcName].length > 6) m.npcs[npcName] = m.npcs[npcName].slice(-6);
    this.save(m);
  }

  static buildNPCContext(npcName) {
    const m = this.load();
    const lines = [];

    const npcHistory = m.npcs?.[npcName] || [];
    if (npcHistory.length) lines.push('Previous chats with this NPC: ' + npcHistory.join(' | '));

    const recent = (m.events || []).slice(-12);
    if (recent.length) {
      const parts = recent.map(e => {
        if (e.type === 'kill')    return `killed a ${e.detail}`;
        if (e.type === 'level')   return `reached level ${e.detail}`;
        if (e.type === 'quest')   return `completed quest "${e.detail}"`;
        if (e.type === 'dungeon') return 'entered the dungeon';
        if (e.type === 'boss')    return `defeated ${e.detail}`;
        if (e.type === 'world')   return `world event: ${e.detail}`;
        return `${e.type}: ${e.detail}`;
      });
      lines.push('Player history: ' + parts.join(', ') + '.');
    }

    return lines.join('\n');
  }

  static clear() {
    localStorage.removeItem(KEY);
  }
}
