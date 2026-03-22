import { CONFIG } from '../config.js';

const S = { IDLE:0, PATROL:1, CHASE:2, ATTACK:3, DEAD:4 };

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, typeKey) {
    const d = CONFIG.ENEMY_TYPES[typeKey] || CONFIG.ENEMY_TYPES.GOBLIN;
    super(scene, x, y, 'enemy_' + typeKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this._data    = d;
    this.typeKey  = typeKey;
    this.setDepth(9);
    this.body.setSize(d.sz * 1.4, d.sz * 1.4);

    this.stats    = { hp: d.hp, maxHp: d.hp, atk: d.atk, def: d.def, spd: d.spd };
    this.isDead   = false;
    this.state    = S.IDLE;
    this.atkCD    = 0;
    this.pTimer   = 0;
    this.pDir     = { x:0, y:0 };
    this.spawnX   = x;
    this.spawnY   = y;
    this.DETECT   = 130;
    this.ATK_R    = 42;
    this.LEASH    = 210;

    // HP bar + label (persistent objects — never destroyed until scene ends)
    this.hpBg   = scene.add.rectangle(x, y-20, 30, 4, 0x330000).setDepth(12);
    this.hpFill = scene.add.rectangle(x, y-20, 30, 4, 0xff3333).setDepth(13).setOrigin(0,0.5);
    this.label  = scene.add.text(x, y-28, d.name, {
      fontFamily:'Courier New', fontSize:'9px', color:'#ff9999',
    }).setOrigin(0.5).setDepth(14);
  }

  update(time, delta, player) {
    if (this.isDead) return;
    this.atkCD = Math.max(0, this.atkCD - delta);

    const dp  = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const ds  = Phaser.Math.Distance.Between(this.x, this.y, this.spawnX, this.spawnY);

    switch (this.state) {
      case S.IDLE:
        this.setVelocity(0, 0);
        this.pTimer -= delta;
        if (this.pTimer <= 0) {
          this.state  = S.PATROL;
          this.pTimer = Phaser.Math.Between(2200, 4500);
          const a = Math.random() * Math.PI * 2;
          this.pDir = { x: Math.cos(a), y: Math.sin(a) };
        }
        if (dp < this.DETECT) this.state = S.CHASE;
        break;

      case S.PATROL:
        this.setVelocity(this.pDir.x * this.stats.spd * 0.45, this.pDir.y * this.stats.spd * 0.45);
        this.pTimer -= delta;
        if (this.pTimer <= 0) { this.state = S.IDLE; this.pTimer = 1200; }
        if (dp < this.DETECT) this.state = S.CHASE;
        if (ds > 75) { this.state = S.IDLE; this.pTimer = 800; }
        break;

      case S.CHASE:
        if (dp > this.LEASH || ds > this.LEASH) { this.state = S.IDLE; this.pTimer = 800; break; }
        if (dp <= this.ATK_R) { this.state = S.ATTACK; break; }
        this.scene.physics.moveTo(this, player.x, player.y, this.stats.spd);
        break;

      case S.ATTACK:
        this.setVelocity(0, 0);
        if (dp > this.ATK_R + 12) { this.state = S.CHASE; break; }
        if (this.atkCD === 0) {
          const dmg = Math.max(1, this.stats.atk + Phaser.Math.Between(-2, 2));
          player.takeDamage(dmg);
          this.atkCD = 1300;
          this.setTint(0xffcccc);
          this.scene.time.delayedCall(110, () => { if (!this.isDead && this.active) this.clearTint(); });
        }
        break;
    }

    // Sync visuals
    this._syncUI();
  }

  takeDamage(amount, attacker) {
    if (this.isDead) return;
    this.stats.hp = Math.max(0, this.stats.hp - amount);
    this.scene.events.emit('damage', this.x, this.y, amount, '#ffcc00');

    this.setTint(0xffffff);
    this.scene.time.delayedCall(80, () => { if (!this.isDead && this.active) this.clearTint(); });

    this.state = S.CHASE;

    if (this.stats.hp <= 0) this._die(attacker);
  }

  _die(killer) {
    this.isDead = true;
    this.state  = S.DEAD;
    this.setVelocity(0, 0);

    // Loot drops
    (this._data.loot || []).forEach(item => {
      if (Math.random() > 0.38)
        this.scene.spawnLoot(
          this.x + Phaser.Math.Between(-18, 18),
          this.y + Phaser.Math.Between(-18, 18),
          item
        );
    });

    // Kill target reference in player
    if (killer?.attackTarget === this) killer.attackTarget = null;

    // XP
    if (killer) killer.gainXP(this._data.xp);

    // Fade out
    this.scene.tweens.add({
      targets: [this, this.hpBg, this.hpFill, this.label],
      alpha: 0, duration: 900,
    });

    // Respawn
    this.scene.time.delayedCall(18000, () => this._respawn());
  }

  _respawn() {
    if (!this.scene || !this.active) return;
    this.stats.hp = this.stats.maxHp;
    this.isDead   = false;
    this.state    = S.IDLE;
    this.pTimer   = 0;
    this.setPosition(this.spawnX, this.spawnY);
    this.clearTint();
    [this, this.hpBg, this.hpFill, this.label].forEach(o => {
      if (o && o.active) this.scene.tweens.add({ targets: o, alpha: 1, duration: 1200 });
    });
  }

  _syncUI() {
    const ratio = Math.max(0, this.stats.hp / this.stats.maxHp);
    this.hpBg.setPosition(this.x, this.y - 20);
    this.hpFill.setPosition(this.x - 15, this.y - 20);
    this.hpFill.setSize(30 * ratio, 4);
    this.label.setPosition(this.x, this.y - 30);
  }
}
