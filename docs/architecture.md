# Architecture

Last updated: 2026-09-19. Experiment 001 is implemented.

## Runtime and tooling

TypeScript, Three.js, and Vite power a local browser application. Dependency versions are pinned in package.json and package-lock.json. The compiler uses strict mode, unchecked-index protection, exact optional properties, unused-code checks, and no implicit returns. ESLint applies its recommended rules plus TypeScript's strict and stylistic type-aware presets, consistent type imports, mandatory braces, and zero-warning validation.

| File | Responsibility |
| --- | --- |
| `src/world.ts` | Deterministic height field, biomes, tree placements, landmark data, and exposed terrain quads |
| `src/game.ts` | Player state, movement, collision, discovery, pause and overview transitions |
| `src/controls.ts` | Keyboard-to-intent mapping and camera turn amounts |
| `src/scene.ts` | Three.js rendering, geometry, lighting, authored asset loading, avatar and camera |
| `src/main.ts` | DOM/input adapters, focus lifecycle, journal, and animation loop |
| `tests/` | Production-logic tests and a real GLTFLoader asset integration test |

## World and movement

The bounded height field spans 96 by 96 cells with a one-metre grid and a deterministic island outline. This is voxel-style geometry, not an editable block-volume world. Thirty-six 16-by-16 terrain chunks contain top and exposed side quads; their meshing samples neighbors across chunk boundaries. Trees, flowers, and water glints are deterministic visual placements.

The player walks at 5 m/s and runs at 9 m/s. Diagonal input is normalized. Movement uses substeps and separate-axis collision resolution to allow sliding without tunnelling. The footprint blocks water, steps greater than one metre in either direction, and circular trunk/landmark obstacles. There is no gravity or jumping in this experiment.

The third-person camera follows the player and rotates with Q/E or pointer dragging. Overview and pause stop movement. Blur and page visibility changes pause play and clear held keys. A proximity check adds unique landmark IDs to an in-memory journal. Reset creates fresh state; reload also clears progress.

## Blender asset pipeline

The amber beacon was created through Blender MCP in a separate scene, preserving the user's original scene and restoring it afterward.

- `assets/beacon.blend`: editable source scene.
- `public/assets/beacon.glb`: runtime GLB containing eleven meshes and three materials.
- `scripts/create-beacon.py`: creation/export recipe, currently using this workspace's absolute path. Adjust its root for another checkout.

Asset conventions: metre scale, base at the origin, Blender Z-up converted to glTF Y-up by the exporter, applied object scales, named parts, no camera/light export, and no required textures or compression extensions. The asset integration test loads the actual GLB through Three.js and verifies mesh count, origin, and 4.075-metre height.

The script creates a fresh asset scene on each run; inspect the Blender session and existing outputs before regenerating. Runtime does not require Blender to stay open.

## Current boundaries

Keyboard/mouse input, finite terrain, and session-only progress are deliberate experiment choices. Audio, touch movement, terrain editing, streaming, multiplayer, and persistence remain unimplemented. Foliage can obscure the avatar; camera occlusion handling is a future refinement. No device performance target or frame-rate benchmark has been established. The production build currently warns about the approximately 620 kB uncompressed JavaScript bundle, which includes Three.js.
