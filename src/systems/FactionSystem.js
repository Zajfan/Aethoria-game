/**
 * FactionSystem.js
 * Aethoria v0.4 — Faction Reputation & Relationship Engine
 *
 * Four factions:
 *   HEARTHMOOR   – The village. Default friendly. Reputation = trust from locals.
 *   GUILD        – Adventurers' Guild. Neutral start. Unlocks rare contracts.
 *   ORDER        – The Order of the Sealed Sun. Neutral. Story-critical faction.
 *   VOIDBORN     – Servants of the Voidlords. Hostile by default. Evil path.
 *
 * Reputation tracks (-1000 to +1000):
 *   < -600  → ENEMY       (attack on sight, locked traders, bounty)
 *   < -200  → HOSTILE
 *   < +200  → NEUTRAL
 *   < +600  → FRIENDLY
 *   ≥ +600  → HONORED     (price discounts, unique quests, cosmetic titles)
 *
 * Integration:
 *   factionSys.onKill(enemyType)       – Killing affects faction rep
 *   factionSys.onQuestComplete(quest)  – Rewards rep
 *   factionSys.onWorldEvent(id)        – World events shift rep
 *   factionSys.reputationFor(id)       – Returns -1000..+1000
 *   factionSys.standingFor(id)         – Returns 'ENEMY'|'HOSTILE'|'NEUTRAL'|'FRIENDLY'|'HONORED'
 *   factionSys.priceMultiplier(npcRole)– Returns float modifier for trade prices
 *   factionSys.getUnlocks(id)          – Returns array of unlocked features
 */

import { AIMemory } from './AIMemory.js';

// ── Faction definitions ───────────────────────────────────────────────────────

export const FACTIONS = {
  HEARTHMOOR: {
    id:       'HEARTHMOOR',
    name:     'Hearthmoor Village',
    color:    0xffd700,
    cssColor: '#ffd700',
    desc:     'The last safe settlement in central Aethoria. Their trust is hard-won.',
    startRep: 50,   // slight head start — they let you in
    npcRoles: ['Village Elder', 'Blacksmith', 'Herbalist', 'Guard Captain'],
    unlocks: {
      200:  { id: 'hm_discount',     label: 'Local Prices',     desc: '10% discount at village traders.' },
      500:  { id: 'hm_stash',        label: 'Village Stash',    desc: 'Access a shared item chest in town.' },
      800:  { id: 'hm_champion',     label: 'Village Champion', desc: 'NPCs call you Champion. Bonus XP from nearby kills.' },
    },
    penalties: {
      '-400': { id: 'hm_distrust',   label: 'Distrusted',    desc: 'Traders raise prices 20%.' },
      '-700': { id: 'hm_exile',      label: 'Exiled',        desc: 'Guards become hostile.' },
    },
  },
  GUILD: {
    id:       'GUILD',
    name:     "Adventurers' Guild",
    color:    0xdd6622,
    cssColor: '#dd6622',
    desc:     'A loose brotherhood of mercenaries and monster hunters. They value results.',
    startRep: 0,
    npcRoles: ['Merchant'],
    unlocks: {
      200:  { id: 'guild_contracts', label: 'Guild Contracts', desc: 'Dorin offers bonus kill quests.' },
      500:  { id: 'guild_cache',     label: 'Guild Cache',     desc: 'Hidden loot caches scattered near dungeons.' },
      800:  { id: 'guild_legend',    label: 'Guild Legend',    desc: 'Boss enemies drop an extra loot roll.' },
    },
    penalties: {
      '-300': { id: 'guild_blacklist', label: 'Blacklisted',  desc: 'Dorin refuses to trade.' },
    },
  },
  ORDER: {
    id:       'ORDER',
    name:     'Order of the Sealed Sun',
    color:    0x88ccff,
    cssColor: '#88ccff',
    desc:     'Ancient keepers of the seals that hold the Void at bay. Mystical, cautious, and dying.',
    startRep: -50,  // suspicious of outsiders
    npcRoles: [],   // no current NPC — unlocked through story quests
    unlocks: {
      300:  { id: 'order_lore',      label: 'Order Lore',      desc: 'Reveal hidden lore text in shard pickups.' },
      600:  { id: 'order_blessing',  label: 'Solar Blessing',  desc: 'Take 15% less damage from boss attacks.' },
      900:  { id: 'order_paladin',   label: 'Paladin Path',    desc: 'Attacks deal bonus holy damage. Unique title: Warden.' },
    },
    penalties: {},
  },
  VOIDBORN: {
    id:       'VOIDBORN',
    name:     'The Voidborn',
    color:    0x8800ee,
    cssColor: '#8800ee',
    desc:     'Servants of the Voidlords. Gaining their favor requires darkness.',
    startRep: -300, // players start opposed
    npcRoles: [],
    unlocks: {
      100:  { id: 'void_corrupt',    label: 'Corruption Touch', desc: 'Attacks have a 10% chance to apply Void Curse.' },
      400:  { id: 'void_shroud',     label: 'Void Shroud',      desc: 'Become invisible to patrolling enemies at night.' },
      700:  { id: 'void_champion',   label: 'Void Champion',    desc: 'Bosses ignore you unless you attack first.' },
    },
    penalties: {
      '-500': { id: 'void_purge',    label: 'Purge Order',   desc: 'All Voidborn enemies gain double attack speed.' },
    },
    // Gaining Void rep costs Hearthmoor rep (evil path tradeoff)
    rivalFaction: 'HEARTHMOOR',
    rivalPenalty: 1.2, // 1.2× rep lost from rival per rep gained
  },
};

