/**
 * GatheringSystem.js  — Aethoria v0.5
 *
 * RuneScape-inspired gathering skills:
 *   Mining, Woodcutting, Fishing, Herbalism, Hunting
 *
 * Each skill has:
 *   • An independent level (1–99) with XP curve
 *   • Resource nodes that spawn near appropriate biomes
 *   • Tool requirements per node tier
 *   • Yield items fed into ItemSystem / crafting
 *   • Level-up rewards (items, unlock messages)
 *
 * Integration:
 *   gatherSys.startGather(nodeId, player)   — begin gathering tick
 *   gatherSys.stopGather()                  — cancel current action
 *   gatherSys.addXP(skill, amount)          — award skill XP
 *   gatherSys.levelFor(skill)               — current level
 *   gatherSys.xpFor(skill)                  — current XP
 *   gatherSys.xpToNext(skill)               — XP needed to level
 *   gatherSys.canGather(nodeId, player)     — bool + reason
 *   gatherSys.serialize() / deserialize()
 */

import { CONFIG  } from '../config.js';
import { AIMemory } from './AIMemory.js';

// How long each gather tick takes in ms (base, modified by tool tier)
const BASE_TICK_MS  = 3500;
const TOOL_SPEED    = { 1: 1.0, 2: 0.75, 3: 0.55 }; // tier → multiplier

// Chance to deplete a node per gather. Nodes respawn after RESPAWN_MS.
const DEPLETE_CHANCE  = 0.25;
const RESPAWN_MS      = 45_000;

// ── Node mesh colors for 3D scene (used by world spawner) ──────────────────────
export const NODE_COLORS = {
  copper_rock:   0x886655,
  iron_rock:     0x888899,
  coal_seam:     0x333344,
  mithril_vein:  0x5577bb,
  runite_rock:   0x4488ff,
  tree:          0x556633,
  oak_tree:      0x4a6644,
  yew_tree:      0x335533,
  magic_tree:    0x3355aa,
  ancient_tree:  0x557755,
  pond:          0x3355aa,
  river:         0x3366cc,
  deep_pool:     0x224488,
  void_pool:     0x330066,
  herb_patch:    0x44aa44,
  void_herb_node:0x884488,
  flax_field:    0xbbdd88,
  rabbit_burrow: 0xddccaa,
  wolf_den:      0xaaaaaa,
  drake_nest:    0x882200,
};

// ── XP table lookup ─────────────────────────────────────────────────────────────
const XP_TABLE = CONFIG.GATHERING_XP_TABLE;

function xpForLevel(lvl) {
  return XP_TABLE[Math.min(lvl, 99)] ?? 0;
}

function levelFromXP(xp) {
  for (let lvl = 99; lvl >= 1; lvl--) {
    if (xp >= xpForLevel(lvl)) return lvl;
  }
  return 1;
}

// ── Build a flat map: nodeId → { skill, nodeDef } ──────────────────────────────
const NODE_MAP = {};
for (const [skill, skillDef] of Object.entries(CONFIG.GATHERING_SKILLS)) {
  for (const node of skillDef.nodes) {
    NODE_MAP[node.id] = { skill, node };
  }
}

