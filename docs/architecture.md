# Architecture

Last updated: 2026-09-19. Seeded arrival, third-person close-play controls and localized obstruction fading are implemented. The active strategic atlas and shared exploration are implemented; sustained browser traversal validation remains pending.

## Runtime and tooling

TypeScript, Three.js, and Vite power a local browser application. Dependency versions are pinned in package.json and package-lock.json. The compiler uses strict mode, unchecked-index protection, exact optional properties, unused-code checks, and no implicit returns. ESLint applies its recommended rules plus TypeScript's strict and stylistic type-aware presets, consistent type imports, mandatory braces, and zero-warning validation.

| Entry point                       | Responsibility                                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `src/packages/island/index.ts`    | Seed selection and complete island generation, including solid geometry                                                   |
| `src/packages/island/geometry.ts` | Pure block descriptions, ship authoring dimensions, terrain quads and palette consumed by rendering                       |
| `src/packages/play/index.ts`      | `GameApplication`: orbit, facing, selection/use, terminal, pause, exploration, restart and island replacement             |
| `src/packages/play/simulation.ts` | Headless simulation bound to one island: initial state, movement, standability, look/transitions and camera interpolation |
| `src/resources.ts`                | Three.js resource mesh adapter using island geometry                                                                      |
| `src/scene.ts`                    | Three.js scene, lighting, asset loading, avatar, camera and render resource lifetime                                      |
| `src/main.ts`                     | Browser event, DOM, seed URL and rendering adapters                                                                       |
| `src/packages/*/tests/`, `tests/` | Public-interface behavior tests and real mesh/GLTFLoader integration tests                                                |

## TypeScript package modules

The island and play packages are implemented deep modules. Root files are entry points; `lib/` holds private implementation. The browser consumes play actions and observations without accessing `ControlSession`, input mapping or simulation internals. The rendering adapter receives read-only play state and an interpolated view position; it neither builds nor exports gameplay obstacles.

`createIsland` generates terrain/placements and builds `solids` together. One placement function converts the vent, ship and resource block descriptions into world-space obstacles. Pure resource descriptions no longer import Three.js. `GameApplication` binds a simulation to that complete island on construction and replacement; `tick(seconds)` needs no caller-supplied geometry. Restart reuses the current island. The headless simulation entry point also supports explicit terrain/solid scenarios for traversal and physics verification, without browser input or rendering.

Dependency-cruiser scans `src/` and `tests/`, enforcing root-entry imports, private tests and acyclic dependencies. Island/play imports of Three.js or rendering adapters are forbidden. `npm run lint:boundaries` is included in `npm run check`. See [the package guide](../src/packages/README.md); `example/` remains a starter template.

## World and movement

`createIsland(seed)` returns the world definition used by rendering, collisions, discovery and player initialization. Seeds are case-sensitive text, trimmed and limited to 80 UTF-16 code units with lone surrogates replaced so URL round trips remain stable. Blank UI input generates a seed with `crypto.randomUUID`; world generation itself has no runtime randomness. Generator version 2 combines a text hash with coordinate hashing. The default menu preview uses `signal-and-shelter` unless the URL supplies a seed.

The bounded height field spans 96 by 96 metres, sampled on a half-metre grid (192 by 192 cells). Seeded coast size, shape and outer hills surround a connected level starter shelf. Ship and resource placements vary within safe areas; vents stay clear of the ship and deposits. This deliberately trades interior terrain variety for a forgiving, reachable opening. Terrain is voxel-style height-field geometry, not editable block storage. Thirty-six 16-by-16 chunks contain top and exposed side quads sampled across chunk boundaries. Vent placements and suspended haze grains also use the seed. Terrain top and side quads have axis-aligned normals; the geometry preserves voxels.

The stranded ship includes an external terminal. Within 3.2 metres horizontally and less than one metre vertically, F or the interaction button opens a live terminal panel when the ship is selected or nothing is selected. A selected deposit never redirects use to the ship. A connection check records `linkChecked`; it is fictional local game state, not a network request or actual software download. Resource deposits are identified when any portion of their footprint enters explored coverage, using the same 8 m rule as terrain reveal. Gathering is not implemented.

Changing seeds disposes the old renderer, scene-owned geometry/materials, shadow map and resize listener, then creates a new world while reusing the loaded ship template. Restart resets the current seed's player/journal/link state and selection while preserving heading and zoom; replacing the seed preserves the same camera settings. Invalid-position recovery uses that same island's spawn and retains discoveries and the connection result. The URL records the seed, not progress; saves and old-generator compatibility are not implemented.

Movement is owned by `navigation/index.ts`. The humanoid profile is a square 0.6 m footprint, 1.8 m body and 4.3 m/s walking speed. All actors use normalized directions and fixed 120 Hz steps. Individual immutable profiles specify dimensions, walking speed, jump availability, one symmetric elevation limit and setup/recovery durations. Robot type and upgrade rules remain outside navigation.

