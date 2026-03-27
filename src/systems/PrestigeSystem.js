/**
 * PrestigeSystem.js — Aethoria v0.7
 *
 * Unlocks after completing Act 5 (all 5 shards collected).
 * Allows the player to Prestige — resetting their level/gear but keeping
 * permanent bonuses that carry into every future run.
 *
 * Prestige Ranks 1–10 each grant:
 *   Rank 1:  +15 Max HP, +2 Attack, title "Reborn"
 *   Rank 2:  +20 Max HP, +3 Attack, unlock "Prestige Aura" (visual)
 *   Rank 3:  +1 Mana regen/s, +3 Defense, title "Twice Reborn"
 *   Rank 4:  +25 Max HP, +5 Attack, +1 Skill Point bonus per level
 *   Rank 5:  +30 Max HP, +5 Defense, title "Champion of Aethoria"
 *   Rank 6:  +10% XP gain permanently, +5 Attack
 *   Rank 7:  +50 Max HP, +8 Attack, title "Void Touched"
 *   Rank 8:  Start each run with 500 gold + all skills at rank 1
 *   Rank 9:  +20% ability damage permanently
 *   Rank 10: +100 Max HP, +15 Attack, title "Eternal — Aethoria's Last Hope"
 *             Unlock: cosmetic void particle aura permanently visible
 */

import { CONFIG } from '../config.js';

const KEY = 'aethoria_prestige';

export const PRESTIGE_RANKS = [
  { rank:1,  bonuses:{ maxHp:15, attack:2 },         title:'Reborn',                    special:null },
  { rank:2,  bonuses:{ maxHp:20, attack:3 },         title:null,                         special:'prestige_aura' },
  { rank:3,  bonuses:{ manaRegen:1, defense:3 },     title:'Twice Reborn',              special:null },
  { rank:4,  bonuses:{ maxHp:25, attack:5 },         title:null,                         special:'bonus_skill_point' },
  { rank:5,  bonuses:{ maxHp:30, defense:5 },        title:'Champion of Aethoria',      special:null },
  { rank:6,  bonuses:{ xpMult:0.10, attack:5 },      title:null,                         special:'xp_bonus' },
  { rank:7,  bonuses:{ maxHp:50, attack:8 },         title:'Void Touched',              special:null },
  { rank:8,  bonuses:{ startGold:500 },              title:null,                         special:'head_start' },
  { rank:9,  bonuses:{ abilityDmgMult:0.20 },        title:null,                         special:'ability_power' },
  { rank:10, bonuses:{ maxHp:100, attack:15 },       title:'Eternal — Last Hope',       special:'void_aura' },
];

export class PrestigeSystem {
  constructor(eventBus) {
    this._bus  = eventBus;
    this._data = this._load();
  }

  // ── Unlock & availability ─────────────────────────────────────────────────

  isUnlocked()      { return this._data.unlocked; }
  getCurrentRank()  { return this._data.rank ?? 0; }
  getNextRank()     { return PRESTIGE_RANKS[this._data.rank]; }  // 0-indexed

  /** Call when Act 5 completes to unlock prestige. */
  unlock() {
    if (this._data.unlocked) return;
    this._data.unlocked = true;
    this._save();
    this._bus?.emit('prestigeUnlocked');
    this._bus?.emit('hudLog', { msg: '👁 PRESTIGE UNLOCKED — speak to Elder Lyra to be Reborn.', color: '#aa44ff' });
  }

  // ── Prestige (reset run, gain permanent bonus) ────────────────────────────

  canPrestige() {
    return this._data.unlocked && this._data.rank < PRESTIGE_RANKS.length;
  }

  /**
   * Execute a prestige reset.
   * Returns the permanent bonuses gained so GameScene can apply them.
   */
  doPrestige(player) {
    if (!this.canPrestige()) return null;

    const nextDef = PRESTIGE_RANKS[this._data.rank];
    this._data.rank++;
    this._data.bonuses = this._data.bonuses ?? {};

    // Accumulate permanent bonuses
    for (const [key, val] of Object.entries(nextDef.bonuses)) {
      this._data.bonuses[key] = (this._data.bonuses[key] ?? 0) + val;
    }

    if (nextDef.title) {
      this._data.title = nextDef.title;
    }
    if (nextDef.special) {
      this._data.specials = this._data.specials ?? [];
      this._data.specials.push(nextDef.special);
    }

    this._save();
    this._bus?.emit('prestiged', { rank: this._data.rank, def: nextDef });
    this._bus?.emit('hudLog', {
      msg: `✨ PRESTIGE RANK ${this._data.rank}! ${nextDef.title ? 'New title: ' + nextDef.title : 'Permanent bonuses applied.'}`,
      color: '#aa44ff',
    });

    return { rank: this._data.rank, def: nextDef, bonuses: nextDef.bonuses };
  }

  // ── Apply accumulated bonuses to player on new run ────────────────────────

  applyToPlayer(player) {
    const b = this._data.bonuses ?? {};
    if (b.maxHp)      { player.stats.maxHp  = (player.stats.maxHp  ?? 100) + b.maxHp;    player.stats.hp = player.stats.maxHp; }
    if (b.attack)     { player.stats.attack  = (player.stats.attack  ?? 10)  + b.attack; }
    if (b.defense)    { player.stats.defense = (player.stats.defense ?? 5)   + b.defense; }
    if (b.manaRegen)  { player._prestigeManaRegen = b.manaRegen; }
    if (b.xpMult)     { player._prestigeXpMult    = 1 + b.xpMult; }
    if (b.abilityDmgMult) { player._prestigeAbilityMult = 1 + b.abilityDmgMult; }
    if (b.startGold)  { player.stats.gold = (player.stats.gold ?? 0) + b.startGold; }
  }

  // ── UI data ───────────────────────────────────────────────────────────────

  getUIData() {
    return {
      unlocked: this._data.unlocked,
      rank:     this._data.rank ?? 0,
      maxRank:  PRESTIGE_RANKS.length,
      title:    this._data.title ?? null,
      specials: this._data.specials ?? [],
      bonuses:  this._data.bonuses ?? {},
      nextRank: PRESTIGE_RANKS[this._data.rank] ?? null,
    };
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  _load() {
    try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); }
    catch (_) { return {}; }
  }

  _save() {
    try { localStorage.setItem(KEY, JSON.stringify(this._data)); } catch (_) {}
  }

  serialize()    { return this._data; }
  deserialize(d) { if (d) this._data = { ...this._data, ...d }; }
}