export class GatheringSystem {
  constructor(scene) {
    this.scene = scene;

    // skill XP totals — levels derived on-the-fly
    this._xp = {
      mining:    0,
      woodcut:   0,
      fishing:   0,
      herbalism: 0,
      hunting:   0,
    };

    // Active gather state
    this._active = null; // { nodeId, tickMs, elapsed, depletedIds: Set }

    // Depleted nodes: nodeId+instanceIndex → timestamp when it depletes
    this._depleted = new Map();

    // World node instances (set by WorldGen or GameScene)
    this._nodeInstances = []; // [{ id, nodeId, x, z, depleted:bool }]
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Level for a skill (1–99). */
  levelFor(skill) {
    return levelFromXP(this._xp[skill] ?? 0);
  }

  /** Current XP in a skill. */
  xpFor(skill) {
    return this._xp[skill] ?? 0;
  }

  /** XP needed to reach the next level. */
  xpToNext(skill) {
    const lvl  = this.levelFor(skill);
    if (lvl >= 99) return 0;
    const next = xpForLevel(lvl + 1);
    return Math.max(0, next - this.xpFor(skill));
  }

  /** Progress fraction 0..1 toward next level. */
  progressFraction(skill) {
    const lvl  = this.levelFor(skill);
    if (lvl >= 99) return 1;
    const curr = xpForLevel(lvl);
    const next = xpForLevel(lvl + 1);
    return Math.min(1, (this.xpFor(skill) - curr) / (next - curr));
  }

  /** Returns { ok: bool, reason: string }. */
  canGather(nodeId, player) {
    const entry = NODE_MAP[nodeId];
    if (!entry) return { ok: false, reason: 'Unknown node.' };

    const { skill, node } = entry;
    const lvl = this.levelFor(skill);

    if (lvl < node.level) {
      return { ok: false, reason: `Requires ${skill} level ${node.level} (yours: ${lvl}).` };
    }

    // Tool check — inventory is { itemKey: qty } object in Player3D
    const inv = player.inventory ?? {};
    const hasTool = Object.keys(inv).some(key => {
      const def = CONFIG.ITEMS[key];
      return inv[key] > 0 && def?.type === 'tool' && def.gatherType === skill && def.tier >= 1;
    });
    if (!hasTool) {
      return { ok: false, reason: `You need a ${node.requires} to gather here.` };
    }

    return { ok: true, reason: '' };
  }

  /** Begin gathering from a node instance. Returns false if can't start. */
  startGather(nodeInstanceId, player) {
    const inst = this._nodeInstances.find(n => n.id === nodeInstanceId);
    if (!inst) return false;

    const entry = NODE_MAP[inst.nodeId];
    if (!entry) return false;

    const check = this.canGather(inst.nodeId, player);
    if (!check.ok) {
      this.scene.events.emit('gatherFail', check.reason);
      return false;
    }

    if (inst.depleted) {
      const respawnAt = this._depleted.get(nodeInstanceId) ?? 0;
      const wait      = Math.ceil((respawnAt - Date.now()) / 1000);
      this.scene.events.emit('gatherFail', `Node depleted. Respawns in ${wait}s.`);
      return false;
    }

    // Find tool tier
    const toolTier = this._bestToolTier(entry.skill, player);
    const tickMs   = BASE_TICK_MS * (TOOL_SPEED[toolTier] ?? 1.0);

    this._active = { nodeInstanceId, nodeDef: entry.node, skill: entry.skill, tickMs, elapsed: 0 };
    this.scene.events.emit('gatherStart', { skill: entry.skill, nodeId: inst.nodeId });
    return true;
  }

  stopGather() {
    if (!this._active) return;
    this.scene.events.emit('gatherStop', this._active.skill);
    this._active = null;
  }

  /** Add raw XP to a skill (also used by quest rewards, cooking, smithing). */
  addXP(skill, amount) {
    if (!(skill in this._xp)) return;
    const prevLevel = this.levelFor(skill);
    this._xp[skill] += amount;
    const newLevel  = this.levelFor(skill);

    this.scene.events.emit('gatherXP', { skill, amount, total: this._xp[skill] });

    if (newLevel > prevLevel) {
      this._onLevelUp(skill, newLevel);
    }
  }

  // ── Update (called every frame with delta in seconds) ──────────────────────

  update(delta) {
    // Tick gathering progress
    if (this._active) {
      this._active.elapsed += delta * 1000;
      const pct = Math.min(1, this._active.elapsed / this._active.tickMs);
      this.scene.events.emit('gatherProgress', { skill: this._active.skill, pct });

      if (this._active.elapsed >= this._active.tickMs) {
        this._completeTick();
      }
    }

    // Respawn depleted nodes
    const now = Date.now();
    for (const [instId, respawnAt] of this._depleted) {
      if (now >= respawnAt) {
        const inst = this._nodeInstances.find(n => n.id === instId);
        if (inst) {
          inst.depleted = false;
          this._depleted.delete(instId);
          this.scene.events.emit('nodeRespawned', instId);
        }
      }
    }
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  _completeTick() {
    if (!this._active) return;
    const { nodeInstanceId, nodeDef, skill } = this._active;

    // Award yield item
    const player = this.scene.player;
    if (player) {
      player.addItem(nodeDef.yield);
      this.scene.events.emit('itemGathered', { itemKey: nodeDef.yield, skill });
    }

    // Award XP
    this.addXP(skill, nodeDef.xp);

    // Chance to deplete
    if (Math.random() < DEPLETE_CHANCE) {
      const inst = this._nodeInstances.find(n => n.id === nodeInstanceId);
      if (inst) {
        inst.depleted = true;
        this._depleted.set(nodeInstanceId, Date.now() + RESPAWN_MS);
        this.scene.events.emit('nodeDepleted', nodeInstanceId);
        this._active = null;
        return;
      }
    }

    // Continue gathering (reset elapsed for next tick)
    this._active.elapsed = 0;
  }

  _bestToolTier(skill, player) {
    let best = 0;
    const inv = player.inventory ?? {};
    for (const key of Object.keys(inv)) {
      if ((inv[key] ?? 0) < 1) continue;
      const def = CONFIG.ITEMS[key];
      if (def?.type === 'tool' && def.gatherType === skill) {
        best = Math.max(best, def.tier ?? 1);
      }
    }
    return best || 1;
  }

  _onLevelUp(skill, level) {
    AIMemory.recordEvent('gathering', `${skill} level ${level}`);
    this.scene.events.emit('gatherLevelUp', { skill, level });
    this.scene.events.emit('achievement', {
      name:  `${CONFIG.GATHERING_SKILLS[skill]?.name ?? skill} Lvl ${level}`,
      desc:  `Your ${skill} skill reached level ${level}.`,
    });

    // Milestone rewards
    const milestones = { 10: 'iron_pick', 20: 'iron_axe', 30: 'fly_rod', 40: 'mithril_pick', 50: 'mithril_axe', 60: 'amulet_soul' };
    if (milestones[level]) {
      const player = this.scene.player;
      player?.addItem(milestones[level]);
      this.scene.events.emit('rewardItem', { itemKey: milestones[level], reason: `${skill} level ${level} reward` });
    }
  }

  // ── Node instance registration (called by WorldGen / GameScene) ─────────────

  /**
   * Register all gather nodes for the world.
   * Call once after world generation.
   * @param {Array<{id, nodeId, x, z}>} instances
   */
  registerNodes(instances) {
    this._nodeInstances = instances.map(i => ({ ...i, depleted: false }));
  }

  getNodeInstances() { return this._nodeInstances; }

  getNearbyNodes(x, z, radius = 8) {
    return this._nodeInstances.filter(n =>
      !n.depleted &&
      Math.hypot(n.x - x, n.z - z) <= radius,
    );
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  serialize() {
    return {
      xp:      { ...this._xp },
      depleted: [...this._depleted.entries()],
    };
  }

  deserialize(d) {
    if (!d) return;
    if (d.xp) {
      for (const [sk, val] of Object.entries(d.xp)) {
        if (sk in this._xp) this._xp[sk] = val;
      }
    }
    if (d.depleted) {
      this._depleted = new Map(d.depleted);
    }
  }

  // ── UI summary ─────────────────────────────────────────────────────────────

  getSummary() {
    return Object.keys(this._xp).map(skill => ({
      skill,
      name:     CONFIG.GATHERING_SKILLS[skill]?.name ?? skill,
      icon:     CONFIG.GATHERING_SKILLS[skill]?.icon ?? '?',
      level:    this.levelFor(skill),
      xp:       this.xpFor(skill),
      xpToNext: this.xpToNext(skill),
      progress: this.progressFraction(skill),
    }));
  }
}
