# Automatic navigation prototype — 2026-09-19

Status: user reports the revised prototype feels great and selected timing A with a shared 1 m maximum jump up/down. Prototype remains open for further playtesting. This is archived experiment evidence, not production validation.

## Scope and run

Archive branch: `codex/navigation-prototype`. Return branch: `codex/navigation-design`. Starting design commit: `6da9585`; workflow instructions were subsequently committed on the return branch at `a594183`. An earlier premature return to the design branch was corrected; stay on the prototype branch during playtesting until the user explicitly finishes it. Never merge the prototype branch.

Run `npm ci` then `npm run dev -- --port 5173`. `npm run check` validates types, boundaries, lint, tests, formatting and the build. Both commands were exercised. A copy of the built site is served from `/tmp/signal-navigation-prototype-preview` on `http://127.0.0.1:5174/` for this session, independently of branch checkout.

Four controlled courses cover terraces, a low bar versus a walking detour, progressive exploration with a tall wall and uncrossable gap, and a low ceiling. Timing presets use setup/recovery seconds: A 0.12/0.12, B 0.25/0.30, C 0.45/0.50. The shared maximum jump up/down can be 0.5 or 1.0 m. The user selected 1.0 m and timing A; both are now defaults.

## Validation plan

- Route costs: compare the same destination with brisk and weighty timing; assert different jump counts and successful arrival.
- Exploration: request unknown and unreachable destinations; assert all route points are known, exploration triggers recalculation, and unreachable destinations persist without repeated movement.
- Control lifecycle: replace destinations, cancel by direct input, release during setup, take over in flight, pause each jump phase, resume, use the terminal and reset.
- Clearance: execute the same model used by the browser against production standability checks through the public simulation interface.
- Browser: real destination clicks, automatic traversal, keyboard cancellation, terminal interaction, pause/resume, timing/course selection and zoom; inspect desktop and narrow presentation and browser errors.

## Earlier build evidence (superseded movement implementation)

The following checks describe the initial build, not validation of the revised physics below.

### Automated evidence

`npm run check` passed after the final input correction; the runner reported 14 passing test files. Eight prototype scenarios execute the same `NavigationStudy` implementation used by the browser, alongside the retained production tests.

- Brisk timing jumps the low bar twice (up/down); weighty timing walks around it with zero jumps. Both reach the same requested point.
- Unexplored targets become reachable as exploration advances. A target beyond the gap remains requested while the humanoid stays at its nearest reachable endpoint.
- Setup, flight and recovery freeze under explicit pause and continue on resume. Direct movement cancels route intent, release cancels preparation, and limited airborne steering still lands and enters recovery.
- Terminal interaction suppresses movement commands without pausing the simulation; background/focus-loss model actions preserve route execution.
- Low-ceiling traversal respects production body clearance, and limited-climb/drop traversal reaches its target through an allowed detour.
- An adapter regression reproduces empty keyboard polling during a routed jump; it must not cancel jump preparation.

Build reports the existing class of bundle-size warning (the study bundle is approximately 557 kB minified). No frame-rate benchmark was performed.

### Integrated-browser evidence

Codex integrated browser, real mouse and keyboard actions:

- At 1280×800, right-clicked beyond the revealed terraces. Observed movement, progressive reveal, 33 route calculations, two automatic jumps and `Arrived`; the destination marker disappeared.
- Scrolled from distant course inspection to close play. The humanoid and voxel terrain remained visible. Zoom remained user-controlled.
- Restarted, opened the nearby terminal, checked its connection and pressed W while using its UI. Position stayed at spawn while the active clock advanced. Escape opened explicit pause. The clock remained exactly 8.7 seconds across observations; Resume restored the terminal with `Connection established`.
- Selected the low-bar course and brisk timing through real controls. A right-click beyond the bar reached its destination after two jumps.
- Opening a second tab did not yield a hidden document: the game reported `document.visibilityState === "visible"`. Progress continued, but this is **not** proof of hidden-tab scheduling. Stop at this tooling limitation; real background suspension remains unverified.
- Inspected 390×844: controls remain in a scrollable panel and the status footer wraps within the viewport. The panel reduces usable world area; touch movement is not implemented.
- On the final built preview, right-click followed immediately by A produced `Direct control`, cleared the route/destination and stopped automatic route execution. Sustained held-key feel remains for human playtesting; discrete automation taps are not used as a substitute.
- Browser warning/error logs inspected during the study were empty. The temporary Vite process later terminated; the independent static build preview was started and opened successfully for handoff.

