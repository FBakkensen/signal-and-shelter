# Review fixes — 2026-09-19

## Validation plan

- Execute the production application controller in automated tests: keyboard and capture entry, terminal opening/background clicks/return, cancellation and stale capture results, pause/overview/reset, seed replacement and held-input clearing. The terminal regression must fail before its guard is added.
- Share resource block definitions between production rendering and collision. Assert resource bounds, colors, matching colliders and obstacle behavior; keep the real GLTFLoader asset check.
- Reproduce the terminal background click in the integrated browser. Expect terminal visible, physics paused and Space ignored; explicit return must resume play. Check pause/overview/restart/seed replacement after moving lifecycle logic.
- Run `npm run check`. Layout and terrain behavior are unchanged; reuse the earlier visual/layout and traversal evidence. Actual pointer capture remains subject to the documented browser limitation.

## Results

All three review findings resolved.

- Extracted `GameApplication`, used by the live DOM adapter, and added production-controller tests covering the planned lifecycle cases. The terminal background regression failed before the guard and passed after it. Both keyboard and simulated capture modes are covered.
- Added shared typed resource parts. Tests instantiate the production mesh factory for all three deposits, verify colors and bounds, match every part to a production collider, and check blocked/clear player positions. The authored ship integration check remains passing.
- `npm run check` passed: strict type checking, zero-warning ESLint, eight test files, formatting and production build. Existing bundle-size warning remains (approximately 634 kB).
- Integrated browser, keyboard controls, fixed test seed: E → exposed-canvas click at (1420,700) → Space leaves terminal visible, no active-play journal/pause button, and player Grounded at 6.0,9.3. Check connection → explicit return → Space shows Airborne with terminal hidden and link confirmed.
- Overview/return and Escape pause worked. Restart cleared link progress and restored spawn. Choose another seed retained keyboard preference; entering `review-fix` updated the URL/world and grounded spawn to 5.0,10.3 with progress cleared.
- Visually inspected the terminal and replacement world: voxel terrain/vents, ship, resource outcrop and console panels render. Inspected browser error logs were empty.
- Limitation: actual pointer capture and sustained traversal were not revalidated; the previously recorded integrated-browser pointer-lock limitation remains. Capture lifecycle outcomes are automated tests, not claims of real captured-mouse testing.
