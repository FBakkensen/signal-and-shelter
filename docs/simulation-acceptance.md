# Shared simulation acceptance

Status: accepted requirements from the wayfinder interview, 2026-09-20. [Define reproducibility and normal-speed scale acceptance](https://github.com/FBakkensen/signal-and-shelter/issues/30) owns the canonical resolution. The protocol below makes those requirements repeatable; no production benchmark or replay evidence is claimed, and production implementation remains behind the foundation migration checkpoint.

## Scope and reference

This gate establishes capacity for **1,000 actively simulated movement actors**, plus the player where the scenario exercises player interaction. Robots and their jobs are not implemented. A benchmark may issue destinations directly, but must execute the production simulation, planner, collision, support, jumping and coordination paths. It must not substitute simplified physics or an idle population. Future robot systems add representative workloads and consume the same overall budget; passing this gate does not establish capacity for complete future robot gameplay.

Chromium is the only supported browser in this gate. Exact per-tick replay must also match Node and Chromium on a second machine. Record exact runtime versions and both machines with results; the second machine is a correctness check, not another performance reference. Firefox, Safari and mobile are outside this gate.

Performance reference: the user's Intel Core Ultra 5 125H (14 cores, 18 logical CPUs), approximately 64 GB RAM (62 GiB usable), Linux/Omarchy machine. Record exact OS, GPU/driver, browser build, display settings, power mode and benchmark commit at execution. These details are not yet a completed benchmark inventory.

## Movement workloads

Use versioned, seeded fixtures with explicit geometry, actor capabilities, starts and destinations. Include three required scenario families:

- Open travel: sustained journeys, mixed headings, region crossings and repeated route requests.
- Traversal: steps and low obstacles that require automatic jumps, with both jump-capable and non-jumping actors on appropriate routes. Exercise preparation, flight and recovery through production physics.
- Congestion: shared crossings and bottlenecks, including player encounters and safe yielding. Include impossible passage cases as correctness checks; a permanently jammed population must not substitute for the active movement load.

Request **100 new destinations per simulation second**, staggered across the population so each actor receives one every ten simulation seconds. Keep the exact tick schedule in the fixture and replay log. Journeys should remain active between requests; report time spent moving, jumping, planning and blocked, plus completed journeys and planning work. Inspect those counters to establish that each fixture exercises its intended load. Fixture routes must not collapse into trivial adjacent destinations or repeated immediate failures.

A separate burst issues destinations to all 1,000 actors on one tick. Deterministic queuing is allowed, but each initial request must receive a valid route result within **300 ticks (five simulation seconds)** in the fixed benchmark scenarios. Do not supersede those requests before measuring completion. A result may establish unreachability under the accepted routing contract; enqueue acknowledgement, cancellation and fabricated failure do not count. This is a route-result deadline, not an arrival guarantee. Continue normal simulation and controls while planning; the existing frame and normal-speed gates still apply to the burst run.

Logical planning budgets and coordination algorithms remain owned by the physics decision. Measure them against these gates; do not make route completion depend on wall-clock timing or worker arrival order to pass.

## Performance protocol

Run the production build, with a 60-second warm-up followed by **three separate ten-minute measurements for every required scenario/view combination**. Use fixed, recorded seeds for the repetitions. Each run must pass individually. The initial repeatable presentation setting is a 1920×1080 viewport at device pixel ratio 1 with the normal visual settings; record it explicitly and retain the setting across comparisons. These are protocol defaults, not claims of support for every screen resolution.

Measure the movement scenarios headlessly to isolate simulation costs, then in Chromium with:

- 100 visible actors in close play, while all 1,000 remain simulated.
- All 1,000 represented in strategic view, while all remain simulated.
- All 1,000 visible in close play as a reported stress case, without an initial performance pass requirement. Correctness still applies.

Pair rendering workloads with identical simulation inputs so visibility cannot change results. Keep benchmark entry points and fixtures outside the normal game route.

| Measure                 | Required result per measured run                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| Simulation progress     | At least 35,640 completed ticks in 600 wall-clock seconds: 99% of the 36,000 expected at 60 Hz |
| Tick cost               | At least 95% of complete simulation ticks cost no more than 8 ms                               |
| Required rendered views | At least 59 frames/second on average; at least 99% of frame intervals below 33.3 ms            |
| Memory                  | Total attributable game memory below 1,000,000,000 bytes; no continuing growth after warm-up   |
| Burst routing           | Every initial request receives a valid result within 300 simulation ticks                      |

Count completed ticks, never tick-number advancement alone. Include all required planning, movement, exploration, invariant checks and observation production in simulation cost; report worker computation and waiting separately so moving work off-thread cannot hide it. Also report maximum tick cost, worst frame interval, pending requests and actual simulation/wall-time ratio. Uncapped headless throughput is supplementary; normal-speed acceptance requires paced execution.

The 99% allowance covers minor pacing jitter, not authorization to skip ticks or lower the configured rate. Explicit pause, suspension and deliberate overload are separate lifecycle tests, not exclusions silently subtracted from an ordinary measured run. Disclose interruptions and rerun an interrupted measurement.

Sample memory throughout the run, including workers and attributable rendering allocations. JavaScript heap alone is insufficient for the total-memory claim. Use an isolated browser process tree and document the accounting method and baseline; conservative whole-process accounting is acceptable. If attribution or GPU accounting is unavailable, report the limitation and leave the total-memory gate unverified. Compare post-collection retained-memory troughs over repeated workload cycles; sustained growth requires investigation rather than a pass based only on remaining below the cap. Do not force collection during timed measurements to conceal natural pauses.

The 8 ms threshold reserves some time for other work; it is not a guarantee that future systems will fit. When adding jobs, power, gathering or other gameplay, extend the workload and remeasure combined costs.

## Correctness and replay evidence

Run the same versioned initialization and tick-addressed commands in Node, reference-machine Chromium and second-machine Chromium. Compare canonical exact state bytes/fields at **every completed tick**, including residues, random state, command ordering and authoritative planning/coordination progress. Report the first mismatch with reproducible inputs. A digest alone is insufficient. Separate expensive full-state replay comparison runs from timed performance runs; retain production invariant checks in the timed build.

Required coverage includes:

- All-heading table bounds, reproducible table recipe/checksum, random golden vectors, signed rounding, stops/reversals, region crossings, overflow rejection and blocked-axis residues from the accepted numeric design.
- Seeded generation equality, command ordering, callback batching, worker completion reordering and safe cache rebuilding. Different presentation/visibility must preserve identical gameplay state.
- Production-interface generated command sequences and explicit support, body clearance, swept collision, jump and landing edge cases. Include differing actor capabilities, multiple surface heights, dynamic occupancy, invalidated routes and planner/execution agreement, using the final physics invariants.
- Safe contention/yielding, no overlap or actor-provided support, no player pushing or teleporting, and valid impossible-traffic outcomes. Fairness checks follow the physics decision rather than inventing job policy here.
- Invalid-state injection through test boundaries: halt without committing the invalid transition; preserve the last valid state, failing commands, versions and diagnostics sufficient to replay the fault. Ordinary blockage must not halt the simulation.

Check in explicit fixture seeds, commands, expected outcomes and a bounded generated-sequence corpus. Preserve and minimize failures into regression cases. Record corpus size and tick counts with results; passing a finite corpus is evidence, not proof of every possible execution.

## Host and interaction evidence

Test overload, callback gaps around the accepted 100 ms threshold, freeze/resume, hidden tabs, focus loss, explicit pause and live terminal behavior. Assert the accepted credit cap, lack of skipped simulation work and lack of suspension catch-up. Hidden-tab execution is best effort, not a 60 Hz acceptance promise. Mocked host-clock tests establish policy; real Chromium lifecycle interactions establish integration and record platform limitations separately.

Exercise direct movement, destination replacement, pause/resume during traversal, terminal controls, zoom changes and player/actor encounters through real integrated-browser interactions, with visual inspection. Frame counters and timing captures establish performance; screenshots alone do not. Missing browser capabilities or a missing second machine leave the associated evidence pending, not implicitly passed.

## Handoff and outstanding work

Future implementation must add executable replay/benchmark commands to project configuration and document verified usage in the README. Existing `npm run check` and `npm run dev -- --port 5173` remain the project verification and interactive entry points; no new benchmark command exists yet.

Publish the commit, configuration, fixture versions, raw per-run measurements, replay comparison results, interaction evidence and unresolved failures in `docs/testing/`. The physics decision must settle its invariants before those tests can be finalized. The foundation migration checkpoint must sequence implementation and evidence collection. Failure requires diagnosis and a new explicit decision if a target must change; no silent relaxation of correctness, workload or performance thresholds.
