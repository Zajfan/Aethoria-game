import { CONFIG      } from '../config.js';
import { AethoriaAI  } from '../ai/AethoriaAI.js';

export class NPC extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, npcIndex) {
    super(scene, x, y, 'npc_' + npcIndex);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.npcData  = CONFIG.NPCS_DATA[npcIndex];
    this.npcIndex = npcIndex;
    this.setDepth(9);
    this.body.setImmovable(true);
    this.setInteractive({ useHandCursor: true });

    this.history = [];

    const col = '#' + this.npcData.color.toString(16).padStart(6, '0');
    this.nameLabel = scene.add.text(x, y - 24, this.npcData.name, {
      fontFamily:'Courier New', fontSize:'10px', color: col,
    }).setOrigin(0.5).setDepth(14);
    this.roleLabel = scene.add.text(x, y - 14, '[' + this.npcData.role + ']', {
      fontFamily:'Courier New', fontSize:'9px', color:'#888888',
    }).setOrigin(0.5).setDepth(14);
    this.hintLabel = scene.add.text(x, y - 36, '> Press E / Click', {
      fontFamily:'Courier New', fontSize:'9px', color:'#ffff88',
    }).setOrigin(0.5).setDepth(15).setVisible(false);

    // Shop indicator
    const tradeSystem = scene.tradeSystem;
    if (tradeSystem?.hasShop(this.npcData.role)) {
      scene.add.text(x, y - 44, '[shop]', {
        fontFamily:'Courier New', fontSize:'8px', color:'#ffdd44',
      }).setOrigin(0.5).setDepth(14);
    }
  }

  setHintVisible(v) { this.hintLabel.setVisible(v); }

  syncLabels() {
    this.nameLabel.setPosition(this.x, this.y - 24);
    this.roleLabel.setPosition(this.x, this.y - 14);
    this.hintLabel.setPosition(this.x, this.y - 36);
  }

  async talk(playerInput, playerStats, worldEventName = null) {
    const tradeHint = this.scene.tradeSystem?.hasShop(this.npcData.role)
      ? ' You also run a small shop — mention it naturally if asked about goods.'
      : '';

    const eventHint = worldEventName
      ? ` The world event "${worldEventName}" is happening right now — react to it naturally.`
      : '';

    const sys =
`You are ${this.npcData.name}, ${this.npcData.role} in the fantasy realm of Aethoria.
Background: ${this.npcData.bio}
World lore: ${CONFIG.WORLD_LORE}
Player status: Level ${playerStats?.level || 1}, HP ${playerStats?.hp || 100}/${playerStats?.maxHp || 100}, Gold ${playerStats?.gold || 0}, Class ${playerStats?.class || 'unknown'}.
${tradeHint}${eventHint}
Respond in character in 2-3 sentences max. Be vivid, helpful, lore-rich. Never mention AI or break character.`;

    this.history.push({ role: 'user', content: playerInput });
    const reply = await AethoriaAI.chat(sys, this.history, this.npcData.name);
    this.history.push({ role: 'assistant', content: reply });
    if (this.history.length > 20) this.history = this.history.slice(-20);
    return reply;
  }

  destroy() {
    this.nameLabel?.destroy();
    this.roleLabel?.destroy();
    this.hintLabel?.destroy();
    super.destroy();
  }
}
