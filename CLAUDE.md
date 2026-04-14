# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Dev server (Vite) — port 8001 (8080 is taken by Nexus on this machine)
npm run dev

# Co-op relay server — port 3000 by default
npm run server:dev          # node --watch server/index.js
npm run server              # node server/index.js

# Desktop (Electron)
npm run electron:dev        # Vite + Electron concurrently
npm run dist:linux          # package for Linux
npm run dist:win            # package for Windows
npm run dist:mac            # package for macOS

# Production build (outputs to dist/)
npm run build               # vite build + scripts/post-build.js

# Mobile (Capacitor) — requires Android Studio / Xcode
npm run cap:android         # build → sync → open Android Studio
npm run cap:ios             # build → sync → open Xcode
```

> Vite is configured with `usePolling: true` — this machine has a low inotify limit.
> The dev server runs on port 8001, not 8080. Open `http://localhost:8001` after `npm run dev`.

## Architecture

### Entry point

`index.html` → `src/main.js` bootstraps the Three.js renderer, camera, and input manager, then wires up scene transitions and the game loop. There is no framework — just plain ES modules and Three.js r165 (via npm, resolved by Vite).

### Scene system

Two scenes share the same `Renderer`, `Camera`, and `InputManager` singletons:

- **`src/scenes/GameScene.js`** — the overworld (512×512 tile map, `TILE_SIZE = 4` Three.js units per tile). Owns all systems and entities for the open world. When entering a dungeon it serialises player state and emits `enterDungeon` on the EventBus.
- **`src/scenes/DungeonScene3D.js`** — procedurally generated 3D dungeon. Returns player state to `GameScene` on exit.

`main.js` swaps the active scene with a fade transition. Each scene implements `create(savedData)`, `update(delta)`, and `dispose()`.

### Engine layer (`src/engine/`)

| File | Role |
|---|---|
| `Renderer.js` | Three.js `WebGLRenderer` singleton; exposes `getDelta()` for the game loop |
| `Camera.js` | Isometric RPG camera (RuneScape style) — rotate Q/E, zoom mouse wheel |
| `InputManager.js` | Keyboard, mouse, touch, and gamepad input (also see `GamepadManager.js`) |
| `EventBus.js` | Pub/sub singleton used for all cross-system communication |

### Game data

**Everything** lives in `src/config.js` — biome definitions, enemy stats, item tables, NPC personalities, skill trees, faction data, world-gen parameters. This is the single source of truth for game balance. Modify here, not in individual systems.

### Systems (`src/systems/`)

`GameScene` instantiates all systems and passes itself as the scene proxy. Key systems:

| System | Notes |
|---|---|
| `WorldGen.js` | Generates the 4096×4096 heightmap tile world (seed 42 — same world for all players) |
| `World3D.js` (in `src/world/`) | Renders tiles with instanced meshes |
| `SaveSystem.js` | IndexedDB persistence; auto-saves every 30 s and on scene transitions |
| `QuestSystem.js` | Kill/collect/explore quest tracking; quest flavor is scripted (no live API calls) |
| `FactionSystem.js` | −1000→+1000 rep per faction; affects NPC prices and unlocks |
| `CombatSystem.js` | Damage, status effects (BURN/POISON/FREEZE/STUN/BLEED/VOID_CURSE), hit resolution |
| `AudioSystem.js` | Web Audio API with HRTF 3D panning, reverb, dynamic combat layers |
| `CoopClient.js` | WebSocket client for co-op relay — see server below |
| `StorySystem.js` | Main quest arc tracking and NPC story-gate logic |
| `AIMemory.js` | Records gameplay events (kills, level-ups, region visits) for internal game state — **no longer feeds a live AI API** |

### NPC behaviour

NPC dialogue and reactions are **scripted in the codebase** — behaviour trees, per-NPC personality profiles, and contextual fallback lines in `src/ai/AethoriaAI.js`. The game is solo + co-op and does not make live calls to the Anthropic API. `AethoriaAI.js` and `AIMemory.js` exist as scaffolding from an earlier design direction; new NPC logic should be added as coded behaviour, not API prompts.

### Co-op server (`server/index.js`)

Lightweight WebSocket relay (Node.js + `ws`). **Dumb relay only — not authoritative.** Each client runs the full simulation locally (Diablo 2 style). The server relays `state` and `event` packets between peers in the same session. Sessions are identified by a short room code. Max 4 players per session.

### Editor (`aeth-ed.html`)

Browser-based level/data editor. Loaded as a second Vite entry point alongside `index.html`. Tabs: Save Inspector, Config Editor, Quest Browser, Lore Browser.

### Build targets

| Target | Command | Output |
|---|---|---|
| Web / GitHub Pages | `npm run build` | `dist/` |
| Electron desktop | `npm run dist:linux/win/mac` | `release/` |
| Android PWA | `npm run cap:android` | Capacitor project |
| iOS PWA | `npm run cap:ios` | Capacitor project |

The Electron `main.js` starts a local HTTP server to serve `dist/` — this keeps absolute paths (`/assets/…`) working identically to the web target.

### World constants

The overworld is 4096×4096 tiles at `TILE_SIZE = 4` Three.js units per tile = 16384×16384 world units (~16 km per side, ~256 km² total — roughly 7× the size of Skyrim). World seed is `42` (fixed — same map for every player). The town safe-zone radius is `40 × TILE_SIZE` world units around Hearthmoor. **Note:** worldgen is a synchronous JS loop over 16.7 M tiles; a Web Worker offload may be needed if initial load time becomes unacceptable.
