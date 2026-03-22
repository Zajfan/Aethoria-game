import { CONFIG } from '../config.js';
import { LORE   } from './LoreDatabase.js';

const SHARD_COLORS = [0xffd700, 0x44ff88, 0xcc44ff, 0x44ccff, 0xff4444];

export class ShardSystem {
  constructor(scene) {
    this.scene  = scene;
    this.shards = [];  // spawned shard objects
    this._makeTextures();
  }

  _makeTextures() {
    SHARD_COLORS.forEach((col, i) => {
      const key = 'shard_' + (i+1);
      if (this.scene.textures.exists(key)) return;
      const g = this.scene.make.graphics({ add: false });
      // Crystal diamond shape
      g.fillStyle(0x111111);
      g.fillTriangle(12,0, 24,12, 12,24);
      g.fillTriangle(12,0, 0,12, 12,24);
      g.fillStyle(col);
      g.fillTriangle(12,2, 22,12, 12,22);
      g.fillTriangle(12,2, 2,12, 12,22);
      g.fillStyle(0xffffff, 0.6);
      g.fillTriangle(12,2, 22,12, 12,10);
      g.generateTexture(key, 24, 24);
      g.destroy();
    });
  }

  spawnShards(mapData) {
    const T   = CONFIG.TILE_SIZE;
    const mw  = mapData[0].length;
    const mh  = mapData.length;
    const cx  = Math.floor(mw / 2);
    const cy  = Math.floor(mh / 2);

    // Shard positions relative to map center
    const positions = [
      { id:1, tx: cx+2,  ty: cy-8,  label:'Shard I'   },  // near town ruins
      { id:2, tx: cx+18, ty: cy+15, label:'Shard II'   },  // forest edge
      { id:3, tx: cx+48, ty: cy-12, label:'Shard III'  },  // near dungeon
      { id:4, tx: cx-30, ty: cy-20, label:'Shard IV'   },  // far northwest
      { id:5, tx: cx+40, ty: cy+30, label:'Shard V'    },  // far southeast
    ];

    positions.forEach(pos => {
      const x = Math.min(mw-3, Math.max(2, pos.tx)) * T + T/2;
      const y = Math.min(mh-3, Math.max(2, pos.ty)) * T + T/2;

      const spr = this.scene.add.sprite(x, y, 'shard_' + pos.id)
        .setDepth(6)
        .setInteractive({ useHandCursor: true });
      spr.shardId = pos.id;
      spr.label   = pos.label;

      // Floating + spinning animation
      this.scene.tweens.add({
        targets: spr, y: y - 8, duration: 1400 + pos.id * 200,
        yoyo: true, repeat: -1, ease: 'Sine.InOut',
      });
      this.scene.tweens.add({
        targets: spr, angle: 360, duration: 3000 + pos.id * 500,
        repeat: -1, ease: 'Linear',
      });

      // Glow circle
      const glow = this.scene.add.circle(x, y, 18, SHARD_COLORS[pos.id-1], 0.15).setDepth(5);
      this.scene.tweens.add({
        targets: glow, alpha: 0.04, scale: 1.5, duration: 900,
        yoyo: true, repeat: -1,
      });

      // Label
      const lbl = this.scene.add.text(x, y + 20, pos.label, {
        fontFamily: 'Courier New', fontSize: '9px',
        color: '#' + SHARD_COLORS[pos.id-1].toString(16).padStart(6,'0'),
      }).setOrigin(0.5).setDepth(6);

      spr.glowRef  = glow;
      spr.labelRef = lbl;

      spr.on('pointerdown', () => this._tryCollect(spr));

      this.shards.push(spr);
    });
  }

  _tryCollect(spr) {
    const player = this.scene.player;
    if (!player) return;
    const dist = Phaser.Math.Distance.Between(player.x, player.y, spr.x, spr.y);
    if (dist > 64) {
      this.scene.events.emit('damage', spr.x, spr.y - 20, 'Get closer!', '#ffaa44');
      return;
    }

    const shardData = LORE.shards[spr.shardId - 1];
    const col = '#' + SHARD_COLORS[spr.shardId - 1].toString(16).padStart(6,'0');

    // Collect animation
    this.scene.tweens.add({
      targets: [spr, spr.glowRef, spr.labelRef],
      y: player.y - 60, alpha: 0, duration: 800,
      ease: 'Back.In',
      onComplete: () => {
        spr.glowRef?.destroy();
        spr.labelRef?.destroy();
        spr.destroy();
      },
    });

    // Screen flash
    const flash = this.scene.add.rectangle(
      this.scene.cameras.main.scrollX + this.scene.cameras.main.width / 2,
      this.scene.cameras.main.scrollY + this.scene.cameras.main.height / 2,
      this.scene.cameras.main.width * 2, this.scene.cameras.main.height * 2,
      SHARD_COLORS[spr.shardId - 1], 0.4
    ).setDepth(100).setScrollFactor(0);
    this.scene.tweens.add({ targets: flash, alpha: 0, duration: 600, onComplete: () => flash.destroy() });

    // Announce
    this.scene.events.emit('damage', spr.x, spr.y, shardData?.name || 'Shard!', col);
    this.scene.audio?.sfxAchieve();

    // Tell story system
    this.scene.storySystem?.collectShard(spr.shardId);

    // Show lore
    const ui = this.scene.scene.get('UIScene');
    if (ui && shardData) ui.showLorePopup(shardData.name, shardData.lore, col);

    player.gainXP(500 * spr.shardId);
  }

  // Hide collected shards on load
  restoreState(collectedIds) {
    collectedIds.forEach(id => {
      const spr = this.shards.find(s => s.shardId === id);
      if (spr) {
        spr.glowRef?.destroy();
        spr.labelRef?.destroy();
        spr.destroy();
        this.shards = this.shards.filter(s => s.shardId !== id);
      }
    });
  }
}
