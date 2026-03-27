/**
 * QuestSystem.js  (v0.4 — World-context-aware quest generation)
 *
 * Improvements:
 *  • generateQuest() now accepts worldCtx and passes it to AI flavor generation
 *  • Smarter de-duplication: won't give the same quest type twice in a row
 *  • Faction-linked reward bonuses (HEARTHMOOR honored = +20% XP, GUILD honored = +20% gold)
 *  • onKill / onCollect also award faction kills via eventBus
 *  • serialize/deserialize preserves full quest state
 */

import { CONFIG     } from '../config.js';
import { AethoriaAI } from '../ai/AethoriaAI.js';

let _nextId = 1;

export class QuestSystem {
  constructor(scene) {
    this.scene  = scene;
    this.active = [];
    this.done   = [];
    this._lastType = null; // prevent back-to-back same type
  }

  // ── Quest generation ──────────────────────────────────────────────────────

  /**
   * @param {object}      playerStats
   * @param {string}      npcName
   * @param {object|null} worldCtx   From GameScene._buildWorldContext()
   */
  async generateQuest(playerStats, npcName, worldCtx = null) {
    // Pick a template, skipping the same type as last time if possible
    const templates = CONFIG.QUEST_TEMPLATES;
    let tpl = templates[Math.floor(Math.random() * templates.length)];
    if (tpl.type === this._lastType && templates.length > 1) {
      tpl = templates[(templates.indexOf(tpl) + 1) % templates.length];
    }
    this._lastType = tpl.type;

    const enemyKeys = Object.keys(CONFIG.ENEMY_TYPES);
    const itemKeys  = Object.keys(CONFIG.ITEMS).filter(k => CONFIG.ITEMS[k].type === 'material');
    const npcNames  = CONFIG.NPCS_DATA.map(n => n.name);
    const count     = tpl.count[Math.floor(Math.random() * tpl.count.length)];

    // Scale difficulty a little with player level
    const lvl   = playerStats?.level ?? 1;
    const adjCount = Math.min(count + Math.floor(lvl / 4), count * 2);

    const fill = {
      enemy: enemyKeys[Math.floor(Math.random() * enemyKeys.length)].toLowerCase(),
      item:  itemKeys [Math.floor(Math.random() * itemKeys.length)],
      npc:   npcNames [Math.floor(Math.random() * npcNames.length)],
      count: adjCount,
    };

    const title = tpl.title.replace(/\{\{(\w+)\}\}/g, (_, k) => fill[k] ?? k);
    const desc  = tpl.desc .replace(/\{\{(\w+)\}\}/g, (_, k) => fill[k] ?? k);

    // Ask AI for world-aware flavor text
    let flavor = desc;
    try {
      const questBase = { type: tpl.type, title, desc, giver: npcName, needed: adjCount };
      flavor = await AethoriaAI.generateQuestFlavor(questBase, worldCtx);
    } catch (_) { /* keep plain desc */ }

    // Faction reward bonuses
    const factionSys = this.scene?.factionSystem;
    let xpMult   = 1.0;
    let goldMult = 1.0;
    if (factionSys) {
      if (factionSys.hasUnlock?.('hm_champion')) xpMult   *= 1.20;
      if (factionSys.hasUnlock?.('guild_legend')) goldMult *= 1.20;
    }

    // Generate waypoint from quest type (approximate target location)
    const waypointCoords = this._estimateWaypoint(tpl.type, fill, worldCtx);

    const quest = {
      id:         _nextId++,
      type:       tpl.type,
      title,
      desc:       flavor,
      giver:      npcName,
      target:     fill[tpl.target] ?? '',
      needed:     adjCount,
      progress:   0,
      done:       false,
      waypointX:  waypointCoords.x,
      waypointZ:  waypointCoords.z,
      reward: {
        xp:   Math.round(adjCount * 45 * xpMult),
        gold: Math.round(adjCount * 18 * goldMult),
      },
      worldCtxSnapshot: worldCtx
        ? { weather: worldCtx.weather, act: worldCtx.act }
        : null,
    };

    this.active.push(quest);
    this.scene.events.emit('questAdded', quest);
    return quest;
  }

  // ── Waypoint estimation ───────────────────────────────────────────────────

  _estimateWaypoint(type, fill, worldCtx) {
    const cx = 128, cz = 128;  // map centre = Hearthmoor
    const act = worldCtx?.act ?? 0;

    if (type === 'KILL') {
      // Point toward a known enemy zone based on type
      const zones = {
        goblin:  { x: cx + 25,  z: cz + 10  },
        wolf:    { x: cx - 30,  z: cz - 20  },
        skeleton:{ x: cx + 48,  z: cz - 8   },
        troll:   { x: cx - 45,  z: cz + 30  },
        bandit:  { x: cx - 40,  z: cz - 35  },
        spider:  { x: cx + 35,  z: cz + 40  },
        wraith:  { x: cx + 55,  z: cz + 55  },
        golem:   { x: cx + 70,  z: cz - 55  },
        drake:   { x: cx + 72,  z: cz - 60  },
      };
      const enemyKey = (fill.enemy ?? '').toLowerCase();
      return zones[enemyKey] ?? { x: cx + 20 + Math.random()*20, z: cz + 20 + Math.random()*20 };
    }

    if (type === 'COLLECT') {
      // Items found in various regions
      const itemZones = {
        hide:    { x: cx - 30, z: cz - 20 },
        fang:    { x: cx - 28, z: cz - 18 },
        bones:   { x: cx + 45, z: cz - 10 },
        gem:     { x: cx - 48, z: cz + 40 },
        crystal: { x: cx + 60, z: cz - 45 },
        herb:    { x: cx + 20, z: cz + 30 },
        dragonscale: { x: cx + 72, z: cz - 58 },
      };
      return itemZones[fill.item] ?? { x: cx + 15, z: cz - 15 };
    }

    if (type === 'EXPLORE') {
      if (act >= 3) return { x: cx + 48, z: cz - 12 }; // dungeon
      return { x: cx + 25, z: cz - 15 };
    }

    if (type === 'TALK') {
      return { x: cx, z: cz }; // Hearthmoor centre
    }

    return { x: cx, z: cz };
  }

  // ── Progress tracking ─────────────────────────────────────────────────────

  onKill(enemyName) {
    this._progress('KILL', enemyName.toLowerCase());
    // Emit for faction system wiring
    this.scene.events.emit('enemyKilled', { typeKey: enemyName.toUpperCase() });
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

    // Grant reward directly to player
    const p = this.scene.player;
    if (p) {
      p.gainXP(q.reward.xp);
      if (q.reward.gold > 0) {
        p.stats.gold = (p.stats.gold ?? 0) + q.reward.gold;
        p.eventBus?.emit('statsChanged', p.stats);
      }
    }
  }

  // ── Serialization ─────────────────────────────────────────────────────────

  serialize()    { return { active: this.active, done: this.done.slice(-20), nextId: _nextId }; }
  deserialize(d) {
    if (!d) return;
    this.active = d.active  ?? [];
    this.done   = d.done    ?? [];
    _nextId     = d.nextId  ?? 1;
  }

  getActive()  { return this.active; }
  getDone()    { return this.done; }
}
