# Automatic keyboard traversal — 2026-09-19

Status: implemented on `codex/automatic-keyboard-traversal`; automated checks passed. Browser UI checks completed with the traversal/background limitations below. The implementation ticket remains open for those checks and the reopened project-wide simulation design. The local centre-support change is provisional and disputed; passing these tests does not settle its correctness.

## Validation plan

- Production navigation tests: walk/diagonal/release behavior; automatic up/down transitions at 1 m and rejection beyond; finite body clearance, centre support with full-body clearance, narrow obstacles, gaps and world edges. Observe positions and traversal phases through the public module.
- Capability tests: compare body sizes, speeds and a non-jumping actor using the same world and production code; reject invalid profiles.
- Lifecycle tests: release/redirect setup, airborne steering/release, recovery, pause/resume during every phase, live terminal with keyboard disabled, focus loss without pause, reset and seed changes.
- Run `npm run check` and the existing seeded resource traversal scenarios.
- Integrated browser: normal seeded island start, movement, ignored old bindings, orbit/zoom, selection/terminal, explicit pause/resume and focus/background behavior. Inspect visuals and report any tooling limit on held input or actual hidden-tab scheduling separately.

## Implementation choices to validate

Navigation owns local movement, body collision, supported surfaces and traversal phases. The play adapter supplies camera-relative intent and owns exploration/UI. Candidate jumps validate a gravity-based vertical arc and timed horizontal crossing before execution. Capabilities are copied when binding movement to an actor; upgrading an actor requires interrupting/recreating its movement state. The initial public interface does not implement robot policy or route planning.

## Automated results

`npm run check` passed: strict types, package imports, type-aware lint, production behavior tests, formatting and build. Tests include complete controller routes to three resources across five seeds; these execute the actual movement implementation. A separate frame-rate comparison checks automatic jump position, velocity and phase at 30, 60, 120, 144 and 240 render updates per second. Physics remains fixed at 120 Hz. The existing Vite bundle-size warning remains (approximately 652 kB minified).

Public navigation tests cover symmetric 0.5/1 m transitions and rejection at 1.5 m, a non-jumping profile, clearance, unsupported footprint interiors, shallow/deep gaps, low solid obstacles, world limits, individual height/radius/speed, multiple supported levels, invalid profiles, setup cancellation, release in flight, limited lateral steering and recovery timing. Play tests cover all three jump phases across explicit pause/resume, live terminal, focus loss, restart and seed replacement. Clock tests feed delayed callbacks into real play; they do not establish browser scheduling behavior.

## Integrated-browser evidence

- Used the normal Vite entry at `http://127.0.0.1:5173/?seed=signal-and-shelter` in the Codex integrated browser. No prototype route or runtime fixture was added.
- Started through the actual seed form. Inspected normal voxel scenery, fog, humanoid, camera and updated control hints at desktop dimensions.
- Sent real brief D, Space, Ctrl+D, Shift+D and Q presses. Q visibly changed orbit from 0° to 2°. Space did not show a manual jump. Brief movement presses did not produce reliably observable travel at the HUD's one-decimal precision, so these are not evidence of sustained walking, speed or jump behavior.
- Opened the terminal through its button and F, sent movement/orbit keys while open, checked the data link, returned to play, and used Escape to open explicit pause. The terminal retained its visible state and keyboard orbit remained unchanged while it was open. Flight completion during terminal use is covered by production-code tests, not by this browser check.
- Visual inspection found the journal behind the live terminal; the terminal now hides the journal through existing menu presentation rules. Rechecked desktop and 390×844 terminal layouts; its text and buttons fit. Restored the viewport afterward.
- Browser testing initially found a stale `previous` variable after replacing the render clock. Fixed it and repeated start/terminal flows. Inspected browser error logs afterward: only that earlier, resolved startup error remained; no additional application error appeared in the checked flows.
- Opened another integrated-browser tab and inspected the original document: `visibilityState` remained `visible`, `hidden` remained `false`. Closed the temporary tab. This did not exercise hidden-page timers or prove background execution.

## Remaining validation and handoff

The browser tools provide discrete key presses without held-key events. Do not substitute repeated taps or state mutations for a sustained traversal playtest. A human should hold WASD across eligible terraces and low obstacles, release/turn during preparation, steer during flight, and pause/resume each phase. Check terminal/focus behavior during a jump. Then switch away so the game page is actually hidden and verify its running state on return. The two-second clock cap means long browser/OS suspensions are not replayed; there is no offline progression guarantee.

Human playtesting found the staircase defect recorded below; acceptance of the corrected traversal feel, performance benchmarks and real hidden-tab results remain pending. Click-to-move and destination feedback remain the next ticket. The prototype archive was not merged; runtime, HTML and task scripts contain no prototype entry points or comparison fixtures.

## Human-found staircase regression and reporting — 2026-09-19

The user reported inability to move with W, A or W+A on ordinary terrain, with a screenshot showing seed `signal-and-shelter`, heading 0°, and HUD coordinates 30.8, 13.8. Those are rounded display coordinates, not an exact state capture. Production movement at that displayed point reproduced zero progress in all three directions after 240 fixed steps. Removing scenery retained the failure; a minimal series of 0.5 m treads also failed.

The real planner rejected all 32 landing samples for W/A as unsupported; the diagonal rejected 31 samples as unsupported and the remaining one on travel speed. The cause was requiring the full 0.6 m body footprint to occupy one flat supported height. A half-metre tread cannot satisfy that assumption. Splitting centre support from unchanged full-body collision fixes this rule. The same seeded reproduction then moved approximately 6.119 m (W), 1.805 m (A) and 2.369 m (W+A) in two simulated seconds; the minimal staircase advanced approximately 1.322 m. These are controller measurements, not browser timings or measurements from the user's exact position.

Permanent regressions execute the real GameApplication with the seeded point and all three key combinations, plus a minimal staircase through navigation. Existing gap/drop/clearance/no-jump tests remain; assertions about stopping before drops now check that the supported centre remains on the near side, allowing safe body overhang. No collision dimensions, elevation limit, preparation/recovery timing or gap exclusion was relaxed.

Added bounded movement reports: last eight rejected attempts, repeated-attempt counts, exact position/direction, capabilities and planner rejection categories. Tests check actual rejection reasons, bounded history, copied data isolation, retention through pause, full coordinate precision and reset on restart/seed replacement. In the integrated browser, F8 opened the report, paused play and showed the clipboard-success message; the report textarea contained the correct seed, version, phase and full numeric state. The browser provider's clipboard reader returned an empty string despite the page write succeeding, so cross-application clipboard transfer is not claimed verified; selected text remains available for manual copy.

The correction passed `npm run check` with **86 tests**. The focused red/green command was `node --import tsx --test --test-name-pattern 'ordinary half-metre|reported seeded' src/packages/navigation/tests/movement.test.ts src/packages/play/tests/traversal-lifecycle.test.ts`: both regressions failed before the support correction and passed afterward. Browser checks also exercised the pause-menu report button, return to play, and readable report controls at 390×844; the viewport was restored. Only the earlier resolved startup error remained in the inspected browser log.
