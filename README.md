# ⚔️ Aethoria

**An AI-Powered 3D Open World RPG** — built with pure web tech (Three.js + Claude AI), no install required.

NPCs powered by [Claude](https://anthropic.com), playable in the browser and installable as a PWA on Android and iOS.

---

## 🎮 Play

**Live (GitHub Pages):** https://zajfan.github.io/Aethoria-game

Or run locally:
```bash
# Any static server works — Python example:
python3 -m http.server 8080
# Then open http://localhost:8080
```
> ⚠️ Must be served over HTTP/HTTPS — cannot be opened as a local `file://` due to ES module restrictions.

---

## ✨ Features (v0.3)

| System | Description |
|---|---|
| 🌍 3D Procedural world | 256×256 tile map rendered in full 3D with Three.js — biomes: water, grasslands, forest, stone, sand, dungeon |
| 🎥 Isometric camera | RuneScape/Albion Online style perspective camera — rotate with Q/E, zoom with mouse wheel |
| ⚔️ Combat | Click-to-attack enemies in 3D. Auto-attack when in range. Level up, gain stats |
| 🤖 AI NPCs | 5 unique characters powered by Claude API — dynamic dialogue and quest hints |
| 📜 Quest system | AI-generated quests from NPCs, kill/collect/explore tracking, XP rewards |
| 🗺️ World map & minimap | Press M for full map, corner minimap always visible |
| 🏰 3D Dungeons & bosses | Procedural 3D room-corridor dungeon with phase-based boss AI |
| 🌳 Skill trees | Warrior, Mage, Ranger classes with 3 unique skills each |
| 💾 Save system | Auto-saves to IndexedDB every 30s |
| 🌅 Day/night cycle | Dynamic lighting cycle, weather (rain, fog, storm) |
| 🎒 Inventory & crafting | Pick up loot, equip weapons/armor, brew potions, craft items |
| 📱 Mobile PWA | Installable on Android and iOS. Virtual joystick + action buttons |

---

## 🕹️ Controls

| Key | Action |
|---|---|
| `W A S D` / Arrow keys | Move |
| `Q / E` | Rotate camera left / right |
| Mouse wheel | Zoom in / out |
| `E` | Talk to nearby NPC |
| `I` | Inventory |
| `Q` | Quest journal |
| `K` | Skill tree |
| `M` | World map |
| `ESC` | Close all panels |
| Click enemy | Target and auto-attack |
| Right-click ground | Move to location |

---

## 🔑 Claude API Key (optional)

The game works without an API key — NPCs use scripted fallback lines. To enable full AI dialogue:

1. Get a key at [console.anthropic.com](https://console.anthropic.com)
2. When the game starts, paste it in the API key modal
3. Or click **API Settings** on the title screen to update it any time

Your key is stored only in your browser's `localStorage`. It is never sent anywhere except directly to `api.anthropic.com`.

---

## 🗺️ Roadmap

- **v0.3** — ✅ Full 3D world using Three.js, isometric camera, procedural 3D terrain
- **v0.4** — GLTF model loading, animated characters, particle effects
- **v0.5** — WebSocket multiplayer (other players visible in the same world)
- **v1.0** — Full release with persistence, account system, leaderboards

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| 3D Rendering | [Three.js r165](https://threejs.org) (WebGL, ES modules via CDN) |
| AI | [Claude API](https://anthropic.com) (claude-sonnet) |
| Assets | Procedurally generated (Three.js geometries + materials) |
| Platform | PWA + [Capacitor](https://capacitorjs.com) for native mobile |
| Hosting | GitHub Pages |

---

## 📁 Structure

```
Aethoria/
├── index.html          ← Entry point, menu screen, API modal
├── manifest.json       ← PWA manifest
├── sw.js               ← Service worker (offline cache)
└── src/
    ├── main.js         ← Game bootstrap + scene manager
    ├── config.js       ← All game constants & data
    ├── engine/
    │   ├── Renderer.js    ← Three.js WebGL renderer wrapper
    │   ├── Camera.js      ← Isometric RPG camera controller
    │   ├── InputManager.js← Keyboard/mouse/touch input
    │   └── EventBus.js    ← Pub/sub event system
    ├── world/
    │   └── World3D.js     ← 3D tile world renderer (instanced meshes)
    ├── scenes/
    │   ├── GameScene.js   ← Main 3D gameplay world
    │   └── DungeonScene3D.js ← 3D dungeon
    ├── entities/
    │   ├── Entity3D.js    ← Base 3D entity
    │   ├── Player3D.js    ← Player controller (3D)
    │   ├── Enemy3D.js     ← Enemy AI (3D)
    │   ├── NPC3D.js       ← NPC with AI dialogue (3D)
    │   └── Boss3D.js      ← Phase-based boss (3D)
    ├── ui/
    │   └── HUD.js         ← HTML/CSS HUD (stats, inventory, quests, map)
    ├── systems/
    │   ├── WorldGen.js    ← Procedural 256×256 world generation
    │   ├── QuestSystem.js ← Quest management
    │   ├── SaveSystem.js  ← IndexedDB save/load
    │   ├── DayNight.js    ← Day/night cycle
    │   ├── AudioSystem.js ← Web Audio API sounds
    │   └── ...            ← Other game systems
    └── ai/
        └── AethoriaAI.js  ← Claude API integration
```

---

## License

MIT — build on it, fork it, make it yours.


NPCs powered by [Claude](https://anthropic.com), playable in the browser and installable as a PWA on Android and iOS.

---

## 🎮 Play

**Live (GitHub Pages):** https://zajfan.github.io/Aethoria-game

Or run locally:
```bash
# Any static server works — Python example:
python3 -m http.server 8080
# Then open http://localhost:8080
```
> ⚠️ Must be served over HTTP/HTTPS — cannot be opened as a local `file://` due to ES module restrictions.

---

## ✨ Features (v0.2)

| System | Description |
|---|---|
| 🌍 Procedural world | 120×120 tile map with biomes: water, grasslands, forest, stone, sand, dungeon |
| ⚔️ Combat | Click-to-attack enemies. Auto-attack when in range. Level up, gain stats |
| 🤖 AI NPCs | 5 unique characters powered by Claude API — dynamic dialogue and quest hints |
| 📜 Quest system | AI-generated quests from NPCs, kill/collect/explore tracking, XP rewards |
| 🗺️ World map & minimap | Press M for full map, corner minimap always visible |
| 🏰 Dungeons & bosses | Procedural room-corridor dungeon with phase-based boss AI (slam, enrage) |
| 🌳 Skill trees | Warrior, Mage, Ranger classes with 3 unique skills each — upgrade per level |
| 💾 Save system | Auto-saves to IndexedDB every 30s, restores on return from dungeon |
| 🌅 Day/night cycle | 4-minute day cycle, dynamic weather (rain, fog, storm), HUD clock |
| 🎒 Inventory & crafting | Pick up loot, equip weapons/armor, brew potions, craft items |
| 📱 Mobile PWA | Installable on Android and iOS. Virtual joystick + action buttons |

---

## 🕹️ Controls

| Key | Action |
|---|---|
| `W A S D` / Arrow keys | Move |
| `E` | Talk to nearby NPC |
| `I` | Inventory |
| `Q` | Quest journal |
| `K` | Skill tree |
| `M` | World map |
| `ESC` | Close all panels |
| Click enemy | Target and auto-attack |
| Click ground | Move to location (touch friendly) |
| Walk into dungeon portal | Enter dungeon |

---

## 🔑 Claude API Key (optional)

The game works without an API key — NPCs use scripted fallback lines. To enable full AI dialogue:

1. Get a key at [console.anthropic.com](https://console.anthropic.com)
2. When the game starts, paste it in the API key modal
3. Or click **API Settings** on the title screen to update it any time

Your key is stored only in your browser's `localStorage`. It is never sent anywhere except directly to `api.anthropic.com`.

---

## 🗺️ Roadmap

- **v0.2** — Biome-specific dungeon generation, boss enemies, skill trees
- **v0.3** — AI quest tracking with memory (Claude remembers your choices)
- **v0.4** — Isometric 2.5D tileset upgrade (Kenney ISO pack)
- **v0.5** — WebSocket multiplayer (other players visible in the same world)
- **v1.0** — Full release with persistence, account system, leaderboards

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Rendering | [Phaser 3](https://phaser.io) (JS library via CDN — no install) |
| AI | [Claude API](https://anthropic.com) (claude-sonnet) |
| Assets | Procedurally generated (pixel art via Canvas API) |
| Platform | PWA + [Capacitor](https://capacitorjs.com) for native mobile |
| Hosting | GitHub Pages |

---

## 📁 Structure

```
Aethoria/
├── index.html          ← Entry point, API modal, dialogue input
├── manifest.json       ← PWA manifest
├── sw.js               ← Service worker (offline cache)
└── src/
    ├── main.js         ← Phaser game init
    ├── config.js       ← All game constants & data
    ├── scenes/
    │   ├── BootScene.js   ← Procedural texture generation
    │   ├── MenuScene.js   ← Title screen
    │   ├── WorldScene.js  ← Main gameplay
    │   └── UIScene.js     ← HUD, dialogue, inventory
    ├── entities/
    │   ├── Player.js      ← Player controller
    │   ├── Enemy.js       ← Enemy AI (state machine)
    │   └── NPC.js         ← NPC with AI dialogue
    ├── systems/
    │   └── WorldGen.js    ← Procedural world generation
    └── ai/
        └── AethoriaAI.js  ← Claude API integration
```

---

## License

MIT — build on it, fork it, make it yours.
