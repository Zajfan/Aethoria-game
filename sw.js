const CACHE = 'aethoria-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/main.js',
  '/src/config.js',
  '/src/scenes/BootScene.js',
  '/src/scenes/MenuScene.js',
  '/src/scenes/WorldScene.js',
  '/src/scenes/UIScene.js',
  '/src/entities/Player.js',
  '/src/entities/Enemy.js',
  '/src/entities/NPC.js',
  '/src/systems/WorldGen.js',
  '/src/ai/AethoriaAI.js',
];

self.addEventListener('install',   e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))));
self.addEventListener('activate',  e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
