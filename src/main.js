import { BootScene    } from './scenes/BootScene.js';
import { MenuScene    } from './scenes/MenuScene.js';
import { WorldScene   } from './scenes/WorldScene.js';
import { UIScene      } from './scenes/UIScene.js';
import { DungeonScene } from './scenes/DungeonScene.js';

const cfg = {
  type: Phaser.AUTO,
  width:  window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#0a0a0f',
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: { gravity:{ y:0 }, debug:false },
  },
  scene: [BootScene, MenuScene, WorldScene, UIScene, DungeonScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 3 },
  render: { antialias: false, pixelArt: true },
};

window.AethoriaGame = new Phaser.Game(cfg);

window.addEventListener('resize', () => {
  window.AethoriaGame.scale.resize(window.innerWidth, window.innerHeight);
});