The movement module enumerates supported heights from terrain and solid tops, requiring body clearance and support under the entire footprint. Local traversal searches for a supported landing with at most 1 m elevation change. It checks a gravity-based arc (24 m/s², apex 0.25 m above the highest crossed surface), delays horizontal crossing until clear, and validates the full flight before starting. No gap jumping or manual jump/sprint/sneak remains. Setup and recovery each last 0.12 s, rounded up to a physics step. Release or redirect cancels preparation; an airborne actor finishes its validated flight with bounded lateral steering where the remaining arc and landing are still valid. Ground movement remains continuous and can slide along walls.

Finite box colliders still come from the same vent, resource and ship block descriptions used by rendering. Haze and the finite island edge block movement. Invalid-position recovery retains discoveries and the connection result. `play/simulation.ts` binds shared movement to exploration, discovery and the humanoid's state; `canStandAt` now requires actual support, not merely empty space. Navigation exposes a separate occupancy query for collision checks that do not require support.

## Camera, controls and interaction

The normal entry uses `GameApplication` in third-person mode. `camera.ts` owns the shoulder framing: manual wheel zoom from 3.5 to 70 metres, a fixed 55° FOV and tilt derived from zoom. Play exposes one interpolated render pose with ground and eye positions; main samples it once per frame for the avatar, occlusion target and camera. The camera follows that eye anchor and adapts shoulder offset to portrait aspect ratios. Obstructions never adjust zoom, heading, tilt or FOV. The avatar is visible during play and faces its movement direction.

WASD moves relative to camera heading; Q/E or Left/Right orbit, Home restores starting heading without changing zoom, and jumps happen automatically when traversal is feasible. Space/Ctrl/Shift have no movement action. The pointer stays free. Wheel over the world zooms; wheel over UI does not. Gameplay shortcuts leave form-field typing alone. Pointer capture and keyboard-look settings are absent from the production UI; legacy capture APIs remain covered by regression tests inside play.

Left-click selects visible ship or deposit geometry. `picking.ts` owns the production raycast and accepts canvas bounds without constructing a WebGL renderer. It ignores avatar descendants, resolves selectable ancestors from the nearest remaining hit and allows unselectable foreground geometry to block selection, including visually faded scenery. The scene adapter supplies current canvas bounds and rendered scene/camera transforms. Play owns selection validity and physical interaction reach; selection alone never moves or pauses the humanoid.

`GameApplication` owns lifecycle transitions and held input. Explicit pause freezes and retains movement and jump timers while clearing held keys; resuming a prepared jump retains its preparation intent until new movement input or release overrides it. Terminal opening clears gameplay input but leaves simulation running; Return restores controls, and Escape closes it into explicit pause. Focus/visibility loss clears input without pausing. Restart and seed replacement discard traversal. Pause/resume preserves heading and zoom. The separate paused overview and M shortcut remain removed.

`simulation-clock.ts` consumes elapsed time through bounded 50 ms slices, each executing the same fixed-step simulation. Visible render callbacks and a hidden-tab timer share this clock to avoid duplicate time. Callbacks delayed up to two seconds catch up; longer browser/OS suspensions are deliberately bounded to two seconds. Browser timers cannot guarantee execution while the browser suspends a page. The integrated-browser tools kept the original page visible when another tab opened, so real hidden-tab scheduling remains unverified.

`occlusion.ts` clones scenery materials, probes obstruction and smoothly fades fragments within a tapered camera-to-humanoid opening. Dithered coverage preserves depth writing and avoids whole-chunk transparency sorting. Visibility handling never feeds camera framing back to the camera. Original materials are restored on scene disposal.

The entry HTML loads `main.ts` directly in development and production. Prototype query parameters do not select alternate routes, and the renderer contains no comparison treatments or fixture hooks. Current input and rendering evidence is in [third-person controls](testing/third-person-controls.md) and [prototype cleanup](testing/prototype-cleanup.md). Sustained traversal/orbit feel and rendering performance remain unverified; historical capture-only validation limits do not describe the current input flow.

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

Keyboard/mouse input, finite terrain, and session-only progress are deliberate experiment choices. Audio, touch movement, terrain editing, streaming, multiplayer, and persistence remain unimplemented. No device performance target or frame-rate benchmark has been established. The production build currently warns about the approximately 648 kB minified JavaScript bundle, which includes Three.js.

## Current presentation — 2026-09-19

The user selected the warm console interface from study B. `scene.ts` applies the world palette to ceramic terrain, stepped vents, suspended grains, distant voxel shelves and a voxel satellite. The opaque haze plane marks the unwalkable boundary; it has no liquid behavior. Seeded copper/iron/silica discoveries retain their mechanics with new display names. The existing authored ship is retained, including its working communications light and terminal geometry.

