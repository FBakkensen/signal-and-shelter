# Architecture

Last updated: 2026-09-19. Experiment 004's seeded island arrival is implemented; captured-look and full browser traversal validation remain incomplete.

## Runtime and tooling

TypeScript, Three.js, and Vite power a local browser application. Dependency versions are pinned in package.json and package-lock.json. The compiler uses strict mode, unchecked-index protection, exact optional properties, unused-code checks, and no implicit returns. ESLint applies its recommended rules plus TypeScript's strict and stylistic type-aware presets, consistent type imports, mandatory braces, and zero-warning validation.

| Entry point | Responsibility |
| --- | --- |
| `src/packages/island/index.ts` | Seed selection and complete island generation, including solid geometry |
| `src/packages/island/geometry.ts` | Pure block descriptions, ship authoring dimensions, terrain quads and palette consumed by rendering |
| `src/packages/play/index.ts` | `GameApplication`: input, capture, terminal, pause/overview, restart and island replacement; read-only play observations |
| `src/packages/play/simulation.ts` | Headless simulation bound to one island: initial state, movement, standability, look/transitions and camera interpolation |
| `src/resources.ts` | Three.js resource mesh adapter using island geometry |
| `src/scene.ts` | Three.js scene, lighting, asset loading, avatar, camera and render resource lifetime |
| `src/main.ts` | Browser event, DOM, seed URL and rendering adapters |
| `src/packages/*/tests/`, `tests/` | Public-interface behavior tests and real mesh/GLTFLoader integration tests |

## TypeScript package modules

The island and play packages are implemented deep modules. Root files are entry points; `lib/` holds private implementation. The browser consumes play actions and observations without accessing `ControlSession`, input mapping or simulation internals. The rendering adapter receives read-only play state and an interpolated view position; it neither builds nor exports gameplay obstacles.

`createIsland` generates terrain/placements and builds `solids` together. One placement function converts the vent, ship and resource block descriptions into world-space obstacles. Pure resource descriptions no longer import Three.js. `GameApplication` binds a simulation to that complete island on construction and replacement; `tick(seconds)` needs no caller-supplied geometry. Restart reuses the current island. The headless simulation entry point also supports explicit terrain/solid scenarios for traversal and physics verification, without browser input or rendering.

Dependency-cruiser scans `src/` and `tests/`, enforcing root-entry imports, private tests and acyclic dependencies. Island/play imports of Three.js or rendering adapters are forbidden. `npm run lint:boundaries` is included in `npm run check`. See [the package guide](../src/packages/README.md); `example/` remains a starter template.

## World and movement

`createIsland(seed)` returns the world definition used by rendering, collisions, discovery and player initialization. Seeds are case-sensitive text, trimmed and limited to 80 UTF-16 code units with lone surrogates replaced so URL round trips remain stable. Blank UI input generates a seed with `crypto.randomUUID`; world generation itself has no runtime randomness. Generator version 2 combines a text hash with coordinate hashing. The default menu preview uses `signal-and-shelter` unless the URL supplies a seed.

The bounded height field spans 96 by 96 metres, sampled on a half-metre grid (192 by 192 cells). Seeded coast size, shape and outer hills surround a connected level starter shelf. Ship and resource placements vary within safe areas; vents stay clear of the ship and deposits. This deliberately trades interior terrain variety for a forgiving, reachable opening. Terrain is voxel-style height-field geometry, not editable block storage. Thirty-six 16-by-16 chunks contain top and exposed side quads sampled across chunk boundaries. Vent placements and suspended haze grains also use the seed. Terrain top and side quads have axis-aligned normals; the geometry preserves voxels.

The stranded ship includes an external terminal. Within 3.2 metres horizontally and less than one metre vertically, E or the interaction button opens a paused terminal panel. A connection check records `linkChecked`; it is fictional local game state, not a network request or actual software download. Three resource deposits are discovered within four metres. Gathering is not implemented.

Changing seeds disposes the old renderer, scene-owned geometry/materials, shadow map and resize listener, then creates a new world while reusing the loaded ship template. Restart resets the current seed's player/journal/link state. Invalid-position recovery uses that same island's spawn and retains discoveries and the connection result. The URL records the seed, not progress; saves and old-generator compatibility are not implemented.

The player walks at 4.3 m/s, sprints forward at 5.6 m/s, and sneaks at 1.3 m/s. Sneak overrides sprint. Horizontal diagonals normalize, and movement uses yaw independently of camera pitch. Physics runs at 120 Hz with bounded accumulated time and separate-axis collision resolution. Gravity is 24 m/s², terminal fall speed is 35 m/s, and jump takeoff targets a 1.25-metre apex. Space can repeat after landing, but cannot add an airborne jump. A 120 ms jump buffer preserves quick taps between frames and presses just before landing.

