# Architecture

Last updated: 2026-09-19. Experiment 002 controls are implemented; captured-look browser validation remains incomplete.

## Runtime and tooling

TypeScript, Three.js, and Vite power a local browser application. Dependency versions are pinned in package.json and package-lock.json. The compiler uses strict mode, unchecked-index protection, exact optional properties, unused-code checks, and no implicit returns. ESLint applies its recommended rules plus TypeScript's strict and stylistic type-aware presets, consistent type imports, mandatory braces, and zero-warning validation.

| File | Responsibility |
| --- | --- |
| `src/world.ts` | Deterministic height field, biomes, tree placements, landmark data, and exposed terrain quads |
| `src/game.ts` | Fixed-step movement, gravity, jumping, discovery, view interpolation, pause and overview transitions |
| `src/collision.ts` | Player footprint, terrain support, ledge protection and finite solid obstacle boxes |
| `src/session.ts` | Capture request lifecycle, held inputs, quick-jump buffering and keyboard play |
| `src/controls.ts` | Keyboard-to-intent mapping and relative mouse sensitivity/inversion |
| `src/scene.ts` | Three.js rendering, geometry, lighting, authored asset loading, avatar and camera |
| `src/main.ts` | DOM/input adapters, focus lifecycle, journal, and animation loop |
| `tests/` | Production-logic tests and a real GLTFLoader asset integration test |

## World and movement

The bounded height field spans 96 by 96 cells with a one-metre grid and a deterministic island outline. This is voxel-style geometry, not an editable block-volume world. Thirty-six 16-by-16 terrain chunks contain top and exposed side quads; their meshing samples neighbors across chunk boundaries. Trees, flowers, and water glints are deterministic visual placements.

The player walks at 4.3 m/s, sprints forward at 5.6 m/s, and sneaks at 1.3 m/s. Sneak overrides sprint. Horizontal diagonals normalize, and movement uses yaw independently of camera pitch. Physics runs at 120 Hz with bounded accumulated time and separate-axis collision resolution. Gravity is 24 m/s², terminal fall speed is 35 m/s, and jump takeoff targets a 1.25-metre apex. Space can repeat after landing, but cannot add an airborne jump. A 120 ms jump buffer preserves quick taps between frames and presses just before landing.

The square player footprint is 0.6 metres wide; body height is 1.8 metres standing and 1.5 metres crouched. Collision samples every overlapped terrain cell. Terrain rises require jumping, drops permit falling, and grounded sneak requires support beneath each footprint corner. Trees and landmark solids have finite box colliders, including the arch lintel and individual beacon meshes. The asset integration test compares all eleven beacon mesh bounds to production colliders. Leaves and flowers are non-solid decoration. Water and the finite boundary block horizontal movement even in midair. Invalid/out-of-world positions recover to spawn while keeping discoveries; falls do not cause damage.

The first-person camera uses a 70-degree vertical FOV, immediate yaw/pitch, and interpolation between simulation positions. Standing eye height is 1.62 metres, crouched eye height is 1.27 metres. Pitch is clamped short of vertical. The local avatar is visible only in overview. No head bob, sprint FOV effect, or trailing camera lag is applied.

In mouse mode, capture is requested only by explicit user action and active play begins after success. Keyboard mode starts directly. Capture failure leaves the game paused and keeps the action labeled Keep wandering. Keyboard play is explicitly selectable and does not request capture. WASD moves and arrows look in both active modes, including while the mouse is locked. Pause/resume, overview return and reset retain the mode until reload. The pause panel can switch modes. Drag-to-look is not supported. Escape, blur, visibility loss, and leaving captured mode clear held keys and queued jumps. Pause/overview freeze physics and clear accumulated time; returning requires a click. Settings live in the pause panel and persist across resets, but not reloads. A proximity check adds unique landmark IDs even without movement. Reset clears view, physics and journal state.

Browser evidence and limitations are in [experiment 002](testing/experiment-002.md). Pointer lock returned an internal Chromium error in the integrated browser, so actual locked relative input and lock-loss behavior remain unverified there; earlier traversal evidence used a now-removed drag mode and does not verify the current capture-only entry flow.

## Blender asset pipeline

The amber beacon was created through Blender MCP in a separate scene, preserving the user's original scene and restoring it afterward.

- `assets/beacon.blend`: editable source scene.
- `public/assets/beacon.glb`: runtime GLB containing eleven meshes and three materials.
- `scripts/create-beacon.py`: creation/export recipe, currently using this workspace's absolute path. Adjust its root for another checkout.

Asset conventions: metre scale, base at the origin, Blender Z-up converted to glTF Y-up by the exporter, applied object scales, named parts, no camera/light export, and no required textures or compression extensions. The asset integration test loads the actual GLB through Three.js and verifies mesh count, origin, and 4.075-metre height.

The script creates a fresh asset scene on each run; inspect the Blender session and existing outputs before regenerating. Runtime does not require Blender to stay open.

## Current boundaries

Keyboard/mouse input, finite terrain, and session-only progress are deliberate experiment choices. Audio, touch movement, terrain editing, streaming, multiplayer, and persistence remain unimplemented. Non-solid foliage can intersect the first-person view when approached closely; foliage fading is not implemented. No device performance target or frame-rate benchmark has been established. The production build currently warns about the approximately 626 kB uncompressed JavaScript bundle, which includes Three.js.
