# Experiment 002 — First-person controls

Date: 2026-09-19. Keyboard play verified; mouse capture remains blocked: the integrated browser cannot capture the pointer in this session. No claim of verified pointer-locked gameplay.

## Current status after user correction

The user rejected drag-to-look and requested keyboard play with arrow-key look. WASD movement and arrow-key look now work in both active modes. Keyboard mode starts without capture; captured mouse look is still blocked in the integrated browser.

Focused keyboard validation: selected Use keyboard controls, pressed Escape, clicked Keep wandering, then pressed Space. The pause panel disappeared, the HUD showed Arrow keys to look, and the player became Airborne. This verifies the previously failing resume path for keyboard play. A bounded 12 pairs of Right/Up taps left position unchanged; the tools do not expose sustained key holds, so sustained turning feel is not claimed as browser-verified. No world traversal was repeated. Automated production tests cover arrow directions, time scaling, opposing keys, WASD separation, keyboard look during locked sessions, mode retention and cleared inputs on resume. `npm run check` passes.

The earlier drag-mode traversal below is historical evidence and does not verify mouse capture. The temporary drag implementation is removed.

## Environment and automated checks

- Node 26.5.0, TypeScript/Three.js/Vite, Codex integrated browser on Linux.
- Dev command: `npm run dev -- --port 5173`. Existing listeners occupied 5173 and 5174; Vite served this test at `http://127.0.0.1:5175/`.
- `npm run check` passed: strict types, zero-warning lint, all five test files, formatting, and production build. Existing bundle-size warning remains (approximately 626 kB uncompressed JavaScript, 160 kB gzip).
- `node --import tsx tests/game.test.ts` also exercised the controller tests directly during development, exposing individual test names rather than the runner's file summaries.
- Production tests cover keyboard mapping, sensitivity/inversion, normalized and yaw-relative movement, sprint/sneak priority, one-block jumping, landing, held jump and midair restrictions, fixed-step frame-rate equivalence, wall sliding, finite-height collisions, head clearance, crouch clearance, water/boundary rejection, diagonal ledge protection, invalid-state recovery, pause/overview/reset, unique stationary discoveries, camera interpolation, capture request failure/cancellation, clearing held inputs, short-tap buffering, and drag termination.
- A route test actually drives the production controller through the real terrain and obstacle set to each landmark. It does not count graph search alone as proof of reachability.
- The real GLTFLoader integration test verifies that all eleven authored beacon mesh bounds have matching production collision boxes.

## Real browser actions and observations

No internal state mutations, synthetic DOM events, or game-function calls were used for browser playtesting. Input was sent through the integrated browser's real click, drag, and key APIs.

1. Clicked Begin exploring, retried Keep wandering, and inspected the paused result. Both stayed paused and offered a retry. Temporary targeted diagnostics captured the rejection: `UnknownError: If you see this error we have a bug. Please report this bug to chromium.` Diagnostic logging was removed after identifying this browser limitation.
2. Explicitly selected Use drag-to-look instead. Inspected eye-level first-person view, hidden avatar, central crosshair and control help. Horizontal and vertical dragging changed the view. Selected sensitivity 1.5 and invert-Y in the pause panel; a downward drag visibly looked upward.
3. Pressed Space; the HUD displayed Airborne and the camera rose. Later inspection showed Grounded again. No position/distance increase from an in-place jump was observed.
4. Sent real W taps; coordinates changed from 0.5,16.5 to approximately 0.6,16.3 after a turn. A single very short tap could occur wholly between simulation updates and produce no visible displacement.
5. Used repeated real Ctrl+W and Ctrl+W+Space chords to sprint/jump toward landmarks, with mouse drags to change heading. This is discrete input testing, not a measured sustained-key speed benchmark. Ctrl+W did not close the integrated-browser tab.
6. Reached the beacon (approximately 0.5,6.5; journal 1/3), stone gate (-18.4,-8.5; 2/3), and grove (18.5,-13.5; 3/3). Completion copy appeared and the final toast identified the grove. The final HUD showed approximately 72 metres wandered. Inspected the scene near terrain steps, beacon, gate surroundings, foliage and the grove trunk.
7. Sent Shift+W inputs near the grove trunk; observed a small advance and a close view of the solid trunk. Exact sneak speed, held crouch camera height, and corner ledge protection are established by automated tests, not this short-input browser check.
8. Escape paused and removed the crosshair. Repeated Escape kept the game paused. Movement inputs while paused did not change position. Returning to drag mode preserved the location. Overview showed the full island and did not move in response to W. Its explicit return action attempted capture and returned to the retry panel when capture failed. Space on a focused menu button activates that button normally.
9. Reset after completing the journal returned to 0.5,16.5, zero distance and a fresh forward view; the journal returned to 0/3 with empty entries. Reset attempted capture and safely stayed paused on rejection.
10. Inspected a 390×844 viewport: pause settings and actions fit without overlap, journal hides behind menus, and the active first-person HUD renders without overlap. Restored the original desktop viewport after the check. This does not establish touch playability.
11. Read browser warning/error logs at the end: only the earlier temporary pointer-lock diagnostic remained in history; no new application exceptions were reported.

## Remaining validation and limitations

- Actual captured relative mouse input, unlimited turning while captured, pointer-lock loss, and simultaneous sustained movement/look require a supported-browser playtest. This is an essential outstanding validation item, not a passed check.
- The exposed browser tools send discrete key presses, not sustained key-down/up events. Repeated chords were sufficient to traverse the whole island; they cannot establish continuous movement comfort, exact speed, or reliable held crouch visuals. Those mechanics have automated production coverage.
- Opening a second integrated-browser tab did not induce a page focus-loss event, so that attempt did not verify blur/visibility handling. The production session's input-clearing behavior is unit-tested; actual browser focus loss remains to be checked.
- Foliage is intentionally non-solid and can intersect the view when approached closely. No foliage fade, audio, performance benchmark, swimming, terrain editing, or persistence is included.
- The full controller still needs user feedback on sensitivity, jump weight and comfort.
