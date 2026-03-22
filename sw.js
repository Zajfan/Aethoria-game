const CACHE = 'aethoria-v4';
const ASSETS = [
  '/','/index.html','/manifest.json',
  '/src/main.js','/src/config.js',
  '/src/scenes/BootScene.js','/src/scenes/MenuScene.js',
  '/src/scenes/WorldScene.js','/src/scenes/UIScene.js','/src/scenes/DungeonScene.js',
  '/src/entities/Player.js','/src/entities/Enemy.js',
  '/src/entities/NPC.js','/src/entities/Boss.js',
  '/src/systems/WorldGen.js','/src/systems/QuestSystem.js',
  '/src/systems/SaveSystem.js','/src/systems/DayNight.js',
  '/src/systems/AudioSystem.js','/src/systems/TradeSystem.js',
  '/src/systems/WorldEvents.js','/src/systems/AchievementSystem.js',
  '/src/systems/AIMemory.js','/src/systems/WorldObjects.js','/src/ai/AethoriaAI.js',
  '/assets/tileset.png','/assets/player.png','/assets/loot.png','/assets/particle.png',
  '/assets/enemy_GOBLIN.png','/assets/enemy_WOLF.png',
  '/assets/enemy_SKELETON.png','/assets/enemy_TROLL.png',
  '/assets/boss_VOID_KNIGHT.png','/assets/boss_STONE_COLOSSUS.png',
  '/assets/npc_0.png','/assets/npc_1.png','/assets/npc_2.png',
  '/assets/npc_3.png','/assets/npc_4.png',
];
self.addEventListener('install',  e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',    e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