// ── Standing thresholds ───────────────────────────────────────────────────────

const STANDING_LEVELS = [
  { min:  600, name: 'HONORED',  label: '★ Honored',  color: '#ffd700' },
  { min:  200, name: 'FRIENDLY', label: 'Friendly',   color: '#44ff88' },
  { min: -200, name: 'NEUTRAL',  label: 'Neutral',    color: '#aaaaaa' },
  { min: -600, name: 'HOSTILE',  label: 'Hostile',    color: '#ff8800' },
  { min: -9999,name: 'ENEMY',    label: '⚔ Enemy',    color: '#ff2222' },
];

// ── Rep change reasons (for event log) ───────────────────────────────────────

const KILL_REP = {
  // killing these enemies affects factions
  GOBLIN:   { HEARTHMOOR: +8,  GUILD: +5 },
  WOLF:     { HEARTHMOOR: +5,  GUILD: +4 },
  SKELETON: { ORDER: +10,      GUILD: +6 },
  TROLL:    { HEARTHMOOR: +12, GUILD: +8 },
  VOID_KNIGHT: { ORDER: +30,   HEARTHMOOR: +20, VOIDBORN: -40 },
  STONE_COLOSSUS: { GUILD: +25, HEARTHMOOR: +18 },
};

const QUEST_REP = {
  KILL:    { GUILD: +20, HEARTHMOOR: +10 },
  COLLECT: { HEARTHMOOR: +15, GUILD: +8  },
  EXPLORE: { GUILD: +12,      ORDER: +8  },
  TALK:    { HEARTHMOOR: +20 },
  SURVIVE: { HEARTHMOOR: +25 },
};

// ── FactionSystem ─────────────────────────────────────────────────────────────

export class FactionSystem {
  constructor(eventBus) {
    this._bus = eventBus;
    this._rep = {};
    this._prevStandings = {};
    this._log = []; // last N rep changes for UI

    // Initialize starting reputations
    for (const [id, def] of Object.entries(FACTIONS)) {
      this._rep[id] = def.startRep;
      this._prevStandings[id] = this.standingFor(id);
    }

    // Wire event bus
    if (eventBus) {
      eventBus.on('enemyKilled', ({ typeKey }) => this.onKill(typeKey));
      eventBus.on('questComplete', (quest)     => this.onQuestComplete(quest));
      eventBus.on('worldEvent',   (ev)         => this.onWorldEvent(ev));
    }
  }

  // ── Core API ───────────────────────────────────────────────────────────────

  /** Returns rep value -1000..+1000. */
  reputationFor(factionId) {
    return this._rep[factionId] ?? 0;
  }

  /** Returns standing string. */
  standingFor(factionId) {
    const rep = this.reputationFor(factionId);
    for (const lvl of STANDING_LEVELS) {
      if (rep >= lvl.min) return lvl.name;
    }
    return 'ENEMY';
  }

  /** Returns full standing data object { name, label, color }. */
  standingDataFor(factionId) {
    const name = this.standingFor(factionId);
    return STANDING_LEVELS.find(l => l.name === name) ?? STANDING_LEVELS[2];
  }

  /** Change reputation by amount. Clamps to ±1000. Emits events on crossing thresholds. */
  changeRep(factionId, amount, reason = '') {
    if (!FACTIONS[factionId]) return;

    const prev    = this._rep[factionId];
    const def     = FACTIONS[factionId];
    this._rep[factionId] = Math.max(-1000, Math.min(1000, prev + amount));

    // Rival faction penalty
    if (amount > 0 && def.rivalFaction) {
      const penalty = -Math.ceil(amount * def.rivalPenalty);
      this._rep[def.rivalFaction] = Math.max(
        -1000,
        (this._rep[def.rivalFaction] ?? 0) + penalty,
      );
    }

    // Log
    this._log.push({ factionId, delta: amount, reason, ts: Date.now() });
    if (this._log.length > 40) this._log = this._log.slice(-40);

    // Standing cross check
    const nowStanding = this.standingFor(factionId);
    if (nowStanding !== this._prevStandings[factionId]) {
      this._prevStandings[factionId] = nowStanding;
      this._bus?.emit('factionStandingChange', { factionId, standing: nowStanding });
      AIMemory.recordEvent('faction', `${FACTIONS[factionId].name}: ${nowStanding}`);
    }

    this._bus?.emit('factionRepChanged', { factionId, rep: this._rep[factionId], delta: amount });
  }

