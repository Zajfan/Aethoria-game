const KEY = 'aethoria_ach';

export const ACHIEVEMENTS = [
  { id:'first_blood',   name:'First Blood',       desc:'Kill your first enemy',         check: s => s.kills >= 1      },
  { id:'serial_killer', name:'Slaughterer',        desc:'Kill 100 enemies',              check: s => s.kills >= 100    },
  { id:'dungeon_in',    name:'Dungeon Delver',      desc:'Enter the dungeon',             check: s => s.dungeons >= 1   },
  { id:'boss_slayer',   name:'Boss Slayer',         desc:'Defeat a boss',                 check: s => s.bosses >= 1     },
  { id:'level_5',       name:'Adventurer',          desc:'Reach level 5',                 check: s => s.level >= 5      },
  { id:'level_10',      name:'Seasoned Hero',       desc:'Reach level 10',                check: s => s.level >= 10     },
  { id:'level_20',      name:'Champion',            desc:'Reach level 20',                check: s => s.level >= 20     },
  { id:'gold_1k',       name:'Gold Hoarder',        desc:'Hold 1000 gold',                check: s => s.gold >= 1000    },
  { id:'quester',       name:'Questbound',          desc:'Complete 5 quests',             check: s => s.quests >= 5     },
  { id:'quester_20',    name:'Legendary Quester',   desc:'Complete 20 quests',            check: s => s.quests >= 20    },
  { id:'crafter',       name:'Artisan',             desc:'Craft your first item',         check: s => s.crafts >= 1     },
  { id:'survivor',      name:'Survivor',            desc:'Survive 10 deaths',             check: s => s.deaths >= 10    },
];

export class AchievementSystem {
  constructor(scene) {
    this.scene = scene;
    this._data = this._load();
  }

  _load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{"unlocked":[],"stats":{}}'); }
    catch (_) { return { unlocked: [], stats: {} }; }
  }

  _save() {
    try { localStorage.setItem(KEY, JSON.stringify(this._data)); } catch (_) {}
  }

  // track an incremental stat
  track(key, delta = 1) {
    this._data.stats[key] = (this._data.stats[key] || 0) + delta;
    this._check();
    this._save();
  }

  // set a direct stat (e.g. current level or gold)
  set(key, value) {
    this._data.stats[key] = value;
    this._check();
    this._save();
  }

  _check() {
    const s   = this._data.stats;
    const ul  = new Set(this._data.unlocked);
    ACHIEVEMENTS.forEach(a => {
      if (!ul.has(a.id) && a.check(s)) {
        ul.add(a.id);
        this._data.unlocked = [...ul];
        this.scene.events.emit('achievement', a);
      }
    });
  }

  getAll() {
    const ul = new Set(this._data.unlocked);
    return ACHIEVEMENTS.map(a => ({ ...a, unlocked: ul.has(a.id) }));
  }

  getStats() { return this._data.stats; }

  serialize()    { return this._data; }
  deserialize(d) { this._data = { ...this._data, ...d }; }
}
