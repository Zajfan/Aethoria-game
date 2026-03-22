import { CONFIG } from '../config.js';
import { AethoriaAI } from '../ai/AethoriaAI.js';

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

    const hexColor = '#' + this.npcData.color.toString(16).padStart(6,'0');

    this.nameLabel = scene.add.text(x, y - 24, this.npcData.name, {
      fontFamily:'Courier New', fontSize:'10px', color: hexColor,
    }).setOrigin(0.5).setDepth(14);

    this.roleLabel = scene.add.text(x, y - 14, '[' + this.npcData.role + ']', {
      fontFamily:'Courier New', fontSize:'9px', color:'#888888',
    }).setOrigin(0.5).setDepth(14);

    this.hintLabel = scene.add.text(x, y - 36, '▸ Press E', {
      fontFamily:'Courier New', fontSize:'9px', color:'#ffff88',
    }).setOrigin(0.5).setDepth(15).setVisible(false);
  }

  setHintVisible(v) { this.hintLabel.setVisible(v); }

  syncLabels() {
    this.nameLabel.setPosition(this.x, this.y - 24);
    this.roleLabel.setPosition(this.x, this.y - 14);
    this.hintLabel.setPosition(this.x, this.y - 36);
  }

  async talk(playerInput, playerStats) {
    const sys = `You are ${this.npcData.name}, ${this.npcData.role} in Aethoria.
Background: ${this.npcData.bio}
World: ${CONFIG.WORLD_LORE}
Player: Level ${playerStats?.level || 1}, HP ${playerStats?.hp || 100}/${playerStats?.maxHp || 100}, Gold ${playerStats?.gold || 0}.
Respond in character — 2 to 3 short sentences max. Give quests, lore, or trade hints. Never break character or mention AI.`;

    this.history.push({ role:'user', content: playerInput });
    const reply = await AethoriaAI.chat(sys, this.history);
    this.history.push({ role:'assistant', content: reply });
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
