/**
 * SlayerSystem.js  — Aethoria v0.5
 *
 * RuneScape-style Slayer system.
 *
 * Master Theron assigns monster-hunt tasks.
 * Completing tasks earns Slayer Points redeemable in the Slayer Shop.
 * Higher-level tasks unlock as the player progresses.
 *
 * Features:
 *   • Task assignment gated by player combat level
 *   • Task streak bonuses (every 5th task = double points)
 *   • Task cancellation (costs 30 pts)
 *   • Slayer Shop: unique items, dungeon unlocks, permanent bonuses
 *   • Slayer helmet: +10% damage on active task
 *   • Event bus integration for kill tracking
 *
 * Integration:
 *   slayerSys.requestTask(player)             → task object or null
 *   slayerSys.cancelTask()                    → bool (costs pts)
 *   slayerSys.onKill(enemyTypeKey)            → progress; fires taskComplete if done
 *   slayerSys.buyFromShop(shopItemId, player) → bool
 *   slayerSys.hasUnlock(id)                   → bool
 *   slayerSys.serialize() / deserialize()
 */

import { CONFIG   } from '../config.js';
import { AIMemory } from './AIMemory.js';

const TASKS       = CONFIG.SLAYER_TASKS;
const SHOP        = CONFIG.SLAYER_SHOP;
const CANCEL_COST = 30;
const STREAK_BONUS_INTERVAL = 5; // every 5th task = 2× points

export class SlayerSystem {
  constructor(scene) {
    this.scene = scene;

    this.points       = 0;
    this.tasksTotal   = 0;
    this.streak       = 0;     // consecutive tasks completed without cancel
    this.currentTask  = null;  // { target, count, progress, pts, reward } | null
    this._unlocks     = new Set(); // purchased unlock IDs
    this._taskHistory = [];    // last 10 task results for UI
  }

  // ── Task request ───────────────────────────────────────────────────────────

  /**
   * Assign a new Slayer task appropriate for the player's level.
   * Returns the task object or null if already has a task.
   */
  requestTask(player) {
    if (this.currentTask) return this.currentTask; // already assigned

    const combatLevel = player?.stats?.level ?? 1;

    // Filter eligible tasks by combat level
    const eligible = TASKS.filter(t => combatLevel >= t.minLevel);
    if (eligible.length === 0) return null;

    // Weighted random: prefer tasks closer to player level
    const tpl = eligible[Math.floor(Math.random() * eligible.length)];

    const countOptions = tpl.count;
    const count = countOptions[Math.floor(Math.random() * countOptions.length)];

    // Streak milestone check
    const streakBonus = (this.streak + 1) % STREAK_BONUS_INTERVAL === 0;

    this.currentTask = {
      target:      tpl.target,
      targetLabel: CONFIG.ENEMY_TYPES[tpl.target]?.name ?? tpl.target,
      count,
      progress:    0,
      pts:         streakBonus ? tpl.pts * 2 : tpl.pts,
      reward:      { ...tpl.reward },
      streakBonus,
      assignedAt:  Date.now(),
    };

    AIMemory.recordEvent('slayer', `Task: ${this.currentTask.targetLabel} ×${count}`);
    this.scene.events.emit('slayerTaskAssigned', this.currentTask);
    return this.currentTask;
  }

  // ── Kill tracking ──────────────────────────────────────────────────────────

  /** Call on every enemy kill. Advances task if type matches. */
  onKill(enemyTypeKey) {
    if (!this.currentTask) return;
    if (this.currentTask.target !== enemyTypeKey) return;

    this.currentTask.progress++;
    this.scene.events.emit('slayerProgress', {
      task:     this.currentTask,
      progress: this.currentTask.progress,
      needed:   this.currentTask.count,
    });

    if (this.currentTask.progress >= this.currentTask.count) {
      this._completeTask();
    }
  }

  // ── Task completion ────────────────────────────────────────────────────────

