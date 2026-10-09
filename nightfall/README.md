# PROJECT: NIGHTFALL

Browser 3D survival horror (Three.js + Vite) with a small Node backend for cloud saves and a leaderboard.

## Run it
Requires Node 18+.

```bash
npm install
npm run dev          # API on :3001 + Vite on :5173  → open http://localhost:5173
```

Production (single process serves the game and the API):

```bash
npm run build
npm start            # http://localhost:3001
```

Backend tests (no install needed): `npm run test:server`

## Controls
WASD move · Shift sprint · Ctrl/C crouch · F flashlight · E interact · Tab/I inventory · Esc pause

## Mission 01 — The Breach
Flashlight → Security Card (storage) → unlock Laboratory → Emergency Key → exit door.
The creature hunts by sight (cone + line of sight) and sound. Running is loud, crouching is quiet,
doors/pickups make noise, and the storage-room locker hides you (stay hidden — it searches nearby).

## Structure
```
index.html              page + HUD/menu markup
src/main.js             boot, game loop, game flow (new/continue/win/over)
src/style.css
src/core/state.js       shared state + late-bound hooks
src/core/physics.js     AABB collision, line-of-sight
src/core/scene.js       renderer, camera, flashlight
src/core/audio.js       synthesized Web Audio (no asset files)
src/core/ui.js          HUD, menus, settings, leaderboard rendering
src/game/world.js       level geometry, props, flickering lights
src/game/interactions.js pickups, doors, notes, locker, focus detection
src/game/enemy.js       creature model + state machine + waypoint graph
src/game/player.js      movement, stamina, flashlight battery
src/game/input.js       keyboard / mouse / pointer lock
src/game/save.js        snapshot / sanitize / apply / persist
src/net/api.js          backend client (fails soft → localStorage)
server/index.js         HTTP API + static hosting (zero dependencies)
server/store.js         JSON datastore, atomic writes, corruption recovery
server/test.js          API tests
```

## Backend API
| Method | Path | Purpose |
|---|---|---|
| GET | /api/health | liveness |
| GET/PUT/DELETE | /api/save/:id | per-player save (id = random UUID kept in localStorage) |
| GET | /api/scores | top 10 fastest escapes |
| POST | /api/scores | `{id,name,time,ending}`; validated, best time per player kept |

Saves are validated server-side (shape + ranges), bodies capped at 100 KB, 120 req/min/IP.
Data lives in `server/data/db.json` (override with `DATA_DIR`, port with `PORT`).
Note: there are no accounts — the player id is a bearer secret; this is fine for a hobby game, not for anything sensitive.

## Known limitations
- One mission. Fuse/power puzzle, circuit puzzle, code terminal, audio logs, and endings B and C are not implemented yet (Stage 2).
- Enemy navigation is a waypoint graph, not a navmesh.
- Three.js is pinned to r128 because light intensities were tuned for its legacy lighting model.
- JSON-file storage is meant for small/local use; swap `Store` for SQLite/Postgres for real traffic.
