# Experiment 001 validation

Date: 2026-09-19. Environment: Node 26.5.0, local Vite server, Codex integrated browser at http://127.0.0.1:5173.

## Automated checks

`npm run check` covers strict TypeScript, type-aware ESLint with zero warnings, Node's test runner, Prettier, and Vite production compilation.

23 behavioral tests across four test files:

- World: deterministic hashes and bounded terrain, dry spawn/landmarks, biomes, tree constraints, hidden-face removal, chunk seams, and outward face winding.
- Game: speed, normalized diagonals, camera-relative directions, pause/overview, frame timing, water/cliff/obstacle collisions, sliding, discovery boundaries and persistence, the actual spawn-to-beacon route, reset, all-landmark reachability, and complete-journal uniqueness.
- Controls: actual key mappings, release/clear behavior, and keyboard/pointer turning.
- Asset: the real Three.js GLTFLoader parses the exported Blender beacon; eleven meshes, base origin, and metre-scale dimensions are asserted.

Node 26's isolated test command reports file-level results here. Individual files were also run directly with `node --import tsx tests/<name>.test.ts` to verify the named test cases execute and pass.

Build limitation: Vite emits a bundle-size advisory for the approximately 620 kB uncompressed JavaScript bundle. This is not an ESLint warning or failed build; optimization is deferred until measured requirements exist.

## Integrated-browser checks

These were real UI interactions through browser tools, not direct mutation of application state.

| Flow | Action and observed result |
| --- | --- |
| Initial loading | Inspected the full scene and welcome UI; terrain, trees, stone gate, golden grove, and imported beacon rendered; start button became enabled |
| Start | Clicked Begin exploring; welcome disappeared, pause button appeared, and camera moved to the avatar |
| Walk and run | Sent W and Shift+W; avatar moved along the path and displayed coordinates/distance changed |
| Strafing | Sent Shift+A and Shift+D; moved sideways across the island |
| Discoveries | Walked to the beacon, then stone gate, then grove. Journal advanced 1/3, 2/3, 3/3, each with a notification |
| Completion | At approximately (18.6, -13.7), all entries were marked and the journal displayed “Every landmark found. The rest of the walk is yours.” |
| Collision | Approach to grove stopped near a trunk at approximately (12.2, -12.3); walking around it restored progress |
| Pause | Escape opened the pause panel; repeated movement inputs left coordinates unchanged |
| Resume | Keep wandering returned to gameplay with the discovery retained |
| Overview | M entered overview; repeated movement inputs left coordinates unchanged; Overview button returned to follow mode |
| Camera | Q input and a real pointer drag visibly rotated the view without moving player coordinates |
| Reset | Pause button then Start a fresh walk restored spawn, zero distance, and 0/3 discoveries |
| Narrow layout | Inspected welcome at 390×844 after reload; primary controls and journal remained visible. Restored normal desktop viewport afterward |
| Errors | Browser warning/error log inspection returned no entries during testing |

## Limits and follow-up

- Desktop keyboard/mouse gameplay was tested. Touch movement is absent.
- Water/cliff boundaries are automated logic tests; the browser collision check exercised a tree trunk.
- Nearby foliage can hide the avatar. Add camera occlusion handling if this view is retained.
- Audio is absent; no listening test applies. No frame-rate or device performance claim is made.
- Browser checks are recorded interaction evidence, not a standalone CI browser suite. Repeat them through the integrated browser for future affected changes.
