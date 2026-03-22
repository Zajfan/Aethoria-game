const DB_NAME    = 'AethoriaDB';
const DB_VERSION = 1;
const STORE      = 'saves';
const SLOT       = 'slot1';

export class SaveSystem {
  constructor() { this._db = null; }

  async init() {
    return new Promise((res, rej) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => e.target.result.createObjectStore(STORE, { keyPath:'id' });
      req.onsuccess = e => { this._db = e.target.result; res(); };
      req.onerror   = () => rej(req.error);
    });
  }

  async save(data) {
    if (!this._db) await this.init();
    return new Promise((res, rej) => {
      const tx  = this._db.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).put({ id: SLOT, ts: Date.now(), ...data });
      req.onsuccess = () => res(true);
      req.onerror   = () => rej(req.error);
    });
  }

  async load() {
    if (!this._db) await this.init();
    return new Promise((res, rej) => {
      const tx  = this._db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(SLOT);
      req.onsuccess = () => res(req.result || null);
      req.onerror   = () => rej(req.error);
    });
  }

  async deleteSave() {
    if (!this._db) await this.init();
    return new Promise((res, rej) => {
      const tx  = this._db.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).delete(SLOT);
      req.onsuccess = () => res();
      req.onerror   = () => rej(req.error);
    });
  }

  static snapshotPlayer(player, questSystem) {
    return {
      stats:     { ...player.stats },
      inventory: { ...player.inventory },
      equipment: { ...player.equipment },
      skills:    { ...(player.skills || {}) },
      playerClass: player.playerClass || null,
      x:         player.x,
      y:         player.y,
      quests:    questSystem?.serialize() || {},
    };
  }

  static restorePlayer(player, data) {
    Object.assign(player.stats, data.stats);
    player.inventory  = { ...data.inventory };
    player.equipment  = { ...data.equipment };
    player.skills     = { ...(data.skills || {}) };
    player.playerClass = data.playerClass || null;
    player.setPosition(data.x, data.y);
  }
}
