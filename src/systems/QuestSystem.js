import { CONFIG    } from '../config.js';
import { AethoriaAI } from '../ai/AethoriaAI.js';

let _nextId = 1;

export class QuestSystem {
  constructor(scene) {
    this.scene   = scene;
    this.active  = [];
    this.done    = [];
  }

  /* ── Generate a quest (AI-flavored) ───────────────────── */
  async generateQuest(playerStats, npcName) {
    const tpl = CONFIG.QUEST_TEMPLATES[Math.floor(Math.random() * CONFIG.QUEST_TEMPLATES.length)];
    const enemyKeys = Object.keys(CONFIG.ENEMY_TYPES);
    const itemKeys  = Object.keys(CONFIG.ITEMS).filter(k => CONFIG.ITEMS[k].type === 'material');
    const npcNames  = CONFIG.NPCS_DATA.map(n => n.name);
    const count     = tpl.count[Math.floor(Math.random() * tpl.count.length)];

    const fill = {
      enemy: enemyKeys[Math.floor(Math.random() * enemyKeys.length)].toLowerCase(),
      item:  itemKeys [Math.floor(Math.random() * itemKeys.length)],
      npc:   npcNames [Math.floor(Math.random() * npcNames.length)],
      count,
    };

    const title = tpl.title.replace(/{{(\w+)}}/g, (_,k) => fill[k] ?? k);
    const desc  = tpl.desc.replace (/{{(\w+)}}/g, (_,k) => fill[k] ?? k);

    // Ask Claude for a one-line flavor text
    let flavor = '';
    try {
      const sys = `You are a quest flavor text writer for the fantasy RPG "Aethoria". 
Write ONE short dramatic sentence (max 18 words) as a quest hook for: "${desc}". 
No preamble, no quotes, just the sentence.`;
      flavor = await AethoriaAI.chat(sys, [{ role:'user', content: desc }]);
    } catch (_) { flavor = desc; }

    const quest = {
      id:       _nextId++,
      type:     tpl.type,
      title,
      desc:     flavor || desc,
      giver:    npcName,
      target:   fill[tpl.target] ?? '',
      needed:   count,
      progress: 0,
      done:     false,
      reward:   { xp: count * 40, gold: count * 15 },
    };

    this.active.push(quest);
    this.scene.events.emit('questAdded', quest);
    return quest;
  }

  /* ── Progress tracking ──────────────────────────────────── */
  onKill(enemyName) {
    this._progress('KILL', enemyName.toLowerCase());
  }

  onCollect(itemKey) {
    this._progress('COLLECT', itemKey);
  }

  onExplore() {
    this._progress('EXPLORE', 'tile');
  }

  _progress(type, target) {
    this.active.forEach(q => {
      if (q.done || q.type !== type) return;
      if (type === 'KILL'    && !q.target.includes(target) && !target.includes(q.target)) return;
      if (type === 'COLLECT' && q.target !== target) return;
      q.progress = Math.min(q.needed, q.progress + 1);
      this.scene.events.emit('questProgress', q);
      if (q.progress >= q.needed) this._complete(q);
    });
  }

  _complete(q) {
    q.done = true;
    this.active = this.active.filter(a => a.id !== q.id);
    this.done.push(q);
    this.scene.events.emit('questComplete', q);
    // Grant reward
    const p = this.scene.player;
    if (p) { p.gainXP(q.reward.xp); p.addItem('gold', q.reward.gold / 20 | 0); }
  }

  serialize()    { return { active: this.active, done: this.done, nextId: _nextId }; }
  deserialize(d) { this.active = d.active||[]; this.done = d.done||[]; _nextId = d.nextId||1; }
}
