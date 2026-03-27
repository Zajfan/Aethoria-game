/**
 * AchievementSystem.js — Aethoria v0.7
 *
 * 40+ achievements across 5 rarity tiers.
 * Each achievement can grant a permanent reward (stat bonus, gold, title).
 * Achievements display with icon, rarity colour, and reward in the popup.
 */

const KEY = 'aethoria_ach';

// ── Rarity tiers ──────────────────────────────────────────────────────────────
export const ACH_RARITY = {
  COMMON:    { label:'Common',    color:'#aaaaaa', glow:'rgba(150,150,150,0.3)' },
  UNCOMMON:  { label:'Uncommon',  color:'#44ff44', glow:'rgba(40,180,40,0.35)' },
  RARE:      { label:'Rare',      color:'#4488ff', glow:'rgba(40,100,220,0.4)' },
  EPIC:      { label:'Epic',      color:'#aa44ff', glow:'rgba(140,40,220,0.45)' },
  LEGENDARY: { label:'Legendary', color:'#ffaa00', glow:'rgba(220,140,0,0.5)'  },
};

// ── Achievement definitions ───────────────────────────────────────────────────
export const ACHIEVEMENTS = [
  // ── COMBAT ──────────────────────────────────────────────────────────────────
  { id:'first_blood',    icon:'⚔',  rarity:'COMMON',    cat:'Combat',
    name:'First Blood',        desc:'Land your first kill.',
    check: s => s.kills >= 1,
    reward: null },

  { id:'kills_10',       icon:'⚔',  rarity:'COMMON',    cat:'Combat',
    name:'Bloodied Hands',     desc:'Kill 10 enemies.',
    check: s => s.kills >= 10,
    reward: { type:'gold', amount:50 } },

  { id:'kills_50',       icon:'💀', rarity:'UNCOMMON',  cat:'Combat',
    name:'Slaughterer',        desc:'Kill 50 enemies.',
    check: s => s.kills >= 50,
    reward: { type:'stat', stat:'attack', amount:3, label:'+3 Attack' } },

  { id:'kills_100',      icon:'💀', rarity:'RARE',      cat:'Combat',
    name:'Century of Death',   desc:'Kill 100 enemies.',
    check: s => s.kills >= 100,
    reward: { type:'stat', stat:'attack', amount:5, label:'+5 Attack' } },

  { id:'kills_500',      icon:'☠',  rarity:'EPIC',      cat:'Combat',
    name:'Void\'s Reaper',     desc:'Kill 500 enemies.',
    check: s => s.kills >= 500,
    reward: { type:'stat', stat:'attack', amount:10, label:'+10 Attack' } },

  { id:'kills_1000',     icon:'☠',  rarity:'LEGENDARY', cat:'Combat',
    name:'Unstoppable',        desc:'Kill 1,000 enemies. The realm trembles.',
    check: s => s.kills >= 1000,
    reward: { type:'title', title:'The Unstoppable', label:'Title: The Unstoppable' } },

  { id:'boss_first',     icon:'👑', rarity:'UNCOMMON',  cat:'Combat',
    name:'Boss Slayer',        desc:'Defeat your first boss.',
    check: s => s.bosses >= 1,
    reward: { type:'gold', amount:200 } },

  { id:'boss_5',         icon:'👑', rarity:'RARE',      cat:'Combat',
    name:'Titan Hunter',       desc:'Defeat 5 bosses.',
    check: s => s.bosses >= 5,
    reward: { type:'stat', stat:'maxHp', amount:30, label:'+30 Max HP' } },

  { id:'boss_all',       icon:'🏆', rarity:'LEGENDARY', cat:'Combat',
    name:'Lord of Aethoria',   desc:'Defeat all 5 unique boss types.',
    check: s => s.uniqueBosses >= 5,
    reward: { type:'title', title:'Lord of Aethoria', label:'Title: Lord of Aethoria' } },

  { id:'world_boss',     icon:'🌍', rarity:'EPIC',      cat:'Combat',
    name:'World Ender',        desc:'Slay a World Boss.',
    check: s => s.worldBosses >= 1,
    reward: { type:'stat', stat:'attack', amount:8, label:'+8 Attack' } },

  { id:'no_death_boss',  icon:'🛡', rarity:'EPIC',      cat:'Combat',
    name:'Untouchable',        desc:'Defeat a boss without taking damage.',
    check: s => s.perfectBosses >= 1,
    reward: { type:'stat', stat:'defense', amount:5, label:'+5 Defense' } },

  { id:'combo_5',        icon:'🔥', rarity:'COMMON',    cat:'Combat',
    name:'On a Roll',          desc:'Get a 5× kill combo.',
    check: s => s.maxCombo >= 5,
    reward: null },

  { id:'combo_20',       icon:'🔥', rarity:'RARE',      cat:'Combat',
    name:'Unstoppable Fury',   desc:'Get a 20× kill combo.',
    check: s => s.maxCombo >= 20,
    reward: { type:'gold', amount:500 } },

  { id:'status_master',  icon:'☣',  rarity:'UNCOMMON',  cat:'Combat',
    name:'Affliction Dealer',  desc:'Apply 50 status effects (any type).',
    check: s => s.statusesApplied >= 50,
    reward: { type:'stat', stat:'attack', amount:2, label:'+2 Attack' } },

  // ── EXPLORATION ─────────────────────────────────────────────────────────────
  { id:'dungeon_first',  icon:'🏚', rarity:'COMMON',    cat:'Explore',
    name:'Dungeon Delver',     desc:'Enter the dungeon for the first time.',
    check: s => s.dungeons >= 1,
    reward: { type:'gold', amount:100 } },

  { id:'dungeon_10',     icon:'🏚', rarity:'UNCOMMON',  cat:'Explore',
    name:'Veteran Delver',     desc:'Complete 10 dungeon runs.',
    check: s => s.dungeons >= 10,
    reward: { type:'stat', stat:'maxHp', amount:20, label:'+20 Max HP' } },

  { id:'floor_5',        icon:'⬇', rarity:'RARE',      cat:'Explore',
    name:'Abyss Walker',       desc:'Reach dungeon floor 5.',
    check: s => s.maxDungeonFloor >= 5,
    reward: { type:'stat', stat:'defense', amount:4, label:'+4 Defense' } },

  { id:'regions_all',    icon:'🗺', rarity:'EPIC',      cat:'Explore',
    name:'World Traveller',    desc:'Visit all 5 regions of Aethoria.',
    check: s => s.regionsVisited >= 5,
    reward: { type:'stat', stat:'speed', amount:0.15, label:'+15% Speed' } },

  { id:'saltmere',       icon:'⚓', rarity:'UNCOMMON',  cat:'Explore',
    name:'Coastal Wanderer',   desc:'Reach Saltmere on the Shattered Coast.',
    check: s => s.saltmereVisited >= 1,
    reward: { type:'gold', amount:300 } },

  { id:'poi_10',         icon:'📍', rarity:'UNCOMMON',  cat:'Explore',
    name:'Explorer',           desc:'Discover 10 Points of Interest.',
    check: s => s.poisDiscovered >= 10,
    reward: { type:'gold', amount:250 } },

  { id:'poi_all',        icon:'🌟', rarity:'EPIC',      cat:'Explore',
    name:'Cartographer',       desc:'Discover all 28 Points of Interest.',
    check: s => s.poisDiscovered >= 28,
    reward: { type:'title', title:'The Cartographer', label:'Title: The Cartographer' } },

  { id:'shrine_10',      icon:'✦',  rarity:'UNCOMMON',  cat:'Explore',
    name:'Pilgrim',            desc:'Pray at 10 shrines.',
    check: s => s.shrinesUsed >= 10,
    reward: { type:'stat', stat:'maxHp', amount:25, label:'+25 Max HP' } },

  { id:'well_5',         icon:'◎',  rarity:'COMMON',    cat:'Explore',
    name:'Well-Rested',        desc:'Drink from 5 ancient wells.',
    check: s => s.wellsUsed >= 5,
    reward: null },

  // ── PROGRESSION ─────────────────────────────────────────────────────────────
  { id:'level_5',        icon:'⭐', rarity:'COMMON',    cat:'Progress',
    name:'Adventurer',         desc:'Reach level 5.',
    check: s => s.level >= 5,
    reward: { type:'gold', amount:100 } },

  { id:'level_10',       icon:'⭐', rarity:'UNCOMMON',  cat:'Progress',
    name:'Seasoned Hero',      desc:'Reach level 10.',
    check: s => s.level >= 10,
    reward: { type:'stat', stat:'maxHp', amount:40, label:'+40 Max HP' } },

  { id:'level_20',       icon:'🌟', rarity:'RARE',      cat:'Progress',
    name:'Champion',           desc:'Reach level 20.',
    check: s => s.level >= 20,
    reward: { type:'stat', stat:'attack', amount:5, label:'+5 Attack' } },

  { id:'level_30',       icon:'💫', rarity:'EPIC',      cat:'Progress',
    name:'Legend',             desc:'Reach level 30.',
    check: s => s.level >= 30,
    reward: { type:'title', title:'The Legendary', label:'Title: The Legendary' } },

  { id:'skill_tree_full', icon:'⚡', rarity:'EPIC',     cat:'Progress',
    name:'Master of Arts',     desc:'Max out all 8 skills for your class.',
    check: s => s.skillsMaxed >= 8,
    reward: { type:'stat', stat:'attack', amount:8, label:'+8 Attack' } },

  { id:'act_3',          icon:'📖', rarity:'RARE',      cat:'Progress',
    name:'Deeper Truth',       desc:'Complete Act III.',
    check: s => s.act >= 3,
    reward: { type:'gold', amount:1000 } },

  { id:'act_5',          icon:'👁', rarity:'LEGENDARY', cat:'Progress',
    name:'The Last Shard',     desc:'Complete Act V. The truth is known.',
    check: s => s.act >= 5,
    reward: { type:'title', title:'Shard Bearer', label:'Title: Shard Bearer' } },

  // ── ECONOMY ─────────────────────────────────────────────────────────────────
  { id:'gold_500',       icon:'💰', rarity:'COMMON',    cat:'Economy',
    name:'Coin Collector',     desc:'Accumulate 500 gold.',
    check: s => s.gold >= 500,
    reward: null },

  { id:'gold_5000',      icon:'💰', rarity:'UNCOMMON',  cat:'Economy',
    name:'Gold Hoarder',       desc:'Accumulate 5,000 gold.',
    check: s => s.gold >= 5000,
    reward: null },

  { id:'craft_5',        icon:'⚙',  rarity:'UNCOMMON',  cat:'Economy',
    name:'Artisan',            desc:'Craft 5 items.',
    check: s => s.crafts >= 5,
    reward: { type:'gold', amount:300 } },

  { id:'legendary_item', icon:'✨', rarity:'LEGENDARY', cat:'Economy',
    name:'Touched by Legend',  desc:'Obtain a Legendary item.',
    check: s => s.legendaryItems >= 1,
    reward: { type:'title', title:'The Blessed', label:'Title: The Blessed' } },

  { id:'enchant_5',      icon:'🔮', rarity:'RARE',      cat:'Economy',
    name:'Runesmith',          desc:'Enchant 5 items.',
    check: s => s.enchants >= 5,
    reward: { type:'stat', stat:'attack', amount:3, label:'+3 Attack' } },

  // ── LORE ────────────────────────────────────────────────────────────────────
  { id:'scrolls_5',      icon:'📜', rarity:'UNCOMMON',  cat:'Lore',
    name:'Archivist',          desc:'Read 5 lore scrolls.',
    check: s => s.scrollsRead >= 5,
    reward: { type:'gold', amount:200 } },

  { id:'codex_50',       icon:'📚', rarity:'RARE',      cat:'Lore',
    name:'Scholar',            desc:'Unlock 50% of the Codex.',
    check: s => s.codexPct >= 50,
    reward: { type:'stat', stat:'maxMana', amount:20, label:'+20 Max Mana' } },

  { id:'codex_full',     icon:'📚', rarity:'LEGENDARY', cat:'Lore',
    name:'Keeper of Truth',    desc:'Complete the entire Codex.',
    check: s => s.codexPct >= 100,
    reward: { type:'title', title:'Keeper of Truth', label:'Title: Keeper of Truth' } },

  { id:'npc_all',        icon:'👥', rarity:'RARE',      cat:'Lore',
    name:'Well Connected',     desc:'Talk to all 8 NPCs across both settlements.',
    check: s => s.npcsSpoken >= 8,
    reward: { type:'gold', amount:500 } },

  // ── SURVIVAL ────────────────────────────────────────────────────────────────
  { id:'survive_night',  icon:'🌙', rarity:'COMMON',    cat:'Survival',
    name:'Night Owl',          desc:'Survive until dawn.',
    check: s => s.nightsSurvived >= 1,
    reward: null },

  { id:'survive_10',     icon:'🌙', rarity:'UNCOMMON',  cat:'Survival',
    name:'Enduring',           desc:'Survive 10 nights.',
    check: s => s.nightsSurvived >= 10,
    reward: { type:'stat', stat:'maxHp', amount:20, label:'+20 Max HP' } },

  { id:'weather_storm',  icon:'⛈', rarity:'UNCOMMON',  cat:'Survival',
    name:'Storm Chaser',       desc:'Kill 20 enemies during a Storm.',
    check: s => s.stormKills >= 20,
    reward: { type:'stat', stat:'attack', amount:2, label:'+2 Attack' } },

  { id:'weather_blizzard', icon:'❄', rarity:'RARE',    cat:'Survival',
    name:'Frostborn',          desc:'Kill 10 enemies during a Blizzard.',
    check: s => s.blizzardKills >= 10,
    reward: { type:'stat', stat:'defense', amount:3, label:'+3 Defense' } },
];

