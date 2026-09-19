# Experiment 003 — Seeded arrival

Date: 2026-09-19. Implemented and checked; browser traversal and captured mouse look remain unverified.

Question: Does arriving beside a stranded spaceship on a small, explorable island feel like the beginning of the agreed game?

## Planned checks

- Generate starts from repeated, different, whitespace, Unicode and long seeds. Production tests compare terrain, placements, initial state and collisions; repeat seeds must match and different seeds must vary.
- Check a broad seed sample for dry, unobstructed spawns and accessible resources/terminal. Execute production walking/jumping on routes for representative seeds; invalid-position recovery must return to the current seed's spawn.
- Load the ship GLB with the production loader and compare geometry to collision definitions. Preserve the existing Blender scene and editable asset source.
- In the integrated browser, enter a seed, start with keyboard controls, inspect the ship, open its terminal and check the connection. Paused terminal/menu states must stop movement; return must preserve controls and progress.
- Discover resources through real movement where browser input permits. Compare the overview for repeated and different seeds; restart clears discoveries and terminal progress without changing the seed. Blank input generates a visible, reusable seed.
- Inspect desktop and narrow start/pause/terminal layouts and relevant browser errors. Run `npm run check` after implementation. Report existing pointer-lock and held-input tooling limitations without substituting synthetic gameplay.

## Automated results

- `npm run check` passed: strict TypeScript, zero-warning type-aware ESLint, all five test files, formatting and production build. The build retains the bundle-size warning (about 631 kB uncompressed).
- Repeated seeds compare complete terrain grids, resources, trees, ship/terminal/spawn positions, collision geometry and initial game state. Different seeds change the terrain and placements. Normalization covers whitespace, zero, case, Unicode, length limits and surrogate truncation; blank input chooses a reusable seed.
- A sample of 200 seeds has dry, unobstructed player spawns, level ship sites and dry deposits, with foliage clear of the arrival area and resources.
- The production controller traversed routes to all three resources across five fixed seeds (15 routes). This is automated reachability evidence, not a browser playthrough.
- Tests verify proximity and vertical limits for terminal use, connection state, overview exclusion, repeat checks, fresh reset and seed-specific recovery preserving progress. Existing physics/input/session tests remain passing.
- Actual GLTFLoader parsing verified all 17 ship meshes against production colliders, metre scale and editable source presence. Blender MCP inspection confirmed the original active `Scene` was restored; the ship occupies its own new scene. Export succeeded despite an MCP output-capture finalization warning.

## Integrated-browser results

Environment: Codex integrated Chromium, local Vite server at `http://127.0.0.1:5173`, keyboard mode. Desktop screenshots included 1280×720 and the app's subsequently larger viewport; responsive inspection used 390×844 and the override was reset afterward.

- Entered `robot-home`, selected keyboard controls and started. Observed the ship and lit external console at player position 6.0, 10.3, with the chosen seed in the URL/HUD.
- Pressed E, clicked Check connection and observed Data link confirmed plus the ship's flight-offline status. A movement key while the terminal was open left the displayed position unchanged. Return restored keyboard play; overview retained the connection result.
- Restart returned to the same position, cleared the connection result and preserved keyboard controls. The overview retained the same island layout. A page reload and re-entry with `robot-home` reproduced that layout and initial position.
- Choose another seed → `731` → Begin produced visibly different terrain, foliage and ship placement, with initial position 5.0, 8.3.
- An initial browser `fill("")` attempt did not actually clear the seed; verified Ctrl+A / Backspace did. Starting from the visibly empty field generated `97fd1d81-51c`, displayed it in the URL/HUD, and placed the player at 0.0, 9.3. Its terminal opened normally.
- Start, pause and terminal layouts were visually inspected at 390×844. Corrected the terminal panel's width to maintain a right margin, then reinspected it. This does not establish touch playability.
- Browser error/warning logs were empty for the inspected seeded-start/terminal flows.

## Remaining limitations

- Available browser input exposes discrete key presses, not held-key events. A movement tap did not produce a visible position change. Full real-browser resource traversal, sustained movement feel and physical approaches to deposits therefore remain unverified; no long substitute key-press loop was used.
- Captured mouse look remains unverified because of the previously isolated integrated-browser pointer-lock failure. This task exercised the user-approved keyboard mode and retained mouse capture support.
- No performance benchmark, audio, gathering, robots, power simulation, downloads, inter-island travel or saved progress. The connection check is local fictional game state.
