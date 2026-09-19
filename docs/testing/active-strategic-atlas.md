# Active strategic atlas and shared exploration

Date: 2026-09-19. Production increment for [Implement the active strategic atlas and exploration](https://github.com/FBakkensen/signal-and-shelter/issues/13), on `codex/strategic-atlas-integration`.

## Validation plan

- Exercise the production simulation to verify one horizontal 8 m reveal rule, discovery on partial deposit exposure, persistence after leaving, pause/invalid-time freeze, initial/menu coverage, reset and seed replacement. Check that obstacles and height do not alter coverage.
- Compare every atlas block's bounds with production colliders on two seeds. Verify partial footprint picking, hidden-fragment rejection, foreground blocking, label placement and continuous zoom blending through production functions.
- Compare every GPU coverage pixel with CPU exploration; verify updates/reset, shadow-material coverage, composition with localized obstruction fading and shared-material disposal.
- In the integrated browser, inspect close, blended and full atlas presentation on real seeds; select objects, jump, use/check/return from the terminal, test paused background clicks, UI scroll isolation, restart and replacement seed. Inspect desktop and 390×844 layouts and console errors. Do not substitute internal state mutation for interaction.

## Implementation and automated results

`npm run check` passed: strict types, package boundaries (46 modules, 123 dependencies), zero-warning ESLint, all **68 tests**, formatting and production build. Node 26.5.0; dependencies installed with `npm ci --ignore-scripts`. Existing Vite bundle warning remains: 647.86 kB minified / 167.35 kB gzip JavaScript. No frame-rate claim follows from build size.

Exploration is immutable simulation knowledge. The 8 m disc is sampled at centres of half-metre cells, matching voxel scale; the rendered boundary is consequently stepped rather than an exact continuous circle (up to half a cell diagonal from the ideal circle). Both presentations, deposit identity and picking consume that same coverage. The atlas retains its separate 2 m chart terrain sampling; it is not a precise route-safety map. Object footprints retain actual block dimensions and gaps, clipped to explored coverage. GPU fog also clips shadow casters so concealed scenery does not disclose its shape through shadows.

New automated checks execute production code for initial reveal, partial discovery beyond the former 4 m threshold, explored-area persistence, immutable snapshots, obstacle/height independence, island bounds, pause/jump/orbit behavior, lifecycle reset, GPU/CPU parity, material restoration, footprint dimensions, partial and blocked picking, degenerate polygons and label collision/bounds. Existing real-controller resource traversal tests still pass. Earlier checks found obsolete overview expectations, a floating-point equality and strict Three.js typing issues; these were corrected without weakening checks.

## Browser observations

Environment: Codex integrated browser, 1280×720 desktop and 390×844 narrow viewport. `npm run dev -- --port 5174` served this worktree (the usual 5173 was occupied during initial development). Tested real seeds `signal-and-shelter` and `atlas-92`.

- Opening menu: only the starting explored patch, ship portions, humanoid and nearby scenery were visible. No island outline or distant surface details leaked through the backdrop.
- Close play: unexplored ground and object portions were absent behind the opaque atmosphere. The boundary cut through nearby vents and, on `atlas-92`, a resource deposit.
- Zoom: manual wheel moved through 35%, 71%, 100% and back through 71% to 41%. Both presentations retained the same explored patch and discovery count; there was no whole-island reveal in close play. The transition crossfades the two presentations and their backdrop colors.
- `atlas-92`: starting position (0, 12.3), iron deposit centre (-7.5, 15.5), about 8.15 m away. Its footprint intersects the revealed area, so the journal immediately displayed **Ferric nodules**, 1/3. The partial footprint and identity label appeared in the atlas; the close view showed the corresponding partial geometry. Copper and silica stayed undiscovered.
- Clicking the revealed deposit edge selected Ferric nodules. F did not redirect use to the nearby ship. Clicking the hidden side cleared selection. Atlas Space input visibly changed the HUD to Airborne.
- Clicking the ship footprint and F opened the terminal at 100% zoom. Check connection updated the result. Clicking the exposed world and Space left the terminal open and the humanoid grounded. Explicit Return resumed play.
- Wheel over the journal preserved 71% zoom; wheel over the world changed it. The retired M shortcut did not pause or open another view.
- Narrow inspection: close play and full atlas preserved manual framing, readable journal/selection panels, player marker, ship label and partial deposit label. The label avoided the selected ship footprint and humanoid. No automatic fit was applied.
- Restart on `atlas-92` cleared selection/connection and restored starting knowledge (correctly still 1/3), retaining 100% zoom. Choosing `signal-and-shelter` through the form reset to 0/3 and its own starting patch, again retaining zoom.
- Historical `study=map&variant=B&example=1` parameters loaded the ordinary landing menu, with no comparison switcher or example-reveal mode. Source/entry/script searches found no runtime prototype routes; remaining fixtures are inside tests.
- Warning/error console logs for the exercised final build were empty. The temporary viewport override was reset.

## Limits and follow-up

Discrete D/E browser presses did not visibly change the HUD position/heading. Sustained traversal/orbit feel and live expansion of fog during a long route are **not browser-verified**; production simulation tests cover movement, reveal persistence, reset and resource routes. The next integrated-playtest increment remains responsible for human sustained traversal, broader occlusion/transition refinement and measured rendering costs. This run does not establish a performance target, future dense-base label capacity or touch controls.

The fog boundary is a hard voxel-aligned cut, and partially revealed objects can look sliced. This follows the agreed partial-object rule; additional visual treatment remains playtest tuning. No future robot/building simulation was introduced: active explored areas use the existing continuously running play session, with explicit pause still global.
