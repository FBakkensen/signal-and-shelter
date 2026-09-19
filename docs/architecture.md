# Architecture

Last updated: 2026-09-19. Experiment 004's seeded island arrival is implemented; captured-look and full browser traversal validation remain incomplete.

## Runtime and tooling

TypeScript, Three.js, and Vite power a local browser application. Dependency versions are pinned in package.json and package-lock.json. The compiler uses strict mode, unchecked-index protection, exact optional properties, unused-code checks, and no implicit returns. ESLint applies its recommended rules plus TypeScript's strict and stylistic type-aware presets, consistent type imports, mandatory braces, and zero-warning validation.

| File                   | Responsibility                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `src/world.ts`         | Seed normalization, versioned island generation, terrain, regions, vents, resource deposits, and exposed terrain quads       |
| `src/game.ts`          | Seed-specific initial/recovery state, movement, resource discovery, terminal proximity/data-link state, and view transitions |
| `src/collision.ts`     | Player footprint, terrain support, ledge protection and finite solid obstacle boxes                                          |
| `src/application.ts`   | Game/session lifecycle: entry, capture outcomes, terminal, pause/overview, reset and seed replacement                        |
| `src/session.ts`       | Capture request lifecycle, held inputs, quick-jump buffering and keyboard play                                               |
| `src/controls.ts`      | Keyboard-to-intent mapping and relative mouse sensitivity/inversion                                                          |
| `src/blocks.ts`        | Common typed block-part definition                                                                                           |
| `src/resources.ts`     | Shared resource parts and their production mesh factory                                                                      |
| `src/ship.ts`          | Shared ship block dimensions, colors, and positions for collision and Blender authoring                                      |
| `src/world-visuals.ts` | World palette and block dimensions shared by vent rendering and collision                                                    |
| `src/scene.ts`         | Three.js rendering, geometry, lighting, authored asset loading, avatar and camera                                            |
| `src/main.ts`          | Seed form/URL, world replacement, DOM/input adapters, terminal panel, journal, and animation loop                            |
| `tests/`               | Production-logic tests and a real GLTFLoader asset integration test                                                          |

## TypeScript package modules

Reusable packages live under `src/packages/<name>/` as deep modules: root files are the package's entry points, while every subfolder is private implementation or test material. `src/packages/example/` is a copy-me starter, not an extracted game system. Dependency-cruiser scans all of `src/`, so it checks app imports into packages as well as package imports, and rejects dependency cycles; `npm run lint:boundaries` is part of `npm run check`. See [the package guide](../src/packages/README.md) for the interface and test conventions.

## World and movement

`createIsland(seed)` returns the world definition used by rendering, collisions, discovery and player initialization. Seeds are case-sensitive text, trimmed and limited to 80 UTF-16 code units with lone surrogates replaced so URL round trips remain stable. Blank UI input generates a seed with `crypto.randomUUID`; world generation itself has no runtime randomness. Generator version 2 combines a text hash with coordinate hashing. The default menu preview uses `signal-and-shelter` unless the URL supplies a seed.

The bounded height field spans 96 by 96 metres, sampled on a half-metre grid (192 by 192 cells). Seeded coast size, shape and outer hills surround a connected level starter shelf. Ship and resource placements vary within safe areas; vents stay clear of the ship and deposits. This deliberately trades interior terrain variety for a forgiving, reachable opening. Terrain is voxel-style height-field geometry, not editable block storage. Thirty-six 16-by-16 chunks contain top and exposed side quads sampled across chunk boundaries. Vent placements and suspended haze grains also use the seed. Terrain top and side quads have axis-aligned normals; the geometry preserves voxels.

The stranded ship includes an external terminal. Within 3.2 metres horizontally and less than one metre vertically, E or the interaction button opens a paused terminal panel. A connection check records `linkChecked`; it is fictional local game state, not a network request or actual software download. Three resource deposits are discovered within four metres. Gathering is not implemented.

Changing seeds disposes the old renderer, scene-owned geometry/materials, shadow map and resize listener, then creates a new world while reusing the loaded ship template. Restart resets the current seed's player/journal/link state. Invalid-position recovery uses that same island's spawn and retains discoveries and the connection result. The URL records the seed, not progress; saves and old-generator compatibility are not implemented.

The player walks at 4.3 m/s, sprints forward at 5.6 m/s, and sneaks at 1.3 m/s. Sneak overrides sprint. Horizontal diagonals normalize, and movement uses yaw independently of camera pitch. Physics runs at 120 Hz with bounded accumulated time and separate-axis collision resolution. Gravity is 24 m/s², terminal fall speed is 35 m/s, and jump takeoff targets a 1.25-metre apex. Space can repeat after landing, but cannot add an airborne jump. A 120 ms jump buffer preserves quick taps between frames and presses just before landing.