// ── AchievementSystem class ───────────────────────────────────────────────────

export class AchievementSystem {
  constructor(eventBus) {
    this._bus  = eventBus;
    this._data = this._load();

    // Wire events if bus provided
    if (eventBus) {
      eventBus.on('enemyKilled',    ({ typeKey }) => {
        this.track('kills');
        if (['VOID_KNIGHT','STONE_COLOSSUS','LICH_KING','FOREST_ANCIENT','VOID_HERALD'].includes(typeKey)) {
          this.track('bosses');
          this._data.stats.uniqueBosses = (this._data.stats.uniqueBosses ?? 0);
          const ub = this._data.stats._bossTypes ?? new Set();
          ub.add(typeKey);
          this._data.stats._bossTypes = ub;
          this._data.stats.uniqueBosses = ub.size;
        }
      });
      eventBus.on('worldBossSlain', ()        => this.track('worldBosses'));
      eventBus.on('combo',          ({ count })=> {
        if (count > (this._data.stats.maxCombo ?? 0)) this.set('maxCombo', count);
      });
      eventBus.on('statusApplied',  ()        => this.track('statusesApplied'));
      eventBus.on('dungeonEntered', ()        => this.track('dungeons'));
      eventBus.on('dungeonFloor',   ({ floor})=> {
        if (floor > (this._data.stats.maxDungeonFloor ?? 0)) this.set('maxDungeonFloor', floor);
      });
      eventBus.on('regionEntered',  ({ region, firstVisit }) => {
        if (firstVisit) {
          this.track('regionsVisited');
          if (region.id === 'SHATTERED') this.set('saltmereVisited', 1);
        }
      });
      eventBus.on('poiDiscovered',  ()        => this.track('poisDiscovered'));
      eventBus.on('shrineUsed',     ()        => this.track('shrinesUsed'));
      eventBus.on('wellUsed',       ()        => this.track('wellsUsed'));
      eventBus.on('levelUp',        lv        => this.set('level', lv));
      eventBus.on('actAdvanced',    ({ actId })=> this.set('act', actId));
      eventBus.on('questDone',      ()        => this.track('quests'));
      eventBus.on('itemCrafted',    ()        => this.track('crafts'));
      eventBus.on('itemEnchanted',  ()        => this.track('enchants'));
      eventBus.on('scrollRead',     ()        => this.track('scrollsRead'));
      eventBus.on('codexProgress',  ({ pct }) => this.set('codexPct', pct));
      eventBus.on('npcDialogue',    ()        => this.track('npcsSpoken'));
      eventBus.on('nightSurvived',  ()        => this.track('nightsSurvived'));
      eventBus.on('stormKill',      ()        => this.track('stormKills'));
      eventBus.on('blizzardKill',   ()        => this.track('blizzardKills'));
      eventBus.on('legendaryItem',  ()        => this.track('legendaryItems'));
      eventBus.on('skillMaxed',     ()        => this.track('skillsMaxed'));
      eventBus.on('perfectBoss',    ()        => this.track('perfectBosses'));
    }
  }