  _completeTask() {
    const task = this.currentTask;
    this.points     += task.pts;
    this.tasksTotal++;
    this.streak++;

    // Grant reward
    const player = this.scene.player;
    if (player) {
      player.gainXP(task.reward.xp ?? 0);
      if (task.reward.gold) {
        player.stats.gold = (player.stats.gold ?? 0) + task.reward.gold;
        player.eventBus?.emit('statsChanged', player.stats);
      }
      if (task.reward.item) player.addItem(task.reward.item);
    }

    this._taskHistory.unshift({ ...task, completedAt: Date.now() });
    if (this._taskHistory.length > 10) this._taskHistory.pop();

    AIMemory.recordEvent('slayer', `Completed: ${task.targetLabel} ×${task.count} (+${task.pts} pts)`);
    this.scene.events.emit('slayerTaskComplete', task);
    this.scene.events.emit('achievement', {
      name: `Slayer: ${task.targetLabel}`,
      desc: `Completed Slayer task: kill ${task.count} ${task.targetLabel}.`,
    });

    this.currentTask = null;

    // Milestone achievements
    if (this.tasksTotal === 10)  this.scene.events.emit('achievement', { name: 'Slayer Initiate',  desc: '10 Slayer tasks completed.' });
    if (this.tasksTotal === 50)  this.scene.events.emit('achievement', { name: 'Slayer Adept',     desc: '50 Slayer tasks completed.' });
    if (this.tasksTotal === 100) this.scene.events.emit('achievement', { name: 'Slayer Master',    desc: '100 Slayer tasks completed.' });
    if (this.streak === 5)       this.scene.events.emit('achievement', { name: 'On a Roll',        desc: '5 tasks completed in a row.' });
    if (this.streak === 25)      this.scene.events.emit('achievement', { name: 'Relentless',       desc: '25 tasks completed in a row.' });
    if (this.points >= 1000)     this.scene.events.emit('achievement', { name: 'Points of Power',  desc: '1000 Slayer Points earned.' });
  }

  // ── Task cancellation ──────────────────────────────────────────────────────

  /**
   * Cancel the current task. Costs CANCEL_COST points.
   * Returns false if not enough points or no active task.
   */
  cancelTask() {
    if (!this.currentTask) return false;
    if (this.points < CANCEL_COST) {
      this.scene.events.emit('slayerCancelFail', `Need ${CANCEL_COST} points to cancel.`);
      return false;
    }
    this.points -= CANCEL_COST;
    this.streak  = 0; // break streak
    this.scene.events.emit('slayerTaskCancelled', this.currentTask);
    this.currentTask = null;
    return true;
  }

  // ── Slayer Shop ────────────────────────────────────────────────────────────

  /**
   * Purchase an item from the Slayer Shop.
   * Returns { ok, reason }.
   */
  buyFromShop(shopItemId, player) {
    const shopItem = SHOP.find(s => s.id === shopItemId);
    if (!shopItem) return { ok: false, reason: 'Not found.' };
    if (this.points < shopItem.pts) {
      return { ok: false, reason: `Need ${shopItem.pts} pts (have ${this.points}).` };
    }

    this.points -= shopItem.pts;
    this._unlocks.add(shopItemId);
    player?.addItem(shopItem.item);

    AIMemory.recordEvent('slayer', `Bought: ${shopItem.name}`);
    this.scene.events.emit('slayerShopBuy', shopItem);
    return { ok: true, reason: '' };
  }

  /** Check if a shop unlock has been purchased. */
  hasUnlock(id) {
    return this._unlocks.has(id);
  }

  /** True if player is on a Slayer task for the given enemy type. */
  isTaskTarget(enemyTypeKey) {
    return this.currentTask?.target === enemyTypeKey;
  }

  /**
   * Returns the damage multiplier for combat (1.10 if on task and helm purchased).
   */
  damageMultiplier(enemyTypeKey) {
    if (!this.isTaskTarget(enemyTypeKey)) return 1.0;
    return this.hasUnlock('slayer_helm') ? 1.10 : 1.0;
  }

  // ── UI data ────────────────────────────────────────────────────────────────

  getSummary() {
    return {
      points:      this.points,
      tasksTotal:  this.tasksTotal,
      streak:      this.streak,
      currentTask: this.currentTask,
      history:     this._taskHistory,
      shop:        SHOP.map(s => ({ ...s, owned: this._unlocks.has(s.id) })),
    };
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  serialize() {
    return {
      points:      this.points,
      tasksTotal:  this.tasksTotal,
      streak:      this.streak,
      currentTask: this.currentTask,
      unlocks:     [...this._unlocks],
      history:     this._taskHistory,
    };
  }

  deserialize(d) {
    if (!d) return;
    this.points      = d.points      ?? 0;
    this.tasksTotal  = d.tasksTotal  ?? 0;
    this.streak      = d.streak      ?? 0;
    this.currentTask = d.currentTask ?? null;
    this._unlocks    = new Set(d.unlocks ?? []);
    this._taskHistory = d.history   ?? [];
  }
}
