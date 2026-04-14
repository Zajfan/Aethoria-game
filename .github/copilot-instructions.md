# Aethoria Workspace Instructions

## Build and Run
- Install dependencies: `npm install`
- Start web dev server: `npm run dev` (Vite on port `8001`)
- Build production bundle: `npm run build` (outputs to `dist/` and runs `scripts/post-build.js`)
- Preview production build: `npm run preview` (port `8001`)
- Run co-op relay locally: `npm run server:dev` (port `3000`)
- Run Electron in dev: `npm run electron:dev`

## Validation
- There is no dedicated automated test suite in this repo.
- After meaningful code changes, run `npm run build` as the default verification step.
- For networking changes, also run `npm run server:dev` and verify the relay boots without runtime errors.

## Architecture
- Entry flow: `index.html` -> `src/main.js` initializes shared renderer/camera/input and swaps scenes.
- Primary scenes: `src/scenes/GameScene.js` (overworld) and `src/scenes/DungeonScene3D.js` (procedural dungeon).
- Engine singletons live in `src/engine/` (`Renderer`, `Camera`, `InputManager`, `EventBus`).
- Gameplay is system-driven from `src/systems/` and orchestrated by `GameScene`.

## Project Conventions
- Treat `src/config.js` as the single source of truth for game balance/data (biomes, enemies, items, factions, progression constants).
- Preserve plain ES module style; this project does not use a frontend framework.
- Keep NPC behavior scripted in code; do not add live Anthropic API dependencies for gameplay logic.
- Co-op server (`server/index.js`) is a dumb relay, not authoritative simulation.

## Agent Gotchas
- Use `http://localhost:8001`; do not assume `8080`.
- Do not open entry files via `file://`; ES modules/service worker require HTTP(S).
- Vite polling is intentionally enabled (low inotify environments). Avoid removing this without a clear reason.
- World generation is large and synchronous; avoid introducing startup work that further blocks first load.
- `README.md` contains some historical sections from earlier versions; prefer `CLAUDE.md` and current source files when docs conflict.

## Key References
- Technical architecture and commands: `CLAUDE.md`
- Project overview and controls: `README.md`
- Narrative and world design: `GDD.md`
- Lore content: `lore/factions.md`, `lore/npcs.md`, `lore/regions.md`, `lore/the-crystal-crown.md`
- Main story script: `quests/main_story.md`
