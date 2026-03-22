import { CONFIG } from '../config.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(10).setCollideWorldBounds(true);
    this.body.setSize(18, 18).setOffset(4, 4);

    this.stats = {
      name:      'Hero',
      level:     1,
      xp:        0,
      xpNeeded:  CONFIG.PLAYER.XP_PER_LEVEL,
      hp:        CONFIG.PLAYER.BASE_HP,
      maxHp:     CONFIG.PLAYER.BASE_HP,
      attack:    CONFIG.PLAYER.BASE_ATTACK,
      defense:   CONFIG.PLAYER.BASE_DEFENSE,
      speed:     CONFIG.PLAYER.SPEED,
      gold:      0,
    };

    this.inventory  = {};
    this.equipment  = { weapon: null, armor: null };
    this.attackCooldown = 0;
    this.attackCooldownBase = CONFIG.PLAYER.ATTACK_COOLDOWN;
    this.attackRange = CONFIG.PLAYER.ATTACK_RANGE;
    this.attackTarget   = null;
    this.moveTarget     = null;
    this.playerClass    = null;
    this.skills         = {};
    this.slamCD         = 0;
    this.fireballCD     = 0;
    this.dodgeChance    = 0;

    // Input
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd    = scene.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // Visuals above sprite
    this.nameTag  = scene.add.text(x, y-28, '★ ' + this.stats.name, {
      fontFamily:'Courier New', fontSize:'10px', color:'#88aaff',
    }).setOrigin(0.5).setDepth(15);

    this.hpBg  = scene.add.rectangle(x, y-34, 34, 5, 0x330000).setDepth(14).setOrigin(0.5);
    this.hpFill = scene.add.rectangle(x, y-34, 34, 5, 0xee3333).setDepth(15).setOrigin(0, 0.5);
  }

  update(time, delta) {
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);

    // ── Movement ───────────────────────────────────────────
    const sp = this.stats.speed;
    let vx = 0, vy = 0;
    const kb = this.cursors, ws = this.wasd;

    if (kb.left.isDown  || ws.left.isDown)  vx = -sp;
    if (kb.right.isDown || ws.right.isDown) vx =  sp;
    if (kb.up.isDown    || ws.up.isDown)    vy = -sp;
    if (kb.down.isDown  || ws.down.isDown)  vy =  sp;

    const usingKeys = vx !== 0 || vy !== 0;

    if (usingKeys) {
      if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
      this.setVelocity(vx, vy);
      this.moveTarget = null;
    } else if (this.moveTarget) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, this.moveTarget.x, this.moveTarget.y);
      if (d > 8) {
        this.scene.physics.moveTo(this, this.moveTarget.x, this.moveTarget.y, sp);
      } else {
        this.setVelocity(0, 0);
        this.moveTarget = null;
      }
    } else {
      this.setVelocity(0, 0);
    }

    // ── Visual sync ────────────────────────────────────────
    this.nameTag.setPosition(this.x, this.y - 28);
    this.hpBg.setPosition(this.x, this.y - 34);

    const ratio = Math.max(0, this.stats.hp / this.stats.maxHp);
    this.hpFill.setPosition(this.x - 17, this.y - 34);
    this.hpFill.setSize(34 * ratio, 5);

    // ── Auto-attack ────────────────────────────────────────
    // Fireball (Mage skill)
    if (this.fireballCD > 0) this.fireballCD = Math.max(0, this.fireballCD - delta);
    if (this.slamCD     > 0) this.slamCD     = Math.max(0, this.slamCD - delta);

    if (this.attackTarget && !this.attackTarget.isDead && this.attackCooldown === 0) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.attackTarget.x, this.attackTarget.y);
      if (dist <= this.attackRange) {
        this._doAttack(this.attackTarget);
      } else {
        // Walk toward target
        this.moveTarget = { x: this.attackTarget.x, y: this.attackTarget.y };
      }
    }
  }

  setTarget(enemy) {
    this.attackTarget = enemy;
    this.moveTarget   = null;
  }

  applyClass(classKey) {
    const cls = CONFIG.CLASSES[classKey];
    if (!cls) return;
    this.playerClass = classKey;
    this.stats.maxHp   += cls.bonuses.hp;
    this.stats.hp       = this.stats.maxHp;
    this.stats.attack  += cls.bonuses.attack;
    this.stats.defense += cls.bonuses.defense;
    this.stats.speed   += cls.bonuses.speed;
    this.scene.events.emit('statsChanged', this.stats);
  }

  learnSkill(key) {
    const sk = CONFIG.SKILLS[key];
    if (!sk) return false;
    const rank = (this.skills[key] || 0) + 1;
    if (rank > sk.maxRank) return false;
    this.skills[key] = rank;
    try { sk.effect(this, rank); } catch(_) {}
    this.scene.events.emit('skillLearned', key, rank);
    return true;
  }

  _doAttack(enemy) {
    if (this.attackCooldown > 0 || !enemy || enemy.isDead) return;
    const eqAtk = this.equipment.weapon ? (CONFIG.ITEMS[this.equipment.weapon]?.atk || 0) : 0;
    const dmg   = Math.max(1, this.stats.attack + eqAtk + Phaser.Math.Between(-3, 3) - enemy.stats.def);
    enemy.takeDamage(dmg, this);
    this.attackCooldown = this.attackCooldownBase;
    this.setTint(0xffffff);
    this.scene.time.delayedCall(100, () => { if (this.active) this.clearTint(); });
  }

  takeDamage(amount) {
    // Dodge (Ranger evasion skill)
    if (this.dodgeChance > 0 && Math.random() < this.dodgeChance) {
      this.scene.events.emit('damage', this.x, this.y, 'DODGE', '#44ffcc');
      return 0;
    }
    // Mana shield (Mage) — reduce damage
    const shieldRank  = this.skills?.MANA_SHIELD || 0;
    const reduction   = shieldRank * 0.15;
    const eqDef = this.equipment.armor ? (CONFIG.ITEMS[this.equipment.armor]?.def || 0) : 0;
    const actual = Math.max(1, Math.floor(amount * (1 - reduction)) - Math.floor((this.stats.defense + eqDef) / 2));
    this.stats.hp = Math.max(0, this.stats.hp - actual);

    this.setTint(0xff4444);
    this.scene.time.delayedCall(150, () => { if (this.active) this.clearTint(); });
    this.scene.events.emit('damage', this.x, this.y, actual, '#ff4444');

    if (this.stats.hp <= 0) this.scene.events.emit('playerDead');
    this.scene.events.emit('statsChanged', this.stats);
    return actual;
  }

  gainXP(amount) {
    this.stats.xp += amount;
    while (this.stats.xp >= this.stats.xpNeeded) {
      this.stats.xp     -= this.stats.xpNeeded;
      this.stats.xpNeeded = Math.floor(this.stats.xpNeeded * 1.45);
      this.stats.level++;
      this.stats.maxHp += 15; this.stats.hp = this.stats.maxHp;
      this.stats.attack  += 2;
      this.stats.defense += 1;
      this.scene.events.emit('levelUp', this.stats.level);
    }
    this.scene.events.emit('statsChanged', this.stats);
  }

  addItem(key, qty = 1) {
    this.inventory[key] = (this.inventory[key] || 0) + qty;
    if (key === 'gold') { this.stats.gold += qty * 20; this.scene.events.emit('statsChanged', this.stats); }
    this.scene.events.emit('inventoryChanged', this.inventory);
  }

  removeItem(key, qty = 1) {
    if ((this.inventory[key] || 0) < qty) return false;
    this.inventory[key] -= qty;
    if (this.inventory[key] <= 0) delete this.inventory[key];
    this.scene.events.emit('inventoryChanged', this.inventory);
    return true;
  }

  useItem(key) {
    const item = CONFIG.ITEMS[key];
    if (!item) return;
    if (item.type === 'consumable' && item.heal) {
      if (!this.removeItem(key)) return;
      this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + item.heal);
      this.scene.events.emit('damage', this.x, this.y, '+' + item.heal, '#44ff88');
      this.scene.events.emit('statsChanged', this.stats);
    } else if (item.type === 'weapon') {
      this.equipment.weapon = this.equipment.weapon === key ? null : key;
      this.scene.events.emit('inventoryChanged', this.inventory);
    } else if (item.type === 'armor') {
      this.equipment.armor = this.equipment.armor === key ? null : key;
      this.scene.events.emit('inventoryChanged', this.inventory);
    }
  }

  destroy() {
    this.nameTag?.destroy();
    this.hpBg?.destroy();
    this.hpFill?.destroy();
    super.destroy();
  }
}
