# Deep module refactor — 2026-09-19

## Scope and validation plan

Implement both candidates from the architecture report: gameplay ownership and shared solid placement. Preserve generator version 2, input behavior, voxel geometry and the authored ship.

| Risk | Action and expected evidence | Check |
| --- | --- | --- |
| Input lifecycle leaks through callers | Drive key press/release, pause, capture outcomes and terminal return through GameApplication; assert state and movement outcomes | Automated production logic |
| Quick taps disappear between frames | Release Space before a quarter-step frame, then advance; jump occurs once and a paused queued jump is cleared | Automated, both control modes |
| Colliders survive the wrong seed | Walk through a clear island, replace it with a blocking vent island, restart, then restore the clear island; collision follows the active island | Automated production logic |
| Shared placement drifts | Check negative coordinates and nonuniform terrain heights; compare real procedural mesh bounds against every matching collider across three seeds | Automated Three.js geometry |
| Authored ship or resource lifetime changes | Load the real GLB through the production mesh adapter; compare all ship bounds; verify shared procedural resource disposal leaves template geometry/materials alive | Automated loader and disposal events |
| Browser wiring regresses | Start keyboard play, jump, open/check/return from terminal, click terminal background, pause, restart, overview, replace seed; inspect visible state and screenshots | Integrated browser |

## Results

- A normal `npm ci` completed with network access: 123 packages installed, zero reported vulnerabilities. The first sandboxed attempt returned `EAI_AGAIN`; that was not evidence of broken host DNS. The subsequent normal install replaced the temporarily copied dependencies. No dependency or lockfile changes.
- `npm run check` passed strict types, zero-warning lint, all nine test files, formatting and production build. Tests execute production gameplay, placement, rendering adapters and the actual GLTFLoader. The existing approximately 634 kB bundle warning remains.
- Replaced tests that manually composed ControlSession and game logic with tests through GameApplication. Existing movement/reachability, terrain and block-definition tests remain.
- Browser: Codex integrated Chromium, Vite at `http://127.0.0.1:5175/` (5173 and 5174 were occupied). Keyboard entry for `starter-island` succeeded. Space showed Airborne. E opened the terminal, Check connection updated its text, and background click plus Space left it open and Grounded. Explicit terminal return plus Space showed Airborne.
- After the final rendering-resource change, keyboard entry, Escape, restart and overview were exercised. Overview showed Exploration is paused, and W left the displayed position unchanged. Screenshots showed the ship, three deposits, vents and voxel terrain.
- Choose another seed followed by `next-home` updated the URL and seed label, changed spawn from x=4.0 to x=3.0, rendered a different island, and Space showed Airborne. The subsequent overview screenshot retained the authored ship and all formations after disposal/rebuild.
- Inspected browser warning/error logs were empty.

## Limits

Discrete browser key presses do not establish sustained movement feel, held-input clearing or full resource traversal. Those invariants have production-logic coverage; no new browser traversal claim is made. Captured relative mouse input remains subject to the previously documented integrated-browser limitation and was not re-tested. CSS and layout were unchanged; existing narrow-layout evidence was reused. No performance benchmark was run.