`style.css` implements the warm console layout for arrival, pause and the terminal; the resource journal is compact during play and hidden in menus. All existing IDs and session controls remain connected to real game state. There are no prototype statistics or simulation claims in the playable UI.

The comparison and its tests were captured at `8df36f9` on `codex/alien-visual-prototypes`, then removed from the playable implementation. `index.html` again loads `main.ts` directly. The prototype URL parameter no longer changes the game. See [experiment 004](testing/experiment-004.md) for validation and remaining limitations.

## Archived design evidence

The comparison source, styles, tests and run commands are preserved on experiment branches, separate from the current implementation:

- `codex/third-person-camera-prototype`: raised/shoulder comparison; the user chose shoulder B and exclusively manual zoom. [Camera evidence](testing/camera-prototype.md).
- `codex/strategic-map-prototype`: atlas/chart comparison; the user chose atlas A with actual multi-block footprints and gaps. At the time of this prototype, the presentation was accepted but not yet integrated into production; the current implementation is documented under shared exploration and active atlas below. [Map evidence](testing/strategic-map-prototype.md).
- `codex/occlusion-prototype`: silhouette/fade/manual-orbit comparison; the user chose fading B. Whole-chunk fading was an experiment limitation, replaced by the localized production adapter. [Occlusion evidence](testing/occlusion-prototype.md).
- Local archive `codex/third-person-prototype-archive-41ab0d5` at `41ab0d5`: exact pre-cleanup snapshot including the production-fade render fixtures used for historical validation.

The [accepted design](third-person-design.md) owns the behavior contract and remaining increments. First-person control history is retained in [experiment 002](testing/experiment-002.md) and [experiment 004](testing/experiment-004.md).

## Shared exploration and active atlas — 2026-09-19

The play simulation owns immutable exploration rows, initialized around spawn before either the menu or gameplay is drawn. Active ticks reveal an 8 m horizontal disc sampled at half-metre cell centres; untouched rows are shared between snapshots. Reveal ignores height, scenery and camera settings. Deposit discovery tests every block footprint against this same coverage, replacing the former separate 4 m distance. Reset recreates starting knowledge; returning from a pause preserves it.

`play/exploration.ts` exposes coverage queries and clipping through a public package entry point. `exploration-fog.ts` uploads changed rows to a nearest-filtered texture and clips world and shadow fragments. It composes with localized fading, excludes the humanoid and celestial backdrop, and restores original materials before scene disposal. Close picking checks the nearest hit against the same coverage, so hidden portions cannot be selected.

`atlas.ts` projects a 2 m terrain chart and exact block footprint bounds through the existing Three.js camera onto a canvas overlay. CPU clipping uses the same half-metre mask as close-play shaders. Unknown scenery is omitted entirely, including ship portions outside explored ground. Smooth blending uses 62–80% of manual zoom; picking uses the dominant presentation. Identity labels anchor to revealed fragments, prioritize selection, and avoid the humanoid, selected geometry, UI and other labels. Revealed areas remain visible and play remains active at every zoom. The chart is a simplified presentation, not a navigation guarantee.

See [atlas validation](testing/active-strategic-atlas.md) for real browser evidence and remaining sustained-play/performance limits.

## Navigation direction — first increment implemented on branch, 2026-09-19

[Choose shared navigation boundaries and capability model](https://github.com/FBakkensen/signal-and-shelter/issues/19) owns the accepted design. A reusable navigation module handles movement requests, planning and execution through shared movement physics. Player controls, camera, terminal UI and future robot job management remain outside it. Island geometry remains the physical source; navigation consumes explored-area knowledge and each individual's current movement capabilities. Planning and execution use the same feasibility rules and movement settings.

Represent supported surfaces at distinct heights where geometry permits them, including lower surfaces beneath raised solids. Clearance alone is insufficient: `canStandAt` now rejects unsupported heights. Navigation must validate support, body clearance and executable transitions. A known clicked surface retains its height; unknown destinations initially retain their horizontal position.

Navigation reports arrival or inability to progress. Humanoid recovery retains the requested destination and replans from actual position without immediately repeating the failed transition. Individual capabilities may depend on type and upgrades; upgrades interrupt movement before changes take effect. Robot retry/job scheduling and terrain-specific or flying movement remain separate future decisions. The first increment implements shared local movement and supported surfaces. Destination intent, route planning/execution and failure-driven replanning belong to the next increment.

The user accepted the [navigation design checkpoint](navigation-design.md) and its two implementation increments. It consolidates the behavior, validation requirements and prototype-separation requirements for the production work. The first increment is on `codex/automatic-keyboard-traversal`; [validation evidence](testing/automatic-keyboard-traversal.md) records automated checks and unresolved browser playtest limits.
