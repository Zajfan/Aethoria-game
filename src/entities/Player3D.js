/**
 * Player3D.js
 * 3D player entity for the Aethoria RPG.
 *
 * Extends Entity3D with:
 *  - Low-poly humanoid mesh (per-class colours)
 *  - WASD movement in camera-relative space
 *  - Right-click-to-move via ground-plane raycast
 *  - Attack-chase AI
 *  - Walking limb animation
 *  - Full stat / inventory / equipment / skill system (ported from Player.js)
 *
 * Constructor: new Player3D(scene3d, world3d, camera, inputManager, eventBus)
 */

import { THREE }      from '../engine/Renderer.js';
import { Entity3D, PX } from './Entity3D.js';
import { CONFIG }     from '../config.js';
import { Keys, MouseButton } from '../engine/InputManager.js';

// ── Per-class colour palettes ─────────────────────────────────────────────
const CLASS_COLORS = {
  WARRIOR: { body: 0x3a5f8a, accent: 0x7aa0c0, skin: 0xffcc99 },
  MAGE:    { body: 0x6a2fa0, accent: 0xffdd44, skin: 0xffcc99 },
  RANGER:  { body: 0x2d6b2d, accent: 0x8b5e3c, skin: 0xffcc99 },
};
const DEFAULT_COLORS = { body: 0x4a4a6a, accent: 0x8888aa, skin: 0xffcc99 };

// ── Helpers ───────────────────────────────────────────────────────────────
function _mat(color) {
  return new THREE.MeshLambertMaterial({ color });
}

function _box(w, h, d) {
  return new THREE.BoxGeometry(w, h, d);
}

function _randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Player3D ─────────────────────────────────────────────────────────────
export class Player3D extends Entity3D {
  /**
   * @param {THREE.Scene}   scene3d
   * @param {object}        world3d      Must expose isBlocked(tileX, tileZ) → bool
   * @param {THREE.Camera}  camera
   * @param {InputManager}  inputManager
   * @param {EventBus}      eventBus
   */
  constructor(scene3d, world3d, camera, inputManager, eventBus) {
    super(camera, 'Hero');

    this.world    = world3d;
    this.input    = inputManager;
    this.eventBus = eventBus;
    this.scene3d  = scene3d;

    // ── Stats ──────────────────────────────────────────────────────────────
    this.stats = {
      name:     'Hero',
      level:    1,
      xp:       0,
      xpNeeded: CONFIG.PLAYER.XP_PER_LEVEL,
      hp:       CONFIG.PLAYER.BASE_HP,
      maxHp:    CONFIG.PLAYER.BASE_HP,
      attack:   CONFIG.PLAYER.BASE_ATTACK,
      defense:  CONFIG.PLAYER.BASE_DEFENSE,
      // Convert px/s → world-units/s  (1 world unit = 16 original px)
      speed:    CONFIG.PLAYER.SPEED * PX,
      gold:     0,
    };

    this.inventory   = {};
    this.equipment   = { weapon: null, armor: null };

    this.attackCooldown     = 0;                               // ms remaining
    this.attackCooldownBase = CONFIG.PLAYER.ATTACK_COOLDOWN;   // ms
    this.attackRange        = CONFIG.PLAYER.ATTACK_RANGE * PX; // world units
    this.attackTarget       = null;

    this.playerClass = null;
    this.skills      = {};
    this.slamCD      = 0;
    this.fireballCD  = 0;
    this.dodgeChance = 0;

    // ── Walk animation ─────────────────────────────────────────────────────
    this._walkCycle = 0;
    this._parts     = {};

    // ── Click-to-move ──────────────────────────────────────────────────────
    this._raycaster   = new THREE.Raycaster();
    this._groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._clickTarget = null; // { x, z } world position

    // Cached tile size in world units — the 3D world maps 1 tile to exactly 1 world unit.
    this._tileSize = CONFIG.WORLD_3D.TILE_SIZE;

    // ── Build ──────────────────────────────────────────────────────────────
    this._buildModel();
    this.addToScene(scene3d);
  }

  // ── Humanoid model ────────────────────────────────────────────────────────

