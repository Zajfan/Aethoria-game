/**
 * main.js — Aethoria 3D RPG entry point
 * Bootstraps Three.js renderer, camera, input, and game scenes.
 * No Phaser dependency.
 */

import { getRenderer }     from './engine/Renderer.js';
import { getCamera }       from './engine/Camera.js';
import { inputManager }    from './engine/InputManager.js';
import { eventBus }        from './engine/EventBus.js';
import { GameScene }       from './scenes/GameScene.js';
import { DungeonScene3D }  from './scenes/DungeonScene3D.js';
import { HUD }             from './ui/HUD.js';
import { SaveSystem }      from './systems/SaveSystem.js';
import { CONFIG }          from './config.js';

// ── Singleton engine objects ────────────────────────────────────────────────
const renderer   = getRenderer();
const camCtrl    = getCamera(renderer);

// ── State ────────────────────────────────────────────────────────────────────
let activeScene  = null;   // GameScene | DungeonScene3D
let hud          = null;
let running      = false;
let savedGame    = null;

// ── Fade overlay ─────────────────────────────────────────────────────────────
const fadeEl = document.getElementById('fade-overlay');
function fadeTo(opacity, ms = 500) {
  return new Promise(resolve => {
    if (!fadeEl) { resolve(); return; }
    fadeEl.style.transition = `opacity ${ms}ms`;
    fadeEl.style.opacity    = opacity;
    setTimeout(resolve, ms + 50);
  });
}

// ── Game loop ─────────────────────────────────────────────────────────────────
function loop() {
  if (!running) return;
  requestAnimationFrame(loop);

  const delta = renderer.getDelta();
  if (!delta || delta > 0.2) return;   // skip huge frames (tab was hidden)

  if (activeScene) {
    activeScene.update(delta);
    // Sync camera to player position
    if (activeScene.player) {
      camCtrl.follow(activeScene.player.position);
    }
    camCtrl.update(delta, inputManager);
    // Sync world chunk visibility
    if (activeScene.world && activeScene.player) {
      const p = activeScene.player.position;
      activeScene.world.updateVisibleChunks(p.x, p.z);
    }
  }

  inputManager.update();

  if (hud && activeScene) hud.update(activeScene);

  // Render
  const scene3d = activeScene?.scene3d;
  if (scene3d) renderer.render(scene3d, camCtrl.threeCamera);
}

// ── Start a world game (new or from save) ────────────────────────────────────
async function startGame(savedPlayerData) {
  await fadeTo(1, 400);
  if (activeScene) { activeScene.dispose(); activeScene = null; }
  if (hud)         { hud.dispose?.();       hud = null;         }

  const scene = new GameScene(renderer, camCtrl, inputManager, eventBus);
  await scene.create(savedPlayerData);
  activeScene = scene;

  hud = new HUD(eventBus, scene.questSystem, scene.tradeSystem);
  hud.bindGame(scene);

  if (!running) { running = true; loop(); }
  await fadeTo(0, 600);
}

// ── Enter dungeon ─────────────────────────────────────────────────────────────
async function enterDungeon(savedPlayer) {
  await fadeTo(1, 500);
  if (activeScene) { activeScene.dispose(); activeScene = null; }

  const dScene = new DungeonScene3D(renderer, camCtrl, inputManager, eventBus);
  await dScene.create(savedPlayer);
  activeScene = dScene;

  if (!running) { running = true; loop(); }
  await fadeTo(0, 600);
}

// ── Exit dungeon ──────────────────────────────────────────────────────────────
async function exitDungeon(savedPlayer) {
  await fadeTo(1, 500);
  if (activeScene) { activeScene.dispose(); activeScene = null; }
  await startGame(savedPlayer);
}

// ── EventBus wiring ───────────────────────────────────────────────────────────
eventBus.on('enterDungeon', ({ savedPlayer }) => enterDungeon(savedPlayer));
eventBus.on('exitDungeon',  ({ savedPlayer }) => exitDungeon(savedPlayer));

// ── Menu ──────────────────────────────────────────────────────────────────────
const menuEl     = document.getElementById('menu-screen');
const beginBtn   = document.getElementById('btn-start');
const continueBtn= document.getElementById('btn-continue');
const apiBtn     = document.getElementById('btn-api');
const classCards = document.querySelectorAll('.class-box');
let   selectedClass = 'WARRIOR';

classCards.forEach(card => {
  card.addEventListener('click', () => {
    classCards.forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedClass = card.dataset.class;
  });
  if (card.dataset.class === selectedClass) card.classList.add('selected');
});

if (beginBtn) {
  beginBtn.addEventListener('click', () => {
    localStorage.setItem('aethoria_class', selectedClass);
    menuEl?.classList.remove('show');
    startGame(null);
  });
}

if (continueBtn) {
  continueBtn.addEventListener('click', () => {
    menuEl?.classList.remove('show');
    startGame(savedGame);
  });
}

if (apiBtn) {
  apiBtn.addEventListener('click', () => {
    localStorage.removeItem('aethoria_no_ai');
    document.getElementById('api-modal')?.classList.add('show');
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  // Attach input to the canvas once it exists
  const canvas = renderer.canvas;
  if (!canvas) {
    throw new Error(
      '[Aethoria] Canvas is unavailable — WebGL may not be supported in this browser.'
    );
  }
  inputManager.attach(canvas);

  // Try to load a save
  try {
    const ss  = new SaveSystem();
    await ss.init();
    savedGame = await ss.load();
  } catch (_) { savedGame = null; }

  // Show/hide Continue button
  if (continueBtn) continueBtn.style.display = savedGame ? 'block' : 'none';

  // Show menu
  if (menuEl) menuEl.classList.add('show');
}

// Start once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