  track(key, delta = 1) {
    this._data.stats[key] = (this._data.stats[key] || 0) + delta;
    this._check();
    this._save();
  }

  set(key, value) {
    this._data.stats[key] = value;
    this._check();
    this._save();
  }

  updateGold(gold) { this.set('gold', gold); }

  _check() {
    const s  = this._data.stats;
    const ul = new Set(this._data.unlocked);
    ACHIEVEMENTS.forEach(a => {
      if (!ul.has(a.id) && a.check(s)) {
        ul.add(a.id);
        this._data.unlocked = [...ul];
        this._bus?.emit('achievement', a);
      }
    });
  }

  getAll() {
    const ul = new Set(this._data.unlocked);
    return ACHIEVEMENTS.map(a => ({ ...a, unlocked: ul.has(a.id) }));
  }

  getUnlockedCount() { return this._data.unlocked.length; }
  getTotalCount()    { return ACHIEVEMENTS.length; }
  getStats()         { return this._data.stats; }

  _load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{"unlocked":[],"stats":{}}'); }
    catch (_) { return { unlocked: [], stats: {} }; }
  }

  _save() {
    try {
      // Can't JSON.stringify a Set — convert first
      const saveable = { ...this._data, stats: { ...this._data.stats } };
      delete saveable.stats._bossTypes;
      localStorage.setItem(KEY, JSON.stringify(saveable));
    } catch (_) {}
  }

  serialize()    { return { unlocked: this._data.unlocked, stats: { ...this._data.stats, _bossTypes: undefined } }; }
  deserialize(d) { if (d) { this._data.unlocked = d.unlocked ?? []; this._data.stats = d.stats ?? {}; } }
}
