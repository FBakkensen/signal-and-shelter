# Automatic navigation prototype — 2026-09-19

Status: playable study prepared for human feedback; no user-selected timing or traversal verdict yet. This is archived experiment evidence, not production validation.

## Scope and run

Archive branch: `codex/navigation-prototype`. Return branch: `codex/navigation-design`. Starting design commit: `6da9585`; workflow instructions were subsequently committed on the return branch at `a594183` and followed during this handoff. Never merge the prototype branch.

Run `npm ci` then `npm run dev -- --port 5173`. `npm run check` validates types, boundaries, lint, tests, formatting and the build. Both commands were exercised. A copy of the built site is served from `/tmp/signal-navigation-prototype-preview` on `http://127.0.0.1:5174/` for this session, independently of branch checkout.

Four controlled courses cover terraces, a low bar versus a walking detour, progressive exploration with a tall wall and uncrossable gap, and a low ceiling. Timing presets use setup/recovery seconds: A 0.12/0.12, B 0.25/0.30, C 0.45/0.50. Maximum climb can be 0.5 or 1.0 m; default maximum drop is 1.0 m. These are hypotheses for playtesting.

## Validation plan

- Route costs: compare the same destination with brisk and weighty timing; assert different jump counts and successful arrival.
- Exploration: request unknown and unreachable destinations; assert all route points are known, exploration triggers recalculation, and unreachable destinations persist without repeated movement.
- Control lifecycle: replace destinations, cancel by direct input, release during setup, take over in flight, pause each jump phase, resume, use the terminal and reset.
- Clearance: execute the same model used by the browser against production standability checks through the public simulation interface.
- Browser: real destination clicks, automatic traversal, keyboard cancellation, terminal interaction, pause/resume, timing/course selection and zoom; inspect desktop and narrow presentation and browser errors.

## Automated evidence

`npm run check` passed after the final input correction; the runner reported 14 passing test files. Eight prototype scenarios execute the same `NavigationStudy` implementation used by the browser, alongside the retained production tests.

- Brisk timing jumps the low bar twice (up/down); weighty timing walks around it with zero jumps. Both reach the same requested point.
- Unexplored targets become reachable as exploration advances. A target beyond the gap remains requested while the humanoid stays at its nearest reachable endpoint.
- Setup, flight and recovery freeze under explicit pause and continue on resume. Direct movement cancels route intent, release cancels preparation, and limited airborne steering still lands and enters recovery.
- Terminal interaction suppresses movement commands without pausing the simulation; background/focus-loss model actions preserve route execution.
- Low-ceiling traversal respects production body clearance, and limited-climb/drop traversal reaches its target through an allowed detour.
- An adapter regression reproduces empty keyboard polling during a routed jump; it must not cancel jump preparation.

Build reports the existing class of bundle-size warning (the study bundle is approximately 557 kB minified). No frame-rate benchmark was performed.

## Integrated-browser evidence

Codex integrated browser, real mouse and keyboard actions:

- At 1280×800, right-clicked beyond the revealed terraces. Observed movement, progressive reveal, 33 route calculations, two automatic jumps and `Arrived`; the destination marker disappeared.
- Scrolled from distant course inspection to close play. The humanoid and voxel terrain remained visible. Zoom remained user-controlled.
- Restarted, opened the nearby terminal, checked its connection and pressed W while using its UI. Position stayed at spawn while the active clock advanced. Escape opened explicit pause. The clock remained exactly 8.7 seconds across observations; Resume restored the terminal with `Connection established`.
- Selected the low-bar course and brisk timing through real controls. A right-click beyond the bar reached its destination after two jumps.
- Opening a second tab did not yield a hidden document: the game reported `document.visibilityState === "visible"`. Progress continued, but this is **not** proof of hidden-tab scheduling. Stop at this tooling limitation; real background suspension remains unverified.
- Inspected 390×844: controls remain in a scrollable panel and the status footer wraps within the viewport. The panel reduces usable world area; touch movement is not implemented.
- On the final built preview, right-click followed immediately by A produced `Direct control`, cleared the route/destination and stopped automatic route execution. Sustained held-key feel remains for human playtesting; discrete automation taps are not used as a substitute.
- Browser warning/error logs inspected during the study were empty. The temporary Vite process later terminated; the independent static build preview was started and opened successfully for handoff.

## Findings and limits

The initial sketch could climb but could not descend; collision-checked descending transitions fixed the traversal. Browser testing exposed keyboard polling repeatedly cancelling route-driven setup; a regression now covers that boundary. Including both setup and recovery changes the chosen route in the low-bar experiment.

The study is intentionally a controlled course with a four-direction graph, not the seeded island. Ground movement follows short grid segments; new route intent is immediate, while trajectory changes occur at safe segment/landing boundaries. Air steering is a small collision-checked deflection (up to 0.18 m), returning to the chosen landing. Jump arcs are simplified parabolas validated against production standability; they are not production gravity integration. One highest supported surface is represented per grid location, so layered roofs/tunnels are not fully modeled. Drops use the same preparation/recovery treatment in this study; its feel needs feedback.

Distant zoom uses the same course geometry rather than the production atlas. Unknown-target picking projects onto a reference plane and does not consult hidden terrain height; destination picking semantics on complex geometry still need production design. The test terminal is a small nearby fixture, not the authored spaceship. The timer continues independently of rendering but caps a delayed update at five seconds; OS sleep, browser throttling and true hidden-tab behavior are not guaranteed by this experiment.

Do not infer final navigation architecture, production island reachability, performance, or acceptance of timings from these checks. The prototype ticket remains open until the user plays it and supplies a verdict.