The square player footprint is 0.6 metres wide; body height is 1.8 metres standing and 1.5 metres crouched. Collision samples every overlapped terrain cell. Terrain rises require jumping, drops permit falling, and grounded sneak requires support beneath each footprint corner. Vents, resource deposits and ship parts have finite box colliders. `ventParts` defines every tier, rim segment and core for both scene rendering and collision; the wider formations replace the old narrow trunks. `resourceParts` likewise supplies resource meshes and colliders; automated tests compare actual rendered bounds and colors for all three deposits. The asset integration test compares all seventeen ship mesh bounds to production colliders. The haze edge and the finite boundary block horizontal movement even in midair. Invalid/out-of-world positions recover to spawn while keeping discoveries; falls do not cause damage.

The first-person camera uses a 70-degree vertical FOV, immediate yaw/pitch, and interpolation between simulation positions. Standing eye height is 1.62 metres, crouched eye height is 1.27 metres. Pitch is clamped short of vertical. The local avatar is visible only in overview. No head bob, sprint FOV effect, or trailing camera lag is applied.

In mouse mode, capture is requested only by explicit user action and active play begins after success. Keyboard mode starts directly. Capture failure leaves the game paused and keeps the action labeled Keep wandering. Keyboard play is explicitly selectable and does not request capture. WASD moves and arrows look in both active modes, including while the mouse is locked. Pause/resume, overview return and reset retain the mode until reload. The pause panel can switch modes. Drag-to-look is not supported. Escape, blur, visibility loss, and leaving captured mode clear held keys and queued jumps. Pause/overview freeze physics and clear accumulated time; returning requires a click. Settings live in the pause panel and persist across resets, but not reloads. A proximity check adds unique resource IDs even without movement. Reset clears view, physics, journal and terminal progress.

`GameApplication` owns lifecycle transitions and its private control session, with automated coverage for terminal resume guards, capture cancellation, stale failures, seed replacement and input clearing. The DOM adapter applies its results to browser capture and panels. An open terminal rejects canvas and ordinary resume requests; its explicit return closes it before resuming. See [review fixes](testing/review-fixes.md).

Current browser evidence is in [experiment 004](testing/experiment-004.md); control history is in [experiment 002](testing/experiment-002.md). Pointer lock returned an internal Chromium error in the integrated browser, so actual locked relative input and lock-loss behavior remain unverified there; earlier traversal evidence used a now-removed drag mode and does not verify the current capture-only entry flow.

## Blender asset pipeline

The stranded ship was authored through Blender MCP in a new isolated scene. The original active `Scene` was restored, and existing objects were preserved.

- `assets/ship.blend`: editable source scene.
- `public/assets/ship.glb`: runtime GLB with seventeen meshes.
- `src/packages/island/geometry.ts`: block dimensions/positions/colors shared with production collision.
- `scripts/create-ship.py`: asset recipe; currently uses this workspace's absolute path.

To regenerate, first inspect the connected Blender scene. Export the TypeScript block definitions, then execute the Python recipe through Blender MCP:

```sh
node --import tsx --input-type=module -e 'import { SHIP_PARTS } from "./src/packages/island/geometry.ts"; import { writeFileSync } from "node:fs"; writeFileSync("/tmp/signal-and-shelter-ship-parts.json", JSON.stringify(SHIP_PARTS))'
```

The recipe converts the Y-up definitions to Blender Z-up, exports to glTF Y-up, and saves the editable scene separately. Conventions: metre scale, base at zero, applied object scales, named parts, no exported camera/light, and no textures or compression extensions. The asset test uses the actual Three.js GLTFLoader and compares all mesh bounds to collision data. Runtime does not require Blender.

The earlier beacon `.blend`, `.glb`, and recipe are retained as experiment history; the current scene no longer loads the beacon or renders the old arch/grove landmarks.

## Current boundaries

Keyboard/mouse input, finite terrain, and session-only progress are deliberate experiment choices. Audio, touch movement, terrain editing, streaming, multiplayer, and persistence remain unimplemented. No device performance target or frame-rate benchmark has been established. The production build currently warns about the approximately 634 kB uncompressed JavaScript bundle, which includes Three.js.

## Current presentation — 2026-09-19

The user selected the warm console interface from study B. `scene.ts` applies the world palette to ceramic terrain, stepped vents, suspended grains, distant voxel shelves and a voxel satellite. The opaque haze plane marks the unwalkable boundary; it has no liquid behavior. Seeded copper/iron/silica discoveries retain their mechanics with new display names. The existing authored ship is retained, including its working communications light and terminal geometry.

`style.css` implements the warm console layout for arrival, pause and the terminal; the resource journal is compact during play and hidden in menus. All existing IDs and session controls remain connected to real game state. There are no prototype statistics or simulation claims in the playable UI.

The comparison and its tests were captured at `8df36f9` on `codex/alien-visual-prototypes`, then removed from the playable implementation. `index.html` again loads `main.ts` directly. The prototype URL parameter no longer changes the game. See [experiment 004](testing/experiment-004.md) for validation and remaining limitations.
