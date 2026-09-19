# Experiment 004 — Ember Fold

2026-09-19. User selected study B after explicitly requiring preservation of voxel visuals.

## Validation plan

- World geometry: half-metre terrain must remain deterministic, axis-aligned and seam-free. Test seed reproduction, terrain meshing and smaller-cell footprint collisions.
- Vents: render and collision must use the same block dimensions; starts, ship terminal and resource routes must remain clear. Test shared vent parts and execute existing controller routes across five seeds.
- Browser: inspect arrival, start keyboard play, move/look/jump, open/check/leave terminal, pause/resume, overview and restart. Inspect warm terrain/vent/haze rendering and active UI. Check narrow start/pause/terminal layouts and application errors.
- Run `npm run check`. Record tool limitations instead of substituting synthetic gameplay calls for real interactions.

## Results

- Environment: Vite on `http://127.0.0.1:5174`; Codex integrated browser; desktop and 390×844. Test seed `ember-home`.
- Automated: `npm run check` passed strict types, zero-warning ESLint, all six test files, formatting and build. Tests cover deterministic half-metre heights, chunk seams, outward axis normals, half-cell wall collision/jumping, vent block dimensions/collider correspondence, 200 clear starts and actual controller traversal to three resources across five seeds (15 routes).
- Browser: filled seed, selected keyboard controls and clicked Begin your landing. First-person scene, vents, resource journal and terminal prompt rendered. E opened the terminal; Check connection changed the status to confirmed; Return to the island resumed. Short real D/Right presses moved x from 6.0 to 6.1; Space showed Airborne. Escape paused; Keep wandering resumed; another Space showed Airborne. Restart returned to x=6.0 and Grounded. Choose another seed returned to the form. M entered the paused overview.
- Visual: desktop arrival, active scene and overview inspected. Narrow arrival, pause and terminal panels were inspected; inputs/buttons fit within the viewport. No CSS or gameplay failures observed in those flows. Viewport override restored afterward.
- Errors: inspected application error logs were empty. Production bundle remains approximately 631 kB uncompressed and emits the existing size warning.
- Limitations: discrete browser key presses cannot validate sustained control feel or faithfully execute full resource traversal; that browser check remains incomplete. Automated controller routes do not replace that evidence. Captured mouse look retains its earlier host limitation and was not retested. No performance benchmark, physical vapor simulation, editable blocks or asset-pipeline change.
- Prototype source preserved at `8df36f9` on `codex/alien-visual-prototypes`; B selected and comparison implementation removed from the playable branch.
