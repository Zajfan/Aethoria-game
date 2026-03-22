import { CONFIG   } from '../config.js';
import { AIMemory } from './AIMemory.js';
import { Enemy    } from '../entities/Enemy.js';

const EVENTS = [
  { id:'goblin_raid',   name:'Goblin Raid',       color:0xff4422,
    desc:'Goblins are raiding Hearthmoor! Defend the village!', duration:70, effect:'spawn_burst' },
  { id:'merchant_fair', name:'Merchant Festival', color:0xffd700,
    desc:'A grand festival! Merchants offer rare goods at reduced prices.', duration:90, effect:'price_down' },
  { id:'dark_eclipse',  name:'Dark Eclipse',       color:0x330055,
    desc:'The sun dims — the undead grow bold in the darkness.', duration:50, effect:'darken' },
  { id:'plague',        name:'The Grey Plague',    color:0x44aa44,
    desc:'A mysterious sickness spreads through the land.', duration:75, effect:'hp_drain' },
  { id:'crystal_storm', name:'Crystal Storm',      color:0x44ccff,
    desc:'Arcane crystals rain from the sky — riches await the bold!', duration:55, effect:'loot_burst' },
  { id:'void_rift',     name:'Void Rift',          color:0x8800ee,
    desc:'A tear in reality opens near the dungeon.', duration:45, effect:'boss_buff' },
];

export class WorldEvents {
  constructor(scene) {
    this.scene = scene;
    this.current = null;
    this._countdown = 80000 + Math.random() * 100000;
    this._plagueTick = null;
  }

  update(delta) {
    this._countdown -= delta;
    if (this._countdown <= 0 && !this.current) {
      const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
      this.current = { ...ev, remaining: ev.duration };
      AIMemory.recordWorldEvent(ev.name);
      this.scene.events.emit('worldEvent', this.current);
      this._apply(ev, true);
      this._countdown = 80000 + Math.random() * 100000;
    }
    if (this.current) {
      this.current.remaining -= delta / 1000;
      if (this.current.remaining <= 0) {
        this._apply(this.current, false);
        this.scene.events.emit('worldEventEnd', this.current);
        this.current = null;
      }
    }
  }

  _apply(ev, start) {
    const scene = this.scene, player = scene.player;
    switch (ev.effect) {
      case 'darken':
        if (scene.dayNight?.overlay) scene.dayNight.overlay.setAlpha(start ? 0.65 : 0);
        break;
      case 'hp_drain':
        if (start) {
          this._plagueTick = scene.time.addEvent({ delay:5000, loop:true,
            callback: () => { if (player?.active && player.stats.hp > 5) player.takeDamage(5); } });
        } else { this._plagueTick?.remove(); this._plagueTick = null; }
        break;
      case 'price_down':
        scene.tradeSystem?.setPriceBoost(start ? 0.55 : 1.0);
        break;
      case 'boss_buff':
        scene.enemies?.forEach(e => {
          if (!e.isDead) e.stats.atk = start ? Math.floor(e.stats.atk*1.4) : Math.floor(e.stats.atk/1.4);
        });
        break;
      case 'loot_burst':
        if (start && player) {
          const items = ['gold','gem','herb','potion'];
          for (let i=0; i<8; i++) {
            scene.time.delayedCall(i*250, () => {
              const x = player.x + Phaser.Math.Between(-180,180);
              const y = player.y + Phaser.Math.Between(-180,180);
              scene.spawnLoot?.(x, y, items[Math.floor(Math.random()*items.length)]);
            });
          }
        }
        break;
      case 'spawn_burst':
        if (start && player) {
          const types = ['GOBLIN','GOBLIN','WOLF','GOBLIN'];
          for (let i=0; i<5; i++) {
            scene.time.delayedCall(i*450, () => {
              if (!scene.enemies) return;
              const angle = Math.random()*Math.PI*2, dist = 180+Math.random()*80;
              const e = new Enemy(scene, player.x+Math.cos(angle)*dist, player.y+Math.sin(angle)*dist, types[i%types.length]);
              e.setInteractive({ useHandCursor:true });
              e.on('pointerdown', () => { if (!e.isDead) { player.setTarget(e); player.moveTarget=null; } });
              if (scene.groundLayer) scene.physics.add.collider(e, scene.groundLayer);
              scene.enemies.push(e);
            });
          }
        }
        break;
    }
  }

  getCurrent() { return this.current; }
}