  _buildModel() {
    const cols  = CLASS_COLORS[this.playerClass] || DEFAULT_COLORS;
    const body   = _mat(cols.body);
    const accent = _mat(cols.accent);
    const skin   = _mat(cols.skin);

    // Clear old parts
    while (this.group.children.length) {
      this.group.remove(this.group.children[0]);
    }
    this._parts = {};

    /** Helper: create mesh, add to group, store in _parts. */
    const add = (key, geo, mat, x, y, z) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.castShadow    = true;
      mesh.receiveShadow = false;
      this.group.add(mesh);
      this._parts[key] = mesh;
      return mesh;
    };

    // Torso
    add('torso',    _box(0.60, 0.80, 0.35), body,    0,    1.00,  0);
    // Head
    add('head',     _box(0.45, 0.45, 0.45), skin,    0,    1.65,  0);
    // Arms
    add('leftArm',  _box(0.20, 0.60, 0.20), accent, -0.40, 0.95,  0);
    add('rightArm', _box(0.20, 0.60, 0.20), accent,  0.40, 0.95,  0);
    // Legs
    add('leftLeg',  _box(0.24, 0.55, 0.24), body,   -0.15, 0.30,  0);
    add('rightLeg', _box(0.24, 0.55, 0.24), body,    0.15, 0.30,  0);
  }

  // ── Class & skills ────────────────────────────────────────────────────────

  applyClass(classKey) {
    const cls = CONFIG.CLASSES[classKey];
    if (!cls) return;
    this.playerClass    = classKey;
    this.stats.maxHp   += cls.bonuses.hp;
    this.stats.hp       = this.stats.maxHp;
    this.stats.attack  += cls.bonuses.attack;
    this.stats.defense += cls.bonuses.defense;
    this.stats.speed   += cls.bonuses.speed * PX;
    this._buildModel(); // re-colour
    this.eventBus.emit('statsChanged', this.stats);
  }

  learnSkill(key) {
    const sk = CONFIG.SKILLS[key];
    if (!sk) return false;
    const rank = (this.skills[key] || 0) + 1;
    if (rank > sk.maxRank) return false;
    this.skills[key] = rank;
    try { sk.effect(this, rank); } catch (_) {}
    this.eventBus.emit('skillLearned', key, rank);
    return true;
  }

  // ── Update ────────────────────────────────────────────────────────────────

  /** @param {number} delta  Seconds since last frame */
  update(delta) {
    if (this.isDead) return;

    const deltaMs = delta * 1000;
    this.attackCooldown = Math.max(0, this.attackCooldown - deltaMs);
    if (this.fireballCD > 0) this.fireballCD = Math.max(0, this.fireballCD - deltaMs);
    if (this.slamCD     > 0) this.slamCD     = Math.max(0, this.slamCD     - deltaMs);

    const sp = this.stats.speed;
    const mv = this.input.getMovementVector(); // { x, y } normalised [-1,1]

    // Camera-relative axes (projected onto XZ plane)
    const camFwd   = new THREE.Vector3();
    const camRight = new THREE.Vector3();
    this.camera.getWorldDirection(camFwd);
    camFwd.y = 0;
    camFwd.normalize();
    camRight.crossVectors(camFwd, new THREE.Vector3(0, 1, 0)).normalize();

    // Right-click → click-to-move (raycast onto ground plane y=0)
    if (this.input.isMousePressed(MouseButton.RIGHT)) {
      this._handleClickToMove();
    }

    // ── Priority 1: WASD / joystick ───────────────────────────────────────
    if (mv.x !== 0 || mv.y !== 0) {
      // mv.y from InputManager is negative = forward (matches original W = -y)
      const wx = camRight.x * mv.x + camFwd.x * (-mv.y);
      const wz = camRight.z * mv.x + camFwd.z * (-mv.y);
      const len = Math.hypot(wx, wz) || 1;
      this.velocity.x = (wx / len) * sp;
      this.velocity.z = (wz / len) * sp;
      this.velocity.y = 0;
      this._clickTarget = null;
      this.attackTarget = null;

    // ── Priority 2: Attack-chase ──────────────────────────────────────────
    } else if (this.attackTarget && !this.attackTarget.isDead) {
      const dist = this.distanceTo(this.attackTarget);
      if (dist <= this.attackRange) {
        this.velocity.set(0, 0, 0);
        if (this.attackCooldown === 0) this._doAttack(this.attackTarget);
      } else {
        const dir = new THREE.Vector3()
          .subVectors(this.attackTarget.position, this.position)
          .setY(0)
          .normalize();
        this.velocity.copy(dir).multiplyScalar(sp * 0.88);
        this.velocity.y = 0;
      }
      this._clickTarget = null;

    // ── Priority 3: Click-to-move ─────────────────────────────────────────
    } else if (this._clickTarget) {
      const dx   = this._clickTarget.x - this.position.x;
      const dz   = this._clickTarget.z - this.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.2) {
        this.velocity.set((dx / dist) * sp, 0, (dz / dist) * sp);
      } else {
        this.velocity.set(0, 0, 0);
        this._clickTarget = null;
      }

    // ── Priority 4: Idle (friction) ───────────────────────────────────────
    } else {
      const FRICTION = 10; // units/s² damping
      const drag = Math.min(1, FRICTION * delta);
      this.velocity.x -= this.velocity.x * drag;
      this.velocity.z -= this.velocity.z * drag;
      if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
      if (Math.abs(this.velocity.z) < 0.01) this.velocity.z = 0;
    }

    // Collision + position update
    this._applyVelocityWithCollision(delta);

    // Walk animation + facing
    const speed2d = Math.hypot(this.velocity.x, this.velocity.z);
    this._animateWalk(delta, speed2d);
    if (speed2d > 0.1) {
      this.group.rotation.y = Math.atan2(this.velocity.x, this.velocity.z);
    }

    this.group.position.copy(this.position);
    this._updateLabelPosition();
  }

  _handleClickToMove() {
    this._raycaster.setFromCamera(this.input.mouseNDC, this.camera);
    const target = new THREE.Vector3();
    if (this._raycaster.ray.intersectPlane(this._groundPlane, target)) {
      this._clickTarget = { x: target.x, z: target.z };
      this.attackTarget = null;
    }
  }

  _applyVelocityWithCollision(delta) {
    if (!this.world?.isBlocked) {
      this.position.addScaledVector(this.velocity, delta);
      return;
    }

    const TILE = this._tileSize;
    const nx = this.position.x + this.velocity.x * delta;
    const nz = this.position.z + this.velocity.z * delta;

    const tileX = Math.floor(nx   / TILE);
    const tileZ = Math.floor(nz   / TILE);
    const curX  = Math.floor(this.position.x / TILE);
    const curZ  = Math.floor(this.position.z / TILE);

    if (!this.world.isBlocked(tileX, tileZ)) {
      this.position.x = nx;
      this.position.z = nz;
    } else {
      // Sliding: try each axis independently
      if (!this.world.isBlocked(tileX, curZ)) {
        this.position.x = nx;
        this.velocity.z = 0;
      } else if (!this.world.isBlocked(curX, tileZ)) {
        this.position.z = nz;
        this.velocity.x = 0;
      } else {
        this.velocity.set(0, 0, 0);
      }
    }
  }

  _animateWalk(delta, speed) {
    const MAX_SWING = 0.55;
    if (speed > 0.1) {
      this._walkCycle += delta * speed * 3.5;
    } else {
      this._walkCycle *= Math.max(0, 1 - delta * 8);
    }
    const swing = Math.sin(this._walkCycle) * MAX_SWING * Math.min(1, speed / 2);
    const { leftLeg, rightLeg, leftArm, rightArm } = this._parts;
    if (leftLeg)  leftLeg.rotation.x  =  swing;
    if (rightLeg) rightLeg.rotation.x = -swing;
    if (leftArm)  leftArm.rotation.x  = -swing * 0.6;
    if (rightArm) rightArm.rotation.x =  swing * 0.6;
  }

  // ── Combat ────────────────────────────────────────────────────────────────

  setTarget(enemy) {
    this.attackTarget = enemy;
    this._clickTarget = null;
  }

  _doAttack(enemy) {
    if (this.attackCooldown > 0 || !enemy || enemy.isDead) return;
    const eqAtk = this.equipment.weapon
      ? (CONFIG.ITEMS[this.equipment.weapon]?.atk || 0)
      : 0;
    const rnd = _randInt(-2, 3);
    const dmg = Math.max(1, this.stats.attack + eqAtk + rnd - (enemy.stats?.def || 0));
    enemy.takeDamage(dmg, this);
    this.attackCooldown = this.attackCooldownBase;
    this.eventBus.emit('damage', this.position.x, this.position.y, dmg, '#ffffff');
  }

  // ── Damage / death ────────────────────────────────────────────────────────

  takeDamage(amount) {
    if (this.isDead) return 0;

    // Dodge chance (Ranger: EVASION skill)
    if (this.dodgeChance > 0 && Math.random() < this.dodgeChance) {
      this.eventBus.emit('damage', this.position.x, this.position.y, 'DODGE', '#44ffcc');
      return 0;
    }

    const shieldMult = 1 - (this.skills?.MANA_SHIELD || 0) * 0.15;
    const eqDef      = this.equipment.armor
      ? (CONFIG.ITEMS[this.equipment.armor]?.def || 0)
      : 0;
    const actual  = Math.max(
      1,
      Math.floor(amount * shieldMult) - Math.floor((this.stats.defense + eqDef) / 2),
    );
    this.stats.hp = Math.max(0, this.stats.hp - actual);
    this.eventBus.emit('damage', this.position.x, this.position.y, actual, '#ff6666');

    if (this.stats.hp <= 0) {
      this.isDead = true;
      this.eventBus.emit('playerDead');
    }
    this.eventBus.emit('statsChanged', this.stats);
    return actual;
  }

  // ── XP & levelling ────────────────────────────────────────────────────────

  gainXP(amount) {
    this.stats.xp += amount;
    while (this.stats.xp >= this.stats.xpNeeded) {
      this.stats.xp      -= this.stats.xpNeeded;
      this.stats.xpNeeded = Math.floor(this.stats.xpNeeded * 1.45);
      this.stats.level++;
      this.stats.maxHp  += 15;
      this.stats.hp      = this.stats.maxHp;
      this.stats.attack  += 2;
      this.stats.defense += 1;
      this.eventBus.emit('levelUp', this.stats.level);
    }
    this.eventBus.emit('statsChanged', this.stats);
  }

  // ── Inventory ─────────────────────────────────────────────────────────────

  addItem(key, qty = 1) {
    this.inventory[key] = (this.inventory[key] || 0) + qty;
    if (key === 'gold') {
      this.stats.gold = (this.stats.gold || 0) + qty * 20;
      this.eventBus.emit('statsChanged', this.stats);
    }
    this.eventBus.emit('inventoryChanged', this.inventory);
  }

  removeItem(key, qty = 1) {
    if ((this.inventory[key] || 0) < qty) return false;
    this.inventory[key] -= qty;
    if (this.inventory[key] <= 0) delete this.inventory[key];
    this.eventBus.emit('inventoryChanged', this.inventory);
    return true;
  }

  useItem(key) {
    const item = CONFIG.ITEMS[key];
    if (!item) return;
    if (item.type === 'consumable' && item.heal) {
      if (!this.removeItem(key)) return;
      this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + item.heal);
      this.eventBus.emit(
        'damage',
        this.position.x, this.position.y,
        `+${item.heal} HP`, '#44ff88',
      );
      this.eventBus.emit('statsChanged', this.stats);
    } else if (item.type === 'weapon') {
      this.equipment.weapon = this.equipment.weapon === key ? null : key;
      this.eventBus.emit('inventoryChanged', this.inventory);
    } else if (item.type === 'armor') {
      this.equipment.armor = this.equipment.armor === key ? null : key;
      this.eventBus.emit('inventoryChanged', this.inventory);
    }
  }

  dispose() {
    super.dispose();
  }
}
