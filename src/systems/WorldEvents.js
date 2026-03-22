import { AIMemory } from './AIMemory.js';

const EVENTS = [
  {
    id: 'goblin_raid', name: 'Goblin Raid', color: 0xff4422,
    desc: 'Goblins are raiding Hearthmoor! Defend the town!',
    duration: 70, effect: 'spawn_burst',
  },
  {
    id: 'merchant_fair', name: 'Merchant Festival', color: 0xffd700,
    desc: 'A grand festival fills Hearthmoor — merchants offer rare goods!',
    duration: 90, effect: 'price_down',
  },
  {
    id: 'dark_eclipse', name: 'Dark Eclipse', color: 0x330055,
    desc: 'The sun dims — undead grow bolder in the darkness.',
    duration: 50, effect: 'darken',
  },
  {
    id: 'plague', name: 'The Grey Plague', color: 0x44aa44,
    desc: 'A mysterious sickness spreads — you feel weakened.',
    duration: 75, effect: 'hp_drain',
  },
  {
    id: 'crystal_storm', name: 'Crystal Storm', color: 0x44ccff,
    desc: 'Arcane crystals rain from the sky — riches await the bold!',
    duration: 55, effect: 'loot_burst',
  },
  {
    id: 'void_rift', name: 'Void Rift', color: 0x8800ee,
    desc: 'A tear in reality opens near the dungeon — great danger and reward!',
    duration: 45, effect: 'boss_buff',
  },
];

export class WorldEvents {
  constructor(scene) {
    this.scene       = scene;
    this.current     = null;
    this._countdown  = this._nextDelay();
    this._plagueTick = null;
  }

  _nextDelay() { return 80000 + Math.random() * 100000; }

  update(delta) {
    this._countdown -= delta;
    if (this._countdown <= 0 && !this.current) {
      this._trigger();
      this._countdown = this._nextDelay();
    }
    if (this.current) {
      this.current.remaining -= delta / 1000;
      if (this.current.remaining <= 0) this._end();
    }
  }

  _trigger() {
    const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    this.current = { ...ev, remaining: ev.duration };
    AIMemory.recordWorldEvent(ev.name);
    this.scene.events.emit('worldEvent', this.current);
    this._apply(ev, true);
  }

  _end() {
    if (!this.current) return;
    this._apply(this.current, false);
    this.scene.events.emit('worldEventEnd', this.current);
    this.current = null;
  }

  _apply(ev, start) {
    const scene  = this.scene;
    const player = scene.player;
    const trade  = scene.tradeSystem;

    switch (ev.effect) {
      case 'darken':
        scene.dayNight?.overlay?.setAlpha(start ? 0.6 : 0);
        break;

      case 'hp_drain':
        if (start) {
          this._plagueTick = scene.time.addEvent({
            delay: 6000, loop: true,
            callback: () => { if (player?.active && player.stats.hp > 1) player.takeDamage(4); },
          });
        } else {
          this._plagueTick?.remove();
          this._plagueTick = null;
        }
        break;

      case 'price_down':
        trade?.setPriceBoost(start ? 0.6 : 1.0);
        break;

      case 'boss_buff':
        scene.enemies?.forEach(e => {
          if (!e.isDead) e.stats.atk = start
            ? Math.floor(e.stats.atk * 1.4)
            : Math.floor(e.stats.atk / 1.4);
        });
        break;

      case 'loot_burst':
        if (start) {
          const items = ['gold','gem','herb','potion'];
          for (let i = 0; i < 6; i++) {
            const x = player.x + Phaser.Math.Between(-160, 160);
            const y = player.y + Phaser.Math.Between(-160, 160);
            scene.time.delayedCall(i * 300, () => {
              scene.spawnLoot(x, y, items[Math.floor(Math.random() * items.length)]);
            });
          }
        }
        break;

      case 'spawn_burst':
        if (start) {
          const types = ['GOBLIN', 'GOBLIN', 'WOLF'];
          for (let i = 0; i < 5; i++) {
            scene.time.delayedCall(i * 500, () => {
              const { Enemy } = scene.registry.get('Enemy') || {};
              if (!scene.enemies) return;
              const key = types[i % types.length];
              const x   = player.x + Phaser.Math.Between(-200, 200);
              const y   = player.y + Phaser.Math.Between(-200, 200);
              const CONFIG_local = scene.registry.get('CONFIG');
              import('../entities/Enemy.js').then(({ Enemy: E }) => {
                const e = new E(scene, x, y, key);
                e.setInteractive({ useHandCursor: true });
                e.on('pointerdown', () => { if (!e.isDead) player.setTarget(e); });
                scene.physics.add.collider(e, scene.groundLayer);
                scene.enemies.push(e);
              });
            });
          }
        }
        break;
    }
  }

  getCurrent() { return this.current; }
}