## Correction after user feedback — 2026-09-19

The user rejected the inconsistent jump geometry and broken diagonal control, then clarified that custom scenarios are wanted while gameplay logic must be reused. The attempted seeded-island replacement was reverted. The original prototype was wrong to assign positions along custom arcs instead of executing the existing movement simulation.

The four custom courses remain. Every movement update now runs the production `createSimulation().advance` with persistent state. Gravity, speed, collision response and landing come from that simulation; there is no endpoint teleport. The planner executes the same simulation to validate candidate jumps. Setup/recovery remain experimental controller delays included in route cost. A bounded world-space walking-intent input allows navigation to drive the simulation; the existing keyboard path uses the same direction function. The browser reuses the game's input mapping and camera, including diagonal normalization, Q/E and arrow orbit, and Home. Space/Ctrl/Shift do not trigger gameplay actions in this study.

The planner now supports eight directions with swept body checks and straight walking segments across open ground. Takeoff and landing require support under the full body footprint. Direct walking is continuous instead of finishing grid strides after a turn or release.

### Revised validation plan and results

- Automated: compare all four diagonal key combinations at three camera headings against the real game simulation, frame by frame. Verify bounded and invalid world intent, actual game jump launch/gravity, no horizontal teleport on landing, full landing support, arbitrary diagonal routes, immediate direction changes, and retained lifecycle/routing regressions.
- `npm run check` passed: typecheck, dependency boundaries, lint, all 14 test files (including 17 prototype cases), formatting and Vite build. The existing bundle-size warning remains, about 560 kB minified. No performance benchmark claimed.
- Integrated browser at `http://127.0.0.1:5174/`, revised build loaded by reload: a short series of W+D chords changed both coordinates from approximately (-6.8, 0.3) to (-6.7, 0.2). Sustained holds are not available through this browser tool; their feel remains a human playtest item. Automated tests cover sustained diagonal movement against the shared simulation.
- Right-clicked the first terrace. Observed automatic movement and arrival at approximately (-1.3, -0.3), height 2.50 m, one completed jump. Screenshot inspection showed the humanoid's feet on the terrace. This establishes the integrated landing outcome, not a slow-motion visual audit of every flight frame.
- Escape paused at 31.7 active seconds. W+D while paused left time and position unchanged. Resume restored play. Space left height and completed-jump count unchanged. Restart returned to the original custom-course spawn.
- Revised browser warning/error logs were empty. The updated built assets were copied to the persistent 5174 preview. The branch remains `codex/navigation-prototype` for the user's playtest; no verdict or acceptance is inferred.

## Remaining limits

The experiment still uses a course-specific planner and test UI, with one highest supported surface per grid location; layered roofs/tunnels are not fully modeled. Drops use the same setup/recovery treatment; their feel needs feedback. Limited airborne steering affects simulation input, not a forced visual deflection.

Distant zoom uses course geometry rather than the production atlas. Unknown-target picking projects onto a reference plane and does not consult hidden terrain height. The test terminal is a fixture, not the authored spaceship. The timer continues independently of rendering but caps a delayed update at five seconds; true hidden-tab throttling and OS sleep remain unverified. Earlier responsive-layout observations were not repeated because this correction did not change layout.

Do not infer final navigation architecture, whole-world reachability, performance, or acceptance of timings from these checks. The prototype ticket remains open until the user plays it and supplies a verdict.

## Selected tuning — 2026-09-19

User feedback: the revised prototype seems great; maximum jump down must equal maximum jump up, with 1 m selected, and timing A selected (0.12 s setup plus 0.12 s recovery). The controller and planner now use one `jumpHeight` field for both directions, so the values cannot diverge. The model and initial UI default to A and 1 m. Carry this selection into the design branch when the user finishes the prototype; no branch switch was made for this addition.

Validation: added a real traversal regression covering forward and return routes at both 0.5 m and 1 m, checking ascending and descending graph edges against the same limit. `npm run check` passed all 14 test files, including 18 prototype cases, with the existing bundle-size warning. Reloaded the integrated-browser preview, observed A and 1.0 m selected, clicked Restart course, and confirmed both remained selected. Screenshot inspection confirmed the shared “Maximum jump up / down” label and course display. This focused check reuses the prior movement/landing evidence.
