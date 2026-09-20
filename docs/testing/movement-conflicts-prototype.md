# Movement conflicts and safe landing study

Date: 2026-09-20. Status: refined movement-conflict behavior accepted by the user ("i think it is fine"). Support-footprint dimensions remain open.

## Refinement after user agreement

Canonical partial decision: [accepted priority principle](https://github.com/FBakkensen/signal-and-shelter/issues/32#issuecomment-5748256968). Robots yield before jumping; everyone respects a jump already underway. This does not accept current blocking feel or a support footprint. Durable design updates remain queued for the return branch.

The refined experiment cancels conflicting robot preparation for player walking or jump preparation and rechecks clearance before takeoff. Preparing jumps hold no protected corridor. Airborne protection covers only remaining samples and ends on landing; ordinary body occupancy remains. This is still conservative spatial protection, not minimum timed protection. A yielded robot waits for another explicit experiment jump request; automatic retry/job policy is not implemented.

Validation plan: test competing preparations, a request after robot commitment, early walking entry, late entry, and release on landing. Reuse existing checks for unchanged controls and static ledges. Full `npm run check` passed 78 tests. Added tests cover committed-flight priority, early walking entry without player blocking, and landing release with persistent body collision; the competing-preparations test now asserts robot cancellation. Browser controls showed robot idle while the player completed the competing jump, early walking reaching z=-0.10 with the robot still at x=-1.40, and late entry blocked at z=0.62 with the robot airborne. Screenshots inspected; no browser warnings/errors. Sustained human control feel remains pending.

The following sections retain the original comparison plan and initial evidence; the priority and protection-lifetime behavior above supersedes their descriptions of protection during preparation/recovery and second-request rejection.

Ticket: [Prototype movement conflicts and safe landing behavior](https://github.com/FBakkensen/signal-and-shelter/issues/32).
Return branch: `codex/deterministic-simulation-foundation`.
Clean starting commit: `28f95cc025639e5ee3f663642dccffdf732432cc`.
Experiment archive branch: `codex/movement-conflicts-prototype`. The accepted snapshot is committed and pushed before returning to the design branch; the resolution ticket records the verified final commit. Never merge this branch.

## Question and representative foundations

Does protected jump completion justify temporarily blocking entry or declining steering? Compare crossing jumps, walking into a robot's landing and stopping, and steering toward a stationary actor. Separately inspect clearance and full support against ledge width.

Every flight is calculated by the existing `createSimulation` interface. Execution consumes those exact samples. Free walking also calls the same simulation. The prototype reuses existing collision dimensions and WASD mapping internally in play and the production third-person camera. Render fixtures reproduce the dimensions in `scene.ts`: 550 mm torso width, two 180 × 220 mm feet with centres 340 mm apart, and the existing 600 mm square / 1,800 mm high clearance body. The visible feet span 520 mm; the body and visible mesh are already different shapes. The full 600 mm square cannot fit on a 500 mm shelf. This does not diagnose the earlier traversal report or select smaller feet.

Controlled differences, recorded before implementation in the ticket:

- Flat ground at y=3 m isolates actor conflicts. Ledge inspection is a static 500/1,000 mm shelf and offset control; it is not a traversal experiment. No terrain steps, low obstacle traversal or gap jumps are validated here.
- Baseline floating-point physics at 120 Hz, 4.3 m/s and its 1.25 m apex remain. This is not the accepted integer foundation or numeric migration. Preparation/recovery last 14 baseline steps, equal to 7/60 s.
- An experimental coordinator treats other actors as non-supporting bodies, checks relative swept boxes per sample, and rejects unsupported walking/completions using the whole existing square terrain footprint. It adds no general support-union implementation for solids.
- Protected mode conservatively keeps the sampled remaining trajectory clear throughout flight and recovery. It does not implement a timed reservation schedule. Stationary occupancy remains after protection ends. It can restrict more than a future timed coordinator would.
- Immediate mode blocks ground movement against occupied bodies. If a flight encounters a body it halts this experiment before overlap and explicitly labels this a policy failure, not a valid airborne wait. This result only rejects this naive immediate policy; it does not prove all reactive alternatives impossible.
- Stable player-first update order is a fixture choice. There is no fairness, retreat, route planning, job policy or general traffic progress guarantee.
- Jump buttons deliberately schedule flights for the experiment; they are not proposed gameplay bindings or automatic traversal triggers. Flight release follows the chosen trajectory. Steering recomputes completion through the same simulation with baseline full directional authority; final limited steering and preparation cancellation design are outside this study.
- Avatar dimensions are reproduced as an explicit visual fixture, with axis-aligned bodies and no gait animation. All actors use the existing humanoid body, not an approved future robot design.
- There is no 1,000-actor, determinism, performance or background-lifecycle claim.

## Run and validation plan

Run `npm run prototype:conflicts -- --port 5173`, then open `http://127.0.0.1:5173/movement-prototype.html`. Normal game entry is separate and unchanged. `npm run check` validates TypeScript, package boundaries, ESLint, executable tests, formatting and the normal game build. The development prototype is served by Vite and is not included in the normal production build.

| Check                | Action and expected evidence                                                                                                | Result                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Shared movement      | Compare every planned sample to direct production simulation execution                                                      | Automated pass                                                                   |
| Crossing             | Start both flights; protected mode declines the second; immediate mode reports failure before overlap                       | Automated + browser pass                                                         |
| Landing entry        | Start robot, move player toward its landing, release walking; protection blocks entry, immediate handling fails later       | Automated + browser pass                                                         |
| Stationary occupancy | Continue after recovery; neither actor moves without input and occupied landing still blocks walking                        | Automated pass; browser showed both idle at their retained positions             |
| Steering             | Apply diagonal input toward stationary robot; protection declines unsafe changes, immediate variant reports contact failure | Automated protected case + browser both policies                                 |
| Pause                | Pause freezes state; one-step increments once; resume retains preparation                                                   | Automated pass; browser pause and one-step (1434 → 1435) pass                    |
| Support              | Compare full footprint against 500 mm shelf and broad shelf                                                                 | Automated pass; browser 500/1,000 mm and 600 mm offset inspections pass          |
| Presentation         | Inspect desktop and 390×844, zoom using wheel, read browser errors                                                          | Inspected, no warn/error messages                                                |
| Held controls        | Drive sustained WASD and judge timing/steering feel                                                                         | Pending human playtest; tool's discrete D press produced no visible displacement |

## Evidence and limits

`npm run check` passed: 75 tests, including seven new experiment tests. The normal build retains its existing large-bundle warning. The initial sandboxed Node test runner failed without assertion details; the unsandboxed run executed all assertions. One initial steering fixture did not intersect the occupied landing; correcting its stationary actor position made the intended conflict reproducible. No test or lint rules were weakened.

Integrated Chromium browser, desktop 1280×720 and narrow 390×844:

- Protected crossing declined player takeoff while the robot proceeded.
- Immediate crossing halted at tick 36, player (0.00, 0.58), robot (-0.61, 0.00), before overlap.
- Protected landing entry blocked at player z≈0.62; robot reached x≈1.40, z=0 and remained there. Immediate entry allowed the player to stop at z≈0.05, then halted the robot at tick 75 before overlap.
- Protected steering displayed the declined-steering reason in both the status and log. Immediate steering accepted the requested change, then halted at tick 78 before contact.
- Pause and single-step operated through visible buttons. Scroll zoom changed the scene framing. Static shelf width and offset controls changed support feedback; full-square overhang was visible. Narrow layout stacks the view over the controls and remains scrollable.
- Browser warning/error log was empty. A short D key event showed no displacement, so no held-control or full camera-orbit validation is claimed. Guided scenarios generate their documented movement sequences through the study controller, not browser-tool state injection.

The user accepted the refined conflict behavior after the priority refinement. Archive this experiment and carry the accepted behavior and evidence pointers back to the design branch. Do not promote a support footprint, exact reservation representation, or scale claim. The physics decision still owns those unresolved details.
