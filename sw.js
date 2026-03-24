const CACHE = 'aethoria-v6';
const ASSETS = [
  '/','index.html','/manifest.json','/src/main.js','/src/config.js',
  '/src/engine/Renderer.js','/src/engine/Camera.js',
  '/src/engine/InputManager.js','/src/engine/EventBus.js',
  '/src/scenes/GameScene.js','/src/scenes/DungeonScene3D.js',
  '/src/entities/Player.js','/src/entities/Enemy.js',
  '/src/entities/NPC.js','/src/entities/Boss.js',
  '/src/entities/Player3D.js','/src/entities/Enemy3D.js',
  '/src/entities/NPC3D.js','/src/entities/Boss3D.js','/src/entities/Entity3D.js',
  '/src/systems/WorldGen.js','/src/systems/QuestSystem.js',
  '/src/systems/SaveSystem.js','/src/systems/DayNight.js',
  '/src/systems/AudioSystem.js','/src/systems/TradeSystem.js',
  '/src/systems/WorldEvents.js','/src/systems/AchievementSystem.js',
  '/src/systems/AIMemory.js','/src/systems/WorldObjects.js',
  '/src/systems/LoreDatabase.js','/src/systems/ShardSystem.js','/src/systems/StorySystem.js',
  '/src/ai/AethoriaAI.js','/src/ui/HUD.js','/src/world/World3D.js',
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
