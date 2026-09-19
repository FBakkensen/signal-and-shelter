# Deep island and play modules — 2026-09-19

## Validation plan

This is an ownership/interface refactor, preserving generator version 2, movement, controls and visuals.

| Risk | Action and expected evidence | Check |
| --- | --- | --- |
| Generated geometry drifts | Compare pre/post terrain, placements, solids and quads for fixed seeds; identical digest | Automated comparison |
| Geometry diverges between rendering and physics | Execute real mesh/GLTFLoader bounds checks, clear starts and controller routes | Automated tests |
| Input/session knowledge still leaks | Test public play actions, including quick taps, modifiers, capture cancellation and paused input | Automated tests |
| Seed replacement retains old collisions | Change between explicit clear/blocked islands; movement follows current solids, including after restart | Automated test |
| Package internals or renderer dependencies leak | Run import checks and temporary negative import probes | Dependency-cruiser |
| Browser integration regresses | Seed entry, jump, terminal background guard/check/return, pause, restart, overview, seed replacement, mode switching | Integrated-browser interactions |
| Visual output changes unexpectedly | Inspect first-person, terminal and overview screenshots | Integrated browser |

## Automated results

- Final `npm run check` passed outside the sandbox: strict TypeScript, dependency-cruiser (34 modules, 75 dependencies), ESLint, **49 passing tests**, Prettier and production build.
- Node 26.5.0, npm with locked dependencies installed using `npm ci --offline`. The sandbox blocked esbuild's install check, so installation used the approved unsandboxed command.
- Initial sandbox runs reported file-level test successes only. A supplementary native no-isolation run stalled and was cancelled; it is not test evidence. Unsandboxed `npm test` and the final full check reported individual assertions and established the results above.
- Existing assertions cover 200 clear seeded starts, fifteen resource routes across five seeds using production movement, actual authored ship bounds, resource mesh/collider agreement, vent geometry, voxel face winding and chunk seams.
- Input/session tests now exercise `GameApplication` through the play entry point. Headless physics scenarios use `createSimulation` through its entry point, with terrain/solids bound to a single island. Coverage includes held-input clearing, substep quick jumps, both control modes, both modifier sides, finite look bounds, terminal vertical proximity, and collision replacement/restart.
- Before editing, captured JSON for `signal-and-shelter`, `starter-island`, `ø-hop 🌱`, and `a different coast`: original island data, all 192×192 half-metre height samples, solids, and a 16×16-metre terrain-quad region. The same data after refactoring matched SHA-256 `f787959c0f484fb7ef209fea886dc0a7a06ab79247858f3bb12d64a48c39dd17`. The new `solids` property was compared separately to the former `makeObstacles` result.
- Temporary imports from a top-level test into island internals, from a play test into its own internals, and from island implementation into Three.js each failed under the intended rule. Probes were removed; final dependency checks pass.
- The Three.js geometry integration test remains in top-level `tests/`, outside the renderer-independent packages. Moving it inside island tests correctly triggered the new renderer rule; the rule was retained.
- Build retains the existing large-bundle warning (634.74 kB uncompressed JavaScript); no performance claim.

## Browser results

Codex integrated browser, Vite at `http://127.0.0.1:5175/` (5173 and 5174 were occupied), desktop viewport approximately 2046×1228.

- Entered `starter-island`, selected keyboard controls, and began play. URL and seed badge reflected the seed; player started at 4.0, 9.3.
- Pressed Space and observed **Airborne**. First-person screenshot showed the ship, terminal, stepped vents, resource geometry and warm console presentation.
- Pressed E to open the terminal. Clicking exposed world then pressing Space left the terminal open and the player Grounded. Clicking Check connection displayed confirmation. Explicit Return to the island followed by Space showed Airborne and retained Data link confirmed.
- Escape opened pause. Restart cleared the data-link check and retained the seed and keyboard controls.
- M opened the paused island overview; screenshot showed the voxel terrain and formations. Explicit return resumed the play flow.
- Chose another seed and entered `next-home`. URL/badge updated, progress was cleared, and player start changed to 3.0, 9.3.
- Selecting mouse controls reproduced the existing capture rejection, with the explanatory pause message. Selecting keyboard controls recovered and Space showed Airborne.
- Inspected warning/error logs after replacement and mode switching: empty.

## Limits

- Discrete D and arrow-key presses were attempted, but no measurable horizontal position change was visible at the HUD's precision. These tools do not expose held-key duration; this run does not verify sustained walking/look feel or full browser resource traversal. Production-code movement and input tests passed.
- Real captured mouse look remains blocked by the integrated browser's capture rejection. Capture transitions and input conversion are covered by automated tests; browser recovery is verified separately.
- No layout/CSS changes, asset edits, generator changes, audio or performance measurements. Narrow-layout testing was not repeated for this interface-only refactor.
