/**
 * post-build.js (CommonJS)
 * Runs after `vite build` to copy static game assets into dist/.
 *
 * Vite bundles src/ but can't process the game's image assets loaded via
 * hardcoded absolute paths (e.g. "/assets/tileset.png"). We copy them here
 * so dist/ is fully self-contained for Electron packaging and Capacitor sync.
 */

'use strict';

const { cpSync, existsSync, mkdirSync } = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

function copy(src, dest) {
  const srcPath  = path.join(root, src);
  const destPath = path.join(dist, dest);
  if (!existsSync(srcPath)) {
    console.warn(`[post-build] skipping missing: ${src}`);
    return;
  }
  mkdirSync(path.dirname(destPath), { recursive: true });
  cpSync(srcPath, destPath, { recursive: true, force: true });
  console.log(`[post-build] copied ${src} → dist/${dest}`);
}

// Game image assets (tileset, sprites, etc.)
copy('assets', 'assets');

// Lore & quest data referenced at runtime
copy('lore', 'lore');
copy('quests', 'quests');

// Icons directory (for PWA manifest)
if (existsSync(path.join(root, 'icons'))) {
  copy('icons', 'icons');
}

// Screenshots (for Xbox / Microsoft Store listing)
if (existsSync(path.join(root, 'screenshots'))) {
  copy('screenshots', 'screenshots');
}

console.log('[post-build] done.');
