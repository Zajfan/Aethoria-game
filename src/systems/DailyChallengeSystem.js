/**
 * DailyChallengeSystem.js — Aethoria v0.7
 *
 * Generates daily and weekly challenges seeded by the current date.
 * Same seed = same challenges for every player on the same day.
 *
 * Daily:  3 challenges, reset at midnight. Reward: gold + XP.
 * Weekly: 2 harder challenges, reset Monday. Reward: rare item + prestige XP.
 *
 * Challenge types:
 *   KILL_N      Kill N enemies of a specific type
 *   KILL_TOTAL  Kill N enemies total
 *   NO_DAMAGE   Kill a boss without taking damage
 *   COLLECT_N   Collect N of a specific item
 *   FLOOR_N     Reach dungeon floor N
 *   WEATHER     Kill N enemies during specific weather
 *   REGION      Explore a specific region
 */

import { CONFIG } from '../config.js';

const KEY = 'aethoria_daily';

// ── Seeded random ─────────────────────────────────────────────────────────────

function seededRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function dateSeed(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function weekSeed() {
  const d = new Date();
  const dayOfWeek = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
  return monday.getFullYear() * 10000 + (monday.getMonth() + 1) * 100 + monday.getDate();
}

// ── Challenge generators ──────────────────────────────────────────────────────

const ENEMY_KEYS = ['GOBLIN','WOLF','SKELETON','TROLL','BANDIT','WRAITH','GOLEM','CULTIST','DRAKE','BERSERKER','PHANTOM'];
const ITEM_KEYS  = ['gem','crystal','hide','fang','bones','herb'];
const WEATHER_TYPES = ['STORM','FOG','RAIN','BLIZZARD'];
const REGION_IDS = ['ELANDOR','WHISPERING','ASHVEIL','SHATTERED'];

function genChallenge(rng, isWeekly) {
  const roll = rng();

  if (roll < 0.25) {
    const enemy = ENEMY_KEYS[Math.floor(rng() * ENEMY_KEYS.length)];
    const count = isWeekly ? 15 + Math.floor(rng() * 20) : 5 + Math.floor(rng() * 10);
    return {
      type: 'KILL_N', icon: '⚔',
      title: `Hunt the ${CONFIG.ENEMY_TYPES[enemy]?.name ?? enemy}s`,
      desc: `Kill ${count} ${CONFIG.ENEMY_TYPES[enemy]?.name ?? enemy}s.`,
      target: enemy, needed: count, progress: 0,
      reward: isWeekly
        ? { xp: count * 25, gold: count * 15, item: 'gem' }
        : { xp: count * 12, gold: count * 8 },
    };
  }

  if (roll < 0.45) {
    const count = isWeekly ? 40 + Math.floor(rng() * 30) : 15 + Math.floor(rng() * 15);
    return {
      type: 'KILL_TOTAL', icon: '💀',
      title: 'Slaughter',
      desc: `Kill ${count} enemies of any type.`,
      target: 'any', needed: count, progress: 0,
      reward: isWeekly
        ? { xp: count * 20, gold: count * 12, item: 'crystal' }
        : { xp: count * 10, gold: count * 6 },
    };
  }

  if (roll < 0.60) {
    const item = ITEM_KEYS[Math.floor(rng() * ITEM_KEYS.length)];
    const count = isWeekly ? 8 + Math.floor(rng() * 6) : 3 + Math.floor(rng() * 4);
    return {
      type: 'COLLECT_N', icon: '📦',
      title: `Gather ${CONFIG.ITEMS[item]?.name ?? item}`,
      desc: `Collect ${count} ${CONFIG.ITEMS[item]?.name ?? item}.`,
      target: item, needed: count, progress: 0,
      reward: isWeekly
        ? { xp: 600, gold: 500, item: 'runesword' }
        : { xp: 200, gold: 150 },
    };
  }

  if (roll < 0.73) {
    const floor = isWeekly ? 4 + Math.floor(rng() * 2) : 2 + Math.floor(rng() * 2);
    return {
      type: 'FLOOR_N', icon: '⬇',
      title: `Delve Deep`,
      desc: `Reach dungeon floor ${floor}.`,
      target: floor, needed: 1, progress: 0,
      reward: isWeekly
        ? { xp: 800, gold: 600, item: 'voidessence' }
        : { xp: 350, gold: 250 },
    };
  }

  if (roll < 0.86) {
    const weather = WEATHER_TYPES[Math.floor(rng() * WEATHER_TYPES.length)];
    const count   = isWeekly ? 20 : 8;
    return {
      type: 'WEATHER', icon: weather === 'STORM' ? '⛈' : weather === 'BLIZZARD' ? '❄' : weather === 'FOG' ? '🌫' : '🌧',
      title: `${weather} Hunter`,
      desc: `Kill ${count} enemies during ${weather} weather.`,
      target: weather, needed: count, progress: 0,
      reward: isWeekly
        ? { xp: 700, gold: 500, item: 'soulstone' }
        : { xp: 300, gold: 200 },
    };
  }

  const region = REGION_IDS[Math.floor(rng() * REGION_IDS.length)];
  return {
    type: 'REGION', icon: '🗺',
    title: `Venture Forth`,
    desc: `Reach the ${region.replace('_',' ')} region and return.`,
    target: region, needed: 1, progress: 0,
    reward: isWeekly
      ? { xp: 650, gold: 450, item: 'dragonscale' }
      : { xp: 250, gold: 180 },
  };
}

// ── DailyChallengeSystem ──────────────────────────────────────────────────────

export class DailyChallengeSystem {
  constructor(eventBus) {
    this._bus     = eventBus;
    this._daily   = [];
    this._weekly  = [];
    this._cache   = this._load();

    this._generateChallenges();
    this._wireEvents();
  }

  // ── Generate ──────────────────────────────────────────────────────────────

  _generateChallenges() {
    const dSeed = dateSeed();
    const wSeed = weekSeed();

    // Only regenerate if date changed
    if (this._cache.dailySeed !== dSeed) {
      const rng = seededRng(dSeed);
      this._daily = [genChallenge(rng, false), genChallenge(rng, false), genChallenge(rng, false)];
      this._cache.dailySeed      = dSeed;
      this._cache.dailyProgress  = {};
      this._cache.dailyComplete  = {};
    } else {
      const rng = seededRng(dSeed);
      this._daily = [genChallenge(rng, false), genChallenge(rng, false), genChallenge(rng, false)];
      // Restore progress
      this._daily.forEach((ch, i) => {
        ch.progress = this._cache.dailyProgress?.[i] ?? 0;
        ch.done     = !!this._cache.dailyComplete?.[i];
      });
    }

    if (this._cache.weeklySeed !== wSeed) {
      const rng2 = seededRng(wSeed + 99999);
      this._weekly = [genChallenge(rng2, true), genChallenge(rng2, true)];
      this._cache.weeklySeed      = wSeed;
      this._cache.weeklyProgress  = {};
      this._cache.weeklyComplete  = {};
    } else {
      const rng2 = seededRng(wSeed + 99999);
      this._weekly = [genChallenge(rng2, true), genChallenge(rng2, true)];
      this._weekly.forEach((ch, i) => {
        ch.progress = this._cache.weeklyProgress?.[i] ?? 0;
        ch.done     = !!this._cache.weeklyComplete?.[i];
      });
    }
  }

  // ── Event wiring ──────────────────────────────────────────────────────────

  _wireEvents() {
    if (!this._bus) return;

    this._bus.on('enemyKilled', ({ typeKey }) => {
      this._progressKill(typeKey);
    });

    this._bus.on('itemPickedUp', ({ itemKey }) => {
      this._progressCollect(itemKey);
    });

    this._bus.on('dungeonFloor', ({ floor }) => {
      this._progressFloor(floor);
    });

    this._bus.on('regionEntered', ({ region }) => {
      this._progressRegion(region.id);
    });

    this._bus.on('weatherKill', ({ weather }) => {
      this._progressWeather(weather);
    });
  }

  _progressKill(typeKey) {
    const all = [...this._daily, ...this._weekly];
    all.forEach((ch, i) => {
      if (ch.done) return;
      if (ch.type === 'KILL_N' && ch.target === typeKey) this._advance(ch, i < 3 ? 'daily' : 'weekly', i < 3 ? i : i - 3);
      if (ch.type === 'KILL_TOTAL') this._advance(ch, i < 3 ? 'daily' : 'weekly', i < 3 ? i : i - 3);
    });
  }

  _progressCollect(itemKey) {
    [...this._daily, ...this._weekly].forEach((ch, i) => {
      if (ch.done || ch.type !== 'COLLECT_N' || ch.target !== itemKey) return;
      this._advance(ch, i < 3 ? 'daily' : 'weekly', i < 3 ? i : i - 3);
    });
  }

  _progressFloor(floor) {
    [...this._daily, ...this._weekly].forEach((ch, i) => {
      if (ch.done || ch.type !== 'FLOOR_N') return;
      if (floor >= ch.target) this._advance(ch, i < 3 ? 'daily' : 'weekly', i < 3 ? i : i - 3, ch.needed);
    });
  }

  _progressRegion(regionId) {
    [...this._daily, ...this._weekly].forEach((ch, i) => {
      if (ch.done || ch.type !== 'REGION' || ch.target !== regionId) return;
      this._advance(ch, i < 3 ? 'daily' : 'weekly', i < 3 ? i : i - 3, 1);
    });
  }

  _progressWeather(weather) {
    [...this._daily, ...this._weekly].forEach((ch, i) => {
      if (ch.done || ch.type !== 'WEATHER' || ch.target !== weather) return;
      this._advance(ch, i < 3 ? 'daily' : 'weekly', i < 3 ? i : i - 3);
    });
  }

  _advance(ch, kind, idx, amount = 1) {
    ch.progress = Math.min(ch.needed, (ch.progress ?? 0) + amount);
    // Save progress
    if (kind === 'daily')  this._cache.dailyProgress  = this._cache.dailyProgress  ?? {};
    if (kind === 'weekly') this._cache.weeklyProgress = this._cache.weeklyProgress ?? {};
    (kind === 'daily' ? this._cache.dailyProgress : this._cache.weeklyProgress)[idx] = ch.progress;
    this._save();

    this._bus?.emit('challengeProgress', { ch, kind });

    if (ch.progress >= ch.needed && !ch.done) {
      ch.done = true;
      (kind === 'daily' ? this._cache.dailyComplete : this._cache.weeklyComplete)[idx] = true;
      this._save();
      this._bus?.emit('challengeComplete', { ch, kind });
      this._grantReward(ch);
    }
  }

  _grantReward(ch) {
    const r = ch.reward;
    if (!r) return;
    if (r.xp)   this._bus?.emit('challengeXP',   { amount: r.xp });
    if (r.gold) this._bus?.emit('challengeGold',  { amount: r.gold });
    if (r.item) this._bus?.emit('spawnLoot', { x: 128.5, y: 0.3, z: 128.5, itemKey: r.item });
    this._bus?.emit('hudLog', {
      msg: `✅ Challenge complete! +${r.xp ?? 0}XP +${r.gold ?? 0}g${r.item ? ' + ' + r.item : ''}`,
      color: '#44ff88',
    });
  }

  // ── Accessors ─────────────────────────────────────────────────────────────

  getDaily()  { return this._daily; }
  getWeekly() { return this._weekly; }

  getTimeUntilReset() {
    const now       = new Date();
    const midnight  = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msLeft    = midnight - now;
    const h = Math.floor(msLeft / 3600000);
    const m = Math.floor((msLeft % 3600000) / 60000);
    return `${h}h ${m}m`;
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  _load() {
    try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); }
    catch (_) { return {}; }
  }

  _save() {
    try { localStorage.setItem(KEY, JSON.stringify(this._cache)); } catch (_) {}
  }
}
