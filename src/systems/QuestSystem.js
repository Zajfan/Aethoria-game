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

    // NPC chain state: { 'Elder Lyra': { step: 0, activeId: null, chainDone: false } }
    this._chains = {};
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

  // ── NPC chain quest API ───────────────────────────────────────────────────

  /**
   * Returns the chain definition for an NPC, or null if none.
   */
  getChainDef(npcName) {
    return CONFIG.NPC_CHAINS?.[npcName] ?? null;
  }

  /**
   * Returns the chain state object for an NPC (creates if missing).
   */
  _chainState(npcName) {
    if (!this._chains[npcName]) {
      this._chains[npcName] = { step: 0, activeId: null, chainDone: false };
    }
    return this._chains[npcName];
  }

  /**
   * Returns the next quest template the NPC can offer, or null.
   * null means: chain is finished OR player already has it active.
   */
  getAvailableChainQuest(npcName) {
    const chain = this.getChainDef(npcName);
    if (!chain) return null;
    const state = this._chainState(npcName);
    if (state.chainDone) return null;
    if (state.activeId !== null) return null;  // already active
    const tpl = chain.quests[state.step];
    return tpl ?? null;
  }

  /**
   * Returns the active chain quest for this NPC if the player has accepted it, or null.
   */
  getActiveChainQuest(npcName) {
    const state = this._chainState(npcName);
    if (state.activeId === null) return null;
    return this.active.find(q => q.id === state.activeId) ?? null;
  }

  /**
   * Accept the current chain quest for this NPC.
   * Returns the created quest object.
   */
  acceptChainQuest(npcName) {
    const tpl   = this.getAvailableChainQuest(npcName);
    if (!tpl) return null;
    const state = this._chainState(npcName);

    const quest = {
      id:         tpl.id,
      type:       tpl.type,
      title:      tpl.title,
      desc:       tpl.giveText,
      giver:      npcName,
      target:     tpl.target,
      needed:     tpl.needed,
      progress:   0,
      done:       false,
      isChain:    true,
      waypointX:  tpl.waypointX,
      waypointZ:  tpl.waypointZ,
      reward:     { ...tpl.reward },
    };

    state.activeId = tpl.id;
    this.active.push(quest);
    this.scene.events.emit('questAdded', quest);
    return quest;
  }

  /**
   * Turn in the active chain quest for this NPC.
   * Advances the chain, emits questComplete, grants reward + chain reward if finished.
   */
  turnInChainQuest(npcName, player) {
    const quest = this.getActiveChainQuest(npcName);
    if (!quest || !quest.done) return false;

    const chain = this.getChainDef(npcName);
    const state = this._chainState(npcName);

    // Remove from active, add to done
    this.active  = this.active.filter(q => q.id !== quest.id);
    this.done.push(quest);
    state.activeId = null;
    state.step++;

    this.scene.events.emit('questComplete', quest);

    // Grant XP + gold (with GATE_FRAGMENT bonus if active)
    if (player) {
      player.gainXP?.(quest.reward.xp);
      if (quest.reward.gold) {
        const goldMult = 1 + (player._goldDropBonus ?? 0);
        player.stats.gold = (player.stats.gold ?? 0) + Math.round(quest.reward.gold * goldMult);
        player.eventBus?.emit('statsChanged', player.stats);
      }
    }

    // Check if chain is now complete
    if (state.step >= chain.quests.length) {
      state.chainDone = true;
      // Grant unique chain reward
      if (player) {
        if (!player.chainRewards) player.chainRewards = {};
        player.chainRewards[chain.rewardKey] = true;
        this.scene.events.emit('chainRewardGranted', {
          npcName,
          rewardKey:   chain.rewardKey,
          rewardLabel: chain.rewardLabel,
          rewardDesc:  chain.rewardDesc,
          endText:     chain.chainEndText,
        });
      }
    }

    return true;
  }

  // ── Waypoint estimation ───────────────────────────────────────────────────

  _estimateWaypoint(type, fill, worldCtx) {
    const cx = 128, cz = 128;  // map centre = Hearthmoor
    const act = worldCtx?.act ?? 0;

    if (type === 'KILL') {
      // Point toward known enemy zones — all outside the expanded safe zone (r=40)
      const zones = {
        goblin:  { x: cx + 55,  z: cz + 20  },
        wolf:    { x: cx - 60,  z: cz - 45  },
        skeleton:{ x: cx + 75,  z: cz - 20  },
        troll:   { x: cx - 70,  z: cz + 55  },
        bandit:  { x: cx - 65,  z: cz - 60  },
        spider:  { x: cx + 60,  z: cz + 65  },
        wraith:  { x: cx + 80,  z: cz + 75  },
        golem:   { x: cx + 95,  z: cz - 80  },
        drake:   { x: cx + 98,  z: cz - 85  },
      };
      const enemyKey = (fill.enemy ?? '').toLowerCase();
      return zones[enemyKey] ?? { x: cx + 55 + Math.random()*30, z: cz + 50 + Math.random()*30 };
    }

    if (type === 'COLLECT') {
      // Items found in various regions — outside safe zone
      const itemZones = {
        hide:    { x: cx - 60, z: cz - 45 },
        fang:    { x: cx - 58, z: cz - 42 },
        bones:   { x: cx + 75, z: cz - 20 },
        gem:     { x: cx - 75, z: cz + 65 },
        crystal: { x: cx + 88, z: cz - 70 },
        herb:    { x: cx + 45, z: cz + 55 },
        dragonscale: { x: cx + 98, z: cz - 82 },
      };
      return itemZones[fill.item] ?? { x: cx + 50, z: cz - 50 };
    }

    if (type === 'EXPLORE') {
      if (act >= 3) return { x: cx + 80, z: cz - 20 }; // dungeon portal (updated location)
      return { x: cx + 50, z: cz - 15 };
    }

    if (type === 'TALK') {
      return { x: cx, z: cz }; // Hearthmoor centre
    }

    return { x: cx, z: cz };
  }

  // ── Progress tracking ─────────────────────────────────────────────────────

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
      if (q.progress >= q.needed) {
        if (q.isChain) {
          // Chain quests: mark done but require manual turn-in at the NPC
          q.done = true;
          this.scene.events.emit('questProgress', q); // refresh UI
          this.scene.events.emit('chainQuestReady', { questId: q.id, giver: q.giver });
        } else {
          this._complete(q);
        }
      }
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
        const goldMult = 1 + (p._goldDropBonus ?? 0); // GATE_FRAGMENT chain reward
        p.stats.gold = (p.stats.gold ?? 0) + Math.round(q.reward.gold * goldMult);
        p.eventBus?.emit('statsChanged', p.stats);
      }
    }
  }

  // ── Serialization ─────────────────────────────────────────────────────────

  serialize() {
    return { active: this.active, done: this.done.slice(-20), nextId: _nextId, chains: this._chains };
  }
  deserialize(d) {
    if (!d) return;
    this.active   = d.active  ?? [];
    this.done     = d.done    ?? [];
    _nextId       = d.nextId  ?? 1;
    this._chains  = d.chains  ?? {};
  }

  getActive()  { return this.active; }
  getDone()    { return this.done; }
}
