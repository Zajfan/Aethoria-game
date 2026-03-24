/**
 * EventBus.js
 * Lightweight pub/sub event emitter replacing Phaser's event system.
 * Used for decoupled communication between game systems (UI, world, combat, etc).
 */

class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();

    /** @type {Map<string, Set<Function>>} tracks once-wrappers for cleanup */
    this._onceWrappers = new Map();
  }

  /**
   * Subscribe to an event.
   * @param {string} event
   * @param {Function} callback
   * @returns {this} for chaining
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
    return this;
  }

  /**
   * Unsubscribe from an event.
   * Safely no-ops if the listener was never registered.
   * @param {string} event
   * @param {Function} callback
   * @returns {this} for chaining
   */
  off(event, callback) {
    const set = this._listeners.get(event);
    if (set) {
      set.delete(callback);
      if (set.size === 0) this._listeners.delete(event);
    }

    // Also clean up any once-wrapper registered for this callback
    const wrappers = this._onceWrappers.get(event);
    if (wrappers) {
      wrappers.delete(callback);
      if (wrappers.size === 0) this._onceWrappers.delete(event);
    }
    return this;
  }

  /**
   * Emit an event, invoking all registered listeners.
   * @param {string} event
   * @param {...*} args  Arguments forwarded to each listener
   * @returns {this} for chaining
   */
  emit(event, ...args) {
    const set = this._listeners.get(event);
    if (!set) return this;

    // Snapshot the set so listeners added/removed mid-emit are safe
    for (const cb of [...set]) {
      try {
        cb(...args);
      } catch (err) {
        console.error(`[EventBus] Error in listener for "${event}":`, err);
      }
    }
    return this;
  }

  /**
   * Subscribe to an event exactly once; auto-unsubscribes after first call.
   * @param {string} event
   * @param {Function} callback
   * @returns {this} for chaining
   */
  once(event, callback) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      // Remove the wrapper→original mapping
      const wrappers = this._onceWrappers.get(event);
      if (wrappers) wrappers.delete(callback);
      callback(...args);
    };

    // Store wrapper keyed by original so off(event, original) still works
    if (!this._onceWrappers.has(event)) {
      this._onceWrappers.set(event, new Map());
    }
    this._onceWrappers.get(event).set(callback, wrapper);

    this.on(event, wrapper);
    return this;
  }

  /**
   * Remove all listeners, optionally scoped to a single event.
   * @param {string} [event]
   */
  clear(event) {
    if (event) {
      this._listeners.delete(event);
      this._onceWrappers.delete(event);
    } else {
      this._listeners.clear();
      this._onceWrappers.clear();
    }
  }

  /** @returns {number} total registered listener count across all events */
  get listenerCount() {
    let n = 0;
    for (const set of this._listeners.values()) n += set.size;
    return n;
  }
}

// Singleton shared across the whole game
export const eventBus = new EventBus();

// Named exports so consumers can also instantiate private buses if needed
export { EventBus };
export default eventBus;

// -------------------------------------------------------------------
// Commonly-used event name constants (add more as systems are built)
// -------------------------------------------------------------------
export const Events = {
  // Scene lifecycle
  SCENE_READY:        'scene:ready',
  SCENE_TRANSITION:   'scene:transition',

  // Player
  PLAYER_MOVED:       'player:moved',
  PLAYER_LEVEL_UP:    'player:levelUp',
  PLAYER_DIED:        'player:died',
  PLAYER_HEALTH_CHANGE: 'player:healthChange',
  PLAYER_MANA_CHANGE: 'player:manaChange',

  // Combat
  DAMAGE_DEALT:       'combat:damageDealt',
  ENTITY_DIED:        'combat:entityDied',
  COMBAT_START:       'combat:start',
  COMBAT_END:         'combat:end',

  // Inventory / loot
  ITEM_PICKED_UP:     'inventory:itemPickedUp',
  ITEM_EQUIPPED:      'inventory:itemEquipped',
  ITEM_USED:          'inventory:itemUsed',
  INVENTORY_CHANGED:  'inventory:changed',

  // UI
  UI_OPEN_INVENTORY:  'ui:openInventory',
  UI_CLOSE_INVENTORY: 'ui:closeInventory',
  UI_OPEN_MAP:        'ui:openMap',
  UI_CLOSE_MAP:       'ui:closeMap',
  UI_DIALOG_OPEN:     'ui:dialogOpen',
  UI_DIALOG_CLOSE:    'ui:dialogClose',

  // World
  QUEST_UPDATED:      'quest:updated',
  INTERACT_OBJECT:    'world:interactObject',
};