  // ── Game hooks ─────────────────────────────────────────────────────────────

  onKill(typeKey) {
    const repMap = KILL_REP[typeKey];
    if (!repMap) return;
    for (const [fid, delta] of Object.entries(repMap)) {
      this.changeRep(fid, delta, `Killed ${typeKey}`);
    }
  }

  onQuestComplete(quest) {
    const repMap = QUEST_REP[quest.type] ?? {};
    for (const [fid, base] of Object.entries(repMap)) {
      const bonus = Math.ceil(base * (1 + quest.needed * 0.1));
      this.changeRep(fid, bonus, `Quest: ${quest.title}`);
    }
    // Giver-specific bonus
    const giverFaction = this._factionOfNPC(quest.giver);
    if (giverFaction) this.changeRep(giverFaction, 25, `Pleased ${quest.giver}`);
  }

  onWorldEvent(ev) {
    switch (ev.id) {
      case 'goblin_raid':   this.changeRep('HEARTHMOOR', -15, 'Goblin Raid');      break;
      case 'merchant_fair': this.changeRep('GUILD',       +20, 'Merchant Festival'); break;
      case 'dark_eclipse':  this.changeRep('VOIDBORN',    +30, 'Dark Eclipse');     break;
      case 'plague':        this.changeRep('HEARTHMOOR',  -20, 'Plague event');     break;
      case 'void_rift':     this.changeRep('VOIDBORN',    +25, 'Void Rift opened'); break;
      case 'crystal_storm': this.changeRep('ORDER',       +20, 'Crystal Storm');    break;
    }
  }

  _factionOfNPC(npcName) {
    if (!npcName) return null;
    for (const [id, def] of Object.entries(FACTIONS)) {
      for (const role of def.npcRoles) {
        if (npcName.toLowerCase().includes(role.toLowerCase())) return id;
      }
    }
    // By name heuristics
    if (npcName === 'Elder Lyra' || npcName === 'Gareth' || npcName === 'Mira' || npcName === 'Capt. Vel')
      return 'HEARTHMOOR';
    if (npcName === 'Dorin') return 'GUILD';
    return 'HEARTHMOOR'; // default
  }

  // ── Trade integration ──────────────────────────────────────────────────────

  /**
   * Returns a price multiplier for buying from an NPC of this role.
   * Friendly = cheaper, Hostile = more expensive.
   */
  priceMultiplier(npcRole) {
    // Find which faction owns this role
    let factionId = null;
    for (const [id, def] of Object.entries(FACTIONS)) {
      if (def.npcRoles.includes(npcRole)) { factionId = id; break; }
    }
    if (!factionId) return 1.0;

    const standing = this.standingFor(factionId);
    const mult = {
      HONORED:   0.82,
      FRIENDLY:  0.92,
      NEUTRAL:   1.00,
      HOSTILE:   1.25,
      ENEMY:     1.60,
    };
    return mult[standing] ?? 1.0;
  }

  // ── Unlocks ────────────────────────────────────────────────────────────────

  /**
   * Returns array of all currently active unlock IDs for a faction.
   */
  getUnlocks(factionId) {
    const def = FACTIONS[factionId];
    if (!def) return [];
    const rep = this.reputationFor(factionId);
    const unlocked = [];
    for (const [threshold, unlock] of Object.entries(def.unlocks)) {
      if (rep >= parseInt(threshold)) unlocked.push(unlock);
    }
    return unlocked;
  }

  /**
   * Returns all unlocks across all factions the player has earned.
   */
  getAllUnlocks() {
    const all = [];
    for (const id of Object.keys(FACTIONS)) {
      all.push(...this.getUnlocks(id));
    }
    return all;
  }

  /** Quick check: does the player have a specific unlock? */
  hasUnlock(unlockId) {
    return this.getAllUnlocks().some(u => u.id === unlockId);
  }

  // ── XP bonus (Village Champion unlock) ────────────────────────────────────

  xpBonus() {
    return this.hasUnlock('hm_champion') ? 1.20 : 1.0;
  }

  // ── UI data ────────────────────────────────────────────────────────────────

  /** Returns full summary for all factions — used by HUD panel. */
  getSummary() {
    return Object.values(FACTIONS).map(def => ({
      id:       def.id,
      name:     def.name,
      color:    def.cssColor,
      rep:      this.reputationFor(def.id),
      standing: this.standingFor(def.id),
      standingData: this.standingDataFor(def.id),
      unlocks:  this.getUnlocks(def.id),
    }));
  }

  /** Last N reputation change events for the log widget. */
  getRecentLog(n = 10) {
    return this._log.slice(-n);
  }

  // ── Save / Load ────────────────────────────────────────────────────────────

  serialize() {
    return { rep: { ...this._rep } };
  }

  deserialize(data) {
    if (data?.rep) {
      for (const [id, val] of Object.entries(data.rep)) {
        if (FACTIONS[id]) this._rep[id] = val;
      }
    }
  }
}
