import { CONFIG } from '../config.js';

const S = { IDLE:0, CHASE:1, ATTACK:2, SLAM:3, DEAD:4 };

export class Boss extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, typeKey) {
    const d = CONFIG.BOSS_TYPES[typeKey] || CONFIG.BOSS_TYPES.VOID_KNIGHT;
    super(scene, x, y, 'boss_' + typeKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this._data   = d;
    this.typeKey = typeKey;
    this.setDepth(11);
    this.body.setSize(d.sz * 1.6, d.sz * 1.6);

    this.stats   = { hp: d.hp, maxHp: d.hp, atk: d.atk, def: d.def, spd: d.spd };
    this.isDead  = false;
    this.phase   = 0;
    this.state   = S.IDLE;
    this.atkCD   = 0;
    this.slamCD  = 0;
    this.spawnX  = x;
    this.spawnY  = y;

    // HP bar
    this.hpBg    = scene.add.rectangle(x, y - 40, 80, 8, 0x330000).setDepth(20);
    this.hpFill  = scene.add.rectangle(x, y - 40, 80, 8, 0xaa00ff).setDepth(21).setOrigin(0, 0.5);
    this.nameTag = scene.add.text(x, y - 52, '★ ' + d.name + ' ★', {
      fontFamily:'Courier New', fontSize:'12px', color:'#dd88ff',
    }).setOrigin(0.5).setDepth(22);

    // Aura pulsing ring
    this.aura = scene.add.circle(x, y, d.sz + 10, d.color, 0.12).setDepth(8);
    scene.tweens.add({ targets: this.aura, scaleX:1.4, scaleY:1.4, alpha:0, duration:1200, repeat:-1, ease:'Sine.In' });
  }

  update(time, delta, player) {
    if (this.isDead) return;
    this.atkCD  = Math.max(0, this.atkCD  - delta);
    this.slamCD = Math.max(0, this.slamCD - delta);

    const dp = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    // Phase transitions
    const ratio = this.stats.hp / this.stats.maxHp;
    this._data.phases.forEach((ph, i) => {
      if (this.phase === i && ratio <= ph.threshold) {
        this.phase = i + 1;
        this._onPhaseChange(ph);
      }
    });

    switch (this.state) {
      case S.IDLE:
        if (dp < 320) this.state = S.CHASE;
        break;

      case S.CHASE:
        if (dp > 500) { this.state = S.IDLE; break; }
        if (dp <= 60) { this.state = S.ATTACK; break; }
        // Phase 2+ uses slam
        if (this.phase >= 1 && this.slamCD === 0 && dp < 160) {
          this.state = S.SLAM;
          break;
        }
        this.scene.physics.moveTo(this, player.x, player.y, this.stats.spd * (1 + this.phase * 0.3));
        break;

      case S.ATTACK:
        this.setVelocity(0, 0);
        if (dp > 80) { this.state = S.CHASE; break; }
        if (this.atkCD === 0) {
          const dmg = Math.max(1, this.stats.atk + Phaser.Math.Between(-4, 4));
          player.takeDamage(dmg);
          this.atkCD = Math.max(500, 1100 - this.phase * 220);
          this.setTint(0xff88ff);
          this.scene.time.delayedCall(120, () => { if (!this.isDead && this.active) this.clearTint(); });
        }
        break;

      case S.SLAM:
        this.setVelocity(0, 0);
        // Slam AoE — hits player if within 120px
        this.setTint(0xffffff);
        this.scene.time.delayedCall(400, () => {
          if (this.isDead || !this.active) return;
          this.clearTint();
          const d2 = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
          if (d2 < 120) player.takeDamage(this.stats.atk * 1.6 | 0);
          // Visual shockwave
          const ring = this.scene.add.circle(this.x, this.y, 10, this._data.color, 0.55).setDepth(30);
          this.scene.tweens.add({ targets: ring, radius:120, alpha:0, duration:400, onComplete:()=>ring.destroy() });
          this.slamCD = 5000;
          this.state  = S.CHASE;
        });
        break;
    }

    this._syncUI();
    this.aura.setPosition(this.x, this.y);
  }

  _onPhaseChange(ph) {
    this.scene.events.emit('bossPhase', ph.msg);
    this.stats.atk = Math.floor(this.stats.atk * 1.25);
    this.setTint(0xffffff);
    this.scene.time.delayedCall(200, () => { if (!this.isDead && this.active) this.clearTint(); });
    // Visual burst
    const ring = this.scene.add.circle(this.x, this.y, 20, 0xffffff, 0.8).setDepth(30);
    this.scene.tweens.add({ targets: ring, radius:240, alpha:0, duration:600, onComplete:()=>ring.destroy() });
  }

  takeDamage(amount, attacker) {
    if (this.isDead) return;
    const act = Math.max(1, amount - Math.floor(this.stats.def / 2));
    this.stats.hp = Math.max(0, this.stats.hp - act);
    this.scene.events.emit('damage', this.x, this.y, act, '#dd88ff');
    this.setTint(0xffffff);
    this.scene.time.delayedCall(90, () => { if (!this.isDead && this.active) this.clearTint(); });
    this.state = S.CHASE;
    if (this.stats.hp <= 0) this._die(attacker);
  }

  _die(killer) {
    this.isDead = true;
    this.setVelocity(0, 0);
    if (killer?.attackTarget === this) killer.attackTarget = null;
    if (killer) killer.gainXP(this._data.xp);

    (this._data.loot || []).forEach(item => {
      this.scene.spawnLoot(
        this.x + Phaser.Math.Between(-30, 30),
        this.y + Phaser.Math.Between(-30, 30),
        item
      );
    });

    this.scene.events.emit('bossKilled', this._data.name);
    this.scene.events.emit('damage', this.x, this.y, '☠ DEFEATED', '#ffd700');

    this.scene.tweens.add({
      targets: [this, this.hpBg, this.hpFill, this.nameTag, this.aura],
      alpha: 0, duration: 1400,
      onComplete: () => {
        [this.hpBg, this.hpFill, this.nameTag, this.aura].forEach(o => o?.destroy());
        this.destroy();
      },
    });
  }

  _syncUI() {
    const ratio = Math.max(0, this.stats.hp / this.stats.maxHp);
    this.hpBg.setPosition(this.x, this.y - 40);
    this.hpFill.setPosition(this.x - 40, this.y - 40);
    this.hpFill.setSize(80 * ratio, 8);
    this.nameTag.setPosition(this.x, this.y - 52);
  }
}
