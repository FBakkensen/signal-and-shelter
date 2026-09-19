# Architecture

Last updated: 2026-09-19. Experiment 003 seeded arrival is implemented; captured-look and full browser traversal validation remain incomplete.

## Runtime and tooling

TypeScript, Three.js, and Vite power a local browser application. Dependency versions are pinned in package.json and package-lock.json. The compiler uses strict mode, unchecked-index protection, exact optional properties, unused-code checks, and no implicit returns. ESLint applies its recommended rules plus TypeScript's strict and stylistic type-aware presets, consistent type imports, mandatory braces, and zero-warning validation.

| File | Responsibility |
| --- | --- |
| `src/world.ts` | Seed normalization, versioned island generation, terrain, biomes, trees, resource deposits, and exposed terrain quads |
| `src/game.ts` | Seed-specific initial/recovery state, movement, resource discovery, terminal proximity/data-link state, and view transitions |
| `src/collision.ts` | Player footprint, terrain support, ledge protection and finite solid obstacle boxes |
| `src/session.ts` | Capture request lifecycle, held inputs, quick-jump buffering and keyboard play |
| `src/controls.ts` | Keyboard-to-intent mapping and relative mouse sensitivity/inversion |
| `src/ship.ts` | Shared ship block dimensions, colors, and positions for collision and Blender authoring |
| `src/scene.ts` | Three.js rendering, geometry, lighting, authored asset loading, avatar and camera |
| `src/main.ts` | Seed form/URL, world replacement, DOM/input adapters, terminal panel, journal, and animation loop |
| `tests/` | Production-logic tests and a real GLTFLoader asset integration test |

## World and movement

`createIsland(seed)` returns the world definition used by rendering, collisions, discovery and player initialization. Seeds are case-sensitive text, trimmed and limited to 80 UTF-16 code units with lone surrogates replaced so URL round trips remain stable. Blank UI input generates a seed with `crypto.randomUUID`; world generation itself has no runtime randomness. Generator version 1 combines a text hash with coordinate hashing. The default menu preview uses `stillwild` unless the URL supplies a seed.

The bounded height field spans 96 by 96 one-metre cells. Seeded coast size, shape and outer hills surround a connected level starter meadow. Ship and resource placements vary within safe areas; trees stay clear of the ship and deposits. This deliberately trades interior terrain variety for a forgiving, reachable opening. Terrain is voxel-style height-field geometry, not editable block storage. Thirty-six 16-by-16 chunks contain top and exposed side quads sampled across chunk boundaries. Foliage and water glints also use the seed.

The stranded ship includes an external terminal. Within 3.2 metres horizontally and less than one metre vertically, E or the interaction button opens a paused terminal panel. A connection check records `linkChecked`; it is fictional local game state, not a network request or actual software download. Three resource deposits are discovered within four metres. Gathering is not implemented.

Changing seeds disposes the old renderer, scene-owned geometry/materials, shadow map and resize listener, then creates a new world while reusing the loaded ship template. Restart resets the current seed's player/journal/link state. Invalid-position recovery uses that same island's spawn and retains discoveries and the connection result. The URL records the seed, not progress; saves and old-generator compatibility are not implemented.

The player walks at 4.3 m/s, sprints forward at 5.6 m/s, and sneaks at 1.3 m/s. Sneak overrides sprint. Horizontal diagonals normalize, and movement uses yaw independently of camera pitch. Physics runs at 120 Hz with bounded accumulated time and separate-axis collision resolution. Gravity is 24 m/s², terminal fall speed is 35 m/s, and jump takeoff targets a 1.25-metre apex. Space can repeat after landing, but cannot add an airborne jump. A 120 ms jump buffer preserves quick taps between frames and presses just before landing.

The square player footprint is 0.6 metres wide; body height is 1.8 metres standing and 1.5 metres crouched. Collision samples every overlapped terrain cell. Terrain rises require jumping, drops permit falling, and grounded sneak requires support beneath each footprint corner. Trees, resource rocks/crystals and ship parts have finite box colliders. The asset integration test compares all seventeen ship mesh bounds to production colliders. Leaves and flowers are non-solid decoration. Water and the finite boundary block horizontal movement even in midair. Invalid/out-of-world positions recover to spawn while keeping discoveries; falls do not cause damage.

The first-person camera uses a 70-degree vertical FOV, immediate yaw/pitch, and interpolation between simulation positions. Standing eye height is 1.62 metres, crouched eye height is 1.27 metres. Pitch is clamped short of vertical. The local avatar is visible only in overview. No head bob, sprint FOV effect, or trailing camera lag is applied.

In mouse mode, capture is requested only by explicit user action and active play begins after success. Keyboard mode starts directly. Capture failure leaves the game paused and keeps the action labeled Keep wandering. Keyboard play is explicitly selectable and does not request capture. WASD moves and arrows look in both active modes, including while the mouse is locked. Pause/resume, overview return and reset retain the mode until reload. The pause panel can switch modes. Drag-to-look is not supported. Escape, blur, visibility loss, and leaving captured mode clear held keys and queued jumps. Pause/overview freeze physics and clear accumulated time; returning requires a click. Settings live in the pause panel and persist across resets, but not reloads. A proximity check adds unique resource IDs even without movement. Reset clears view, physics, journal and terminal progress.

Current browser evidence is in [experiment 003](testing/experiment-003.md); control history is in [experiment 002](testing/experiment-002.md). Pointer lock returned an internal Chromium error in the integrated browser, so actual locked relative input and lock-loss behavior remain unverified there; earlier traversal evidence used a now-removed drag mode and does not verify the current capture-only entry flow.

## Blender asset pipeline

The stranded ship was authored through Blender MCP in a new isolated scene. The original active `Scene` was restored, and existing objects were preserved.

- `assets/ship.blend`: editable source scene.
- `public/assets/ship.glb`: runtime GLB with seventeen meshes.
- `src/ship.ts`: block dimensions/positions/colors shared with production collision.
- `scripts/create-ship.py`: asset recipe; currently uses this workspace's absolute path.

To regenerate, first inspect the connected Blender scene. Export the TypeScript block definitions, then execute the Python recipe through Blender MCP:

```sh
node --import tsx --input-type=module -e 'import { SHIP_PARTS } from "./src/ship.ts"; import { writeFileSync } from "node:fs"; writeFileSync("/tmp/stillwild-ship-parts.json", JSON.stringify(SHIP_PARTS))'
```

The recipe converts the Y-up definitions to Blender Z-up, exports to glTF Y-up, and saves the editable scene separately. Conventions: metre scale, base at zero, applied object scales, named parts, no exported camera/light, and no textures or compression extensions. The asset test uses the actual Three.js GLTFLoader and compares all mesh bounds to collision data. Runtime does not require Blender.

The earlier beacon `.blend`, `.glb`, and recipe are retained as experiment history; the current scene no longer loads the beacon or renders the old arch/grove landmarks.

## Current boundaries

Keyboard/mouse input, finite terrain, and session-only progress are deliberate experiment choices. Audio, touch movement, terrain editing, streaming, multiplayer, and persistence remain unimplemented. Non-solid foliage can intersect the first-person view when approached closely; foliage fading is not implemented. No device performance target or frame-rate benchmark has been established. The production build currently warns about the approximately 631 kB uncompressed JavaScript bundle, which includes Three.js.
