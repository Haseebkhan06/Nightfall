# 🔦 PROJECT: NIGHTFALL

**A first-person survival horror game that runs entirely in your browser.**

You wake up in a damaged maintenance room inside an abandoned underground research facility. An experiment went wrong, and whatever came out of it is still in the corridors. Find a light, find a way through, and don't make a sound you can't afford.

## Features

- **Atmospheric 3D facility:** flickering fluorescents, pulsing emergency lights, fog, wet reflective floors, and a flashlight with a limited battery.
- **A creature that hunts you:** a six-state AI (patrol, investigate, search, chase, attack, return). It detects you through a vision cone and line-of-sight checks, and it reacts to sound.
- **Stealth mechanics:** running is loud, crouching is quiet, and doors and pickups make noise. Break line of sight behind cover, or hide in a locker and stay still, because it searches nearby.
- **Fully synthesized audio:** ambient drone, electrical buzz, distant clangs, directional footsteps, creature growls, and a tension layer that builds as you're noticed. There are no audio files to download.
- **Objective-driven mission:** flashlight → security card → laboratory → emergency key → exit, with inventory, locked doors, and readable notes.
- **Saves and leaderboard:** a small zero-dependency Node backend syncs your progress and tracks the fastest escapes. If the server is unreachable, the game saves to `localStorage` instead.
- **Pause menu and settings:** volume, mute, and manual save, with settings remembered between sessions.

## Controls

| Key | Action |
|---|---|
| `W` `A` `S` `D` | Move |
| Mouse | Look |
| `Shift` | Sprint (uses stamina) |
| `Ctrl` / `C` | Crouch |
| `F` | Toggle flashlight |
| `E` | Interact / pick up / hide |
| `Tab` / `I` | Inventory |
| `Esc` | Pause |

## Quick start

Requires **Node.js 18 or newer**.

```bash
npm install
npm run dev
```

This starts the API on port 3001 and the Vite dev server on port 5173. Open **http://localhost:5173** and click **Start New Game**.

### Production

```bash
npm run build
npm start
```

A single Node process serves both the built game and the API at **http://localhost:3001**.

### Configuration

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | Server port |
| `DATA_DIR` | `server/data` | Where `db.json` (saves and scores) is stored |

### Tests

```bash
npm run test:server
```

The backend tests need no install. They cover save round-trips, input validation, oversized bodies, score sanitizing and ordering, persistence across restarts, and recovery from a corrupt database file.

## Walkthrough: Mission 01, The Breach

1. Read the maintenance log in the start room, then find the **flashlight** on the table.
2. Head down the main corridor to the **storage room** and take the **security card**. The card sits near a crate, close to a locker you can hide in.
3. Use the card on the **laboratory door** in the corridor.
4. Grab the **emergency key** from the console in the lab.
5. Run, or better, sneak, to the **exit blast door** at the end of the corridor.

Batteries are scattered through the level and recharge your flashlight. The creature starts out patrolling the corridor, so listen for its footsteps.

## Project structure

```
index.html                  Page, HUD and menu markup
vite.config.js              Dev server + /api proxy
src/
  main.js                   Boot, game loop, new/continue/win/game-over flow
  style.css                 HUD and menu styling
  core/
    state.js                Shared state and late-bound hooks
    physics.js              AABB collision and line-of-sight
    scene.js                Renderer, camera, flashlight
    audio.js                Synthesized Web Audio
    ui.js                   HUD, menus, settings, leaderboard rendering
  game/
    world.js                Level geometry, props, flickering lights
    interactions.js         Pickups, doors, notes, locker, focus detection
    enemy.js                Creature model, state machine, waypoint graph
    player.js               Movement, stamina, flashlight battery
    input.js                Keyboard, mouse, pointer lock
    save.js                 Snapshot, sanitize, apply, persist
  net/
    api.js                  Backend client (fails soft to localStorage)
server/
  index.js                  HTTP API + static hosting (no dependencies)
  store.js                  JSON datastore, atomic writes, corruption recovery
  test.js                   API tests
```

## How the enemy works

| State | Behavior |
|---|---|
| **PATROL** | Walks a route of waypoints through the facility. |
| **INVESTIGATE** | Heads toward a heard noise (footsteps, doors, pickups). Walls muffle sound. |
| **SEARCH** | Stops and scans the area for several seconds. Finds you if you hide too close. |
| **CHASE** | Pursues at high speed. It follows your last known position if it loses sight of you. |
| **ATTACK** | Lunges when close, then triggers game over. |
| **RETURN** | Goes back to its patrol route after losing you. |

Awareness builds while you're in view. A growl, a tension drone, and a red vignette warn you before it commits to a chase. Crouching shortens its vision range, and the flashlight lengthens it.

## Backend API

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Liveness check |
| `GET` | `/api/save/:id` | Load a save (`404` if none) |
| `PUT` | `/api/save/:id` | Store a save |
| `DELETE` | `/api/save/:id` | Delete a save |
| `GET` | `/api/scores` | Top 10 fastest escapes |
| `POST` | `/api/scores` | Submit `{ id, name, time, ending }` |

- Saves are validated for shape and value ranges before being stored.
- Request bodies are capped at 100 KB, and each IP is limited to 120 requests per minute.
- Score names are sanitized, impossible times are rejected, and only each player's best time is kept.
- The player `id` is a random UUID stored in the browser. There are no accounts, so treat it as a bearer secret.

## Tech stack

Three.js (pinned to r128) · Vite · vanilla JavaScript modules · Web Audio API · Node.js

Three.js is pinned to r128 because the light intensities were tuned for its legacy lighting model. Newer versions use physically based units and will look much darker without retuning.

## Status and known limitations

Mission 01 is playable from start to finish, but the project is an early vertical slice.

- **Not yet implemented:** the fuse and power-restoration puzzle, the circuit-routing puzzle, the code terminal, audio logs, and Endings B and C. These are planned for the next milestone.
- Enemy navigation uses a waypoint graph, not a navmesh.
- The level is a single connected area built from simple geometry, with no imported models or textures.
- JSON-file storage suits local and small-scale use. For real traffic, replace `server/store.js` with SQLite or Postgres.
- The 3D client has not been through a full browser test pass. If you hit a runtime error, please open an issue with the browser console output.

## Roadmap

- [ ] Fuse and power restoration
- [ ] Circuit-routing puzzle
- [ ] Security terminal with a code found in the environment
- [ ] Audio logs and more story documents
- [ ] Endings B (Discovery) and C (Containment)
- [ ] Additional hiding spots and progression shortcuts
- [ ] Graphics quality settings
- [ ] Navmesh-based enemy pathfinding