The square player footprint is 0.6 metres wide; body height is 1.8 metres standing and 1.5 metres crouched. Collision samples every overlapped terrain cell. Terrain rises require jumping, drops permit falling, and grounded sneak requires support beneath each footprint corner. Vents, resource deposits and ship parts have finite box colliders. `ventParts` defines every tier, rim segment and core for both scene rendering and collision; the wider formations replace the old narrow trunks. `resourceParts` likewise supplies resource meshes and colliders; automated tests compare actual rendered bounds and colors for all three deposits. The asset integration test compares all seventeen ship mesh bounds to production colliders. The haze edge and the finite boundary block horizontal movement even in midair. Invalid/out-of-world positions recover to spawn while keeping discoveries; falls do not cause damage.

The first-person camera uses a 70-degree vertical FOV, immediate yaw/pitch, and interpolation between simulation positions. Standing eye height is 1.62 metres, crouched eye height is 1.27 metres. Pitch is clamped short of vertical. The local avatar is visible only in overview. No head bob, sprint FOV effect, or trailing camera lag is applied.

In mouse mode, capture is requested only by explicit user action and active play begins after success. Keyboard mode starts directly. Capture failure leaves the game paused and keeps the action labeled Keep wandering. Keyboard play is explicitly selectable and does not request capture. WASD moves and arrows look in both active modes, including while the mouse is locked. Pause/resume, overview return and reset retain the mode until reload. The pause panel can switch modes. Drag-to-look is not supported. Escape, blur, visibility loss, and leaving captured mode clear held keys and queued jumps. Pause/overview freeze physics and clear accumulated time; returning requires a click. Settings live in the pause panel and persist across resets, but not reloads. A proximity check adds unique resource IDs even without movement. Reset clears view, physics, journal and terminal progress.

`GameApplication` owns lifecycle transitions, with automated coverage for terminal resume guards, capture cancellation, stale failures, seed replacement and input clearing. The DOM adapter applies its results to browser capture and panels. An open terminal rejects canvas and ordinary resume requests; its explicit return closes it before resuming. See [review fixes](testing/review-fixes.md).

Current browser evidence is in [experiment 004](testing/experiment-004.md); control history is in [experiment 002](testing/experiment-002.md). Pointer lock returned an internal Chromium error in the integrated browser, so actual locked relative input and lock-loss behavior remain unverified there; earlier traversal evidence used a now-removed drag mode and does not verify the current capture-only entry flow.

## Blender asset pipeline

The stranded ship was authored through Blender MCP in a new isolated scene. The original active `Scene` was restored, and existing objects were preserved.

- `assets/ship.blend`: editable source scene.
- `public/assets/ship.glb`: runtime GLB with seventeen meshes.
- `src/ship.ts`: block dimensions/positions/colors shared with production collision.
- `scripts/create-ship.py`: asset recipe; currently uses this workspace's absolute path.

To regenerate, first inspect the connected Blender scene. Export the TypeScript block definitions, then execute the Python recipe through Blender MCP:

```sh
node --import tsx --input-type=module -e 'import { SHIP_PARTS } from "./src/ship.ts"; import { writeFileSync } from "node:fs"; writeFileSync("/tmp/signal-and-shelter-ship-parts.json", JSON.stringify(SHIP_PARTS))'
```

The recipe converts the Y-up definitions to Blender Z-up, exports to glTF Y-up, and saves the editable scene separately. Conventions: metre scale, base at zero, applied object scales, named parts, no exported camera/light, and no textures or compression extensions. The asset test uses the actual Three.js GLTFLoader and compares all mesh bounds to collision data. Runtime does not require Blender.

The earlier beacon `.blend`, `.glb`, and recipe are retained as experiment history; the current scene no longer loads the beacon or renders the old arch/grove landmarks.

## Current boundaries

Keyboard/mouse input, finite terrain, and session-only progress are deliberate experiment choices. Audio, touch movement, terrain editing, streaming, multiplayer, and persistence remain unimplemented. No device performance target or frame-rate benchmark has been established. The production build currently warns about the approximately 634 kB uncompressed JavaScript bundle, which includes Three.js.

## Current presentation — 2026-09-19

The user selected the warm console interface from study B. `scene.ts` applies the world palette to ceramic terrain, stepped vents, suspended grains, distant voxel shelves and a voxel satellite. The opaque haze plane marks the unwalkable boundary; it has no liquid behavior. Seeded copper/iron/silica discoveries retain their mechanics with new display names. The existing authored ship is retained, including its working communications light and terminal geometry.

`style.css` implements the warm console layout for arrival, pause and the terminal; the resource journal is compact during play and hidden in menus. All existing IDs and session controls remain connected to real game state. There are no prototype statistics or simulation claims in the playable UI.

The comparison and its tests were captured at `8df36f9` on `codex/alien-visual-prototypes`, then removed from the playable implementation. `index.html` again loads `main.ts` directly. The prototype URL parameter no longer changes the game. See [experiment 004](testing/experiment-004.md) for validation and remaining limitations.
