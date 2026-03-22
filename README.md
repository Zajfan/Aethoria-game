# ⚔️ Aethoria

**An AI-Powered Open World RPG** — built with pure web tech, no game engine required.

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

## ✨ Features (v0.1)

| System | Description |
|---|---|
| 🌍 Procedural world | 120×120 tile map with biomes: water, grasslands, forest, stone, sand, dungeon |
| ⚔️ Combat | Click-to-attack enemies. Auto-attack when in range. Level up, gain stats |
| 🤖 AI NPCs | 5 unique characters powered by Claude API — dynamic dialogue and quest hints |
| 🎒 Inventory | Pick up loot, equip weapons/armor, brew potions, craft items |
| 📱 PWA | Installable on Android and iOS. Works offline (minus AI dialogue) |

---

## 🕹️ Controls

| Key | Action |
|---|---|
| `W A S D` / Arrow keys | Move |
| `E` | Talk to nearby NPC |
| `I` | Open/close inventory |
| Click enemy | Target and auto-attack |
| Click ground | Move to location (touch friendly) |

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
