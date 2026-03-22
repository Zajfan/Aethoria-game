const CACHE = 'aethoria-v5';
const ASSETS = [
  '/','index.html','/manifest.json','/src/main.js','/src/config.js',
  '/src/scenes/BootScene.js','/src/scenes/MenuScene.js',
  '/src/scenes/WorldScene.js','/src/scenes/UIScene.js','/src/scenes/DungeonScene.js',
  '/src/entities/Player.js','/src/entities/Enemy.js',
  '/src/entities/NPC.js','/src/entities/Boss.js',
  '/src/systems/WorldGen.js','/src/systems/QuestSystem.js',
  '/src/systems/SaveSystem.js','/src/systems/DayNight.js',
  '/src/systems/AudioSystem.js','/src/systems/TradeSystem.js',
  '/src/systems/WorldEvents.js','/src/systems/AchievementSystem.js',
  '/src/systems/AIMemory.js','/src/systems/WorldObjects.js','/src/ai/AethoriaAI.js',
];
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{}));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  if (e.request.url.includes('/src/')) {
    e.respondWith(fetch(e.request).then(r=>{
      const c=r.clone();
      caches.open(CACHE).then(cache=>cache.put(e.request,c));
      return r;
    }).catch(()=>caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
