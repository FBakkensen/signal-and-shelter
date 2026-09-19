# Pointer selection review fixes — 2026-09-19

## Validation plan

- Automated: execute the extracted production picker against real Three.js geometry. Verify selectable ship/resource ancestors, coordinate conversion with a non-square offset canvas, nearest-hit ordering, nested avatar exclusion, blocking scenery (including faded material), empty space and avatar-only hits.
- Browser: start the normal seeded game, click ship geometry and observe selection, use F and return, then click unselectable ground and observe selection clear. Inspect the rendered scene and relevant browser errors. Camera/layout behavior is unchanged.
- Run full project checks and inspect the architecture against current input, camera, lifecycle and rendering code.

## Results

- `npm run check` passed strict types, boundaries, lint, tests, formatting and build. Separate unsandboxed `npm test` confirmed 58 individual tests, including all four new production-raycast tests, pass. The existing approximately 640 kB bundle warning remains.
- Codex integrated browser at `http://127.0.0.1:5173/?seed=map-check`: started normal play, visually inspected the humanoid/ship/terrain, clicked the ship body and observed Stranded ship selection. F opened the terminal; explicit Return preserved the selection. Clicking unselectable ground cleared the selection panel. Zoom stayed at 35%; browser warning/error logs were empty.
- Architecture now describes current third-person framing, controls, picker ownership, interaction gating, pause/reset behavior and visibility handling. Superseded prototype descriptions are consolidated into labeled archive references.
- `git diff --check` passed. No layout or movement changes were made; prior sustained traversal and performance limitations remain.
