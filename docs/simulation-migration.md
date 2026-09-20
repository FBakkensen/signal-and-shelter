# Foundation migration plan

Status: accepted by the user, 2026-09-20. [Accept the foundation migration sequence and implementation gates](https://github.com/FBakkensen/signal-and-shelter/issues/31) owns the resolution. The planning map is complete; production implementation requires separate subsequent authorization. No production correctness, replay or capacity gate has passed through this approval.

## Contracts and evidence

Implement the accepted [simulation contract](simulation-contract.md), [numeric rules](numeric-design.md), [physics contract](physics-design.md), [navigation experience](navigation-design.md) and [acceptance protocol](simulation-acceptance.md). The four approved experiments linked from the physics contract are sufficient bounded design evidence; no further pre-contract prototype is required on current evidence. Their source branches, including the withdrawn traversal implementation, remain archives and must never be merged.

Start production work from baseline `3929c5b` or its verified production successors, carrying the accepted design records separately from experiment source. Retain the existing normal game until the coherent cutover below. Tests and benchmarks execute eventual production interfaces; fixtures, comparison controls and benchmark entry points stay outside the normal game route.

## Accepted sequence

### 1. Build and verify the headless foundation

Implement bounded integer arithmetic, direction tables and random streams first, then deterministic versioned island geometry and initialization. Build exact support/contact checks and shared trial/execution, region migration, joint movement and protected continuations. Compose these into atomic ticks with ordered commands, authoritative exploration/discovery and interaction effects, observations, canonical replay and fault diagnostics.

Use the physics module's initialize, advance and trial interface. Indexes and caches remain private; snapshots retain work progress and every value that affects later gameplay. Select numerical logical-work quotas through implementation measurements, version them and hold them fixed within each run. Cache or worker timing must not change completion ticks.

Entry into browser cutover requires passing production-interface tests for the migrated headless behavior: arithmetic/reference comparisons and all headings, negative region crossings and overflow, full support and exact sweeps, clipped and simultaneous motion, safe landing/steering, trial/execution equality, invalidation and atomic fault handling. Exercise ordered commands, per-tick exploration/interactions, generation equality and exact replay in Node and reference-machine Chromium. Begin representative small measurements now; they do not replace the final scale protocol.

The existing game may remain the sole authority for its own runs while the new module is developed and tested separately. Never run old and new physics as competing authorities over one live game state.

### 2. Switch normal play together

Complete [Implement automatic keyboard traversal with shared movement capabilities](https://github.com/FBakkensen/signal-and-shelter/issues/22) through one coherent cutover of generation, movement, commands, exploration, interactions and host lifecycle. Intermediate commits may prepare adapters; the delivered playable increment uses only the new authoritative simulation.

Rendering, picking, fog, atlas, avatar and camera consume observations of the same geometry and completed state. Translate camera-relative input and selected targets into recorded commands; remove old direct gameplay mutation, floating movement advancement and silent spawn recovery. Preserve accepted camera, selection, interaction ranges and exploration behavior. Integrate the selected narrower visual feet without deriving physics dimensions from meshes.

Deliver automatic traversal, remove manual jump/sprint/sneak, and use seven complete preparation and recovery ticks at 60 Hz. Implement explicit pause, preserved traversal on resume, live terminal, focus-loss input clearing, background best-effort execution and the accepted suspension/overload policy together. Restart and seed replacement begin fresh reproducible runs.

Gate: production-code coverage, `npm run check`, and real integrated-browser interactions/visual inspection under [testing](testing.md), including seeded-island traversal, exploration, terminal, pause in every traversal phase, reset, camera/atlas and lifecycle. Record real scheduling limitations separately from mocked-clock policy evidence. Remove obsolete authoritative paths and inspect imports/routes for experiment leakage before handoff.

### 3. Resume click-to-move on the verified foundation

After the preceding core and playable gates pass, complete [Implement time-aware click-to-move and complete navigation integration](https://github.com/FBakkensen/signal-and-shelter/issues/23). Use the same physics transition for feasibility and execution, deterministic planning budgets and the accepted explored-ground, destination replacement, nearest-reachable and failure-recovery rules. A finite traversal-family miss is not proof of global unreachability.

Gate: production planner/execution and deterministic-work tests, route replay, `npm run check`, integrated-browser destination/lifecycle interactions at both zoom levels and human play feedback required by the existing navigation increment. Measure growing populations during development. Final capacity acceptance cannot precede this planner: the benchmark requires production routing, not a substitute.

### 4. Verify the combined system

Execute the full [acceptance protocol](simulation-acceptance.md) against the integrated production commit. Compare exact state at every completed tick in Node, reference-machine Chromium and second-machine Chromium, including visibility changes, cache rebuilding and any worker reordering. Complete all remaining invariant, generated-sequence, invalidation and lifecycle coverage.

Retain all movement-load, route-result, simulation, rendering and memory gates: 1,000 active actors, 100 destination requests per simulation second, the 1,000-request burst with results within 300 ticks, and every required scenario/view combination. The protocol requires a 60-second warm-up and three ten-minute measurements per combination, at least 35,640 completed ticks per run, 95% of ticks within 8 ms, average 59 FPS with 99% of frame intervals below 33.3 ms in required views, and attributable memory below 1,000,000,000 bytes without continuing growth. Its full accounting and workload rules remain authoritative.

Congestion fixtures provide explicitly scripted yielding/retreat intents through production physics. They must retain active movement and planning load; permanent jams, trivial routes or fabricated failures cannot satisfy the gate. This establishes physical safety and movement capacity, not autonomous fairness or robot-job capacity.

Publish verified executable replay/benchmark commands in project configuration and README, and commit-specific raw measurements, versions, fixtures, replay comparisons and browser evidence in `docs/testing/`. Missing second-machine, browser or total-memory evidence leaves the corresponding gate pending. A failure requires diagnosis; changing a target requires an explicit decision, never silent relaxation. Smaller early measurements do not waive final runs.

## Handoff and completion

Planning completion and implementation completion are separate. This plan closes the foundation design map. After separate production authorization, stages 1–2 supply the first existing navigation increment, stage 3 supplies its second increment, and stage 4 gates the combined foundation migration's completion. Navigation may resume before final scale acceptance because its production planner is required to obtain that evidence.

Robot job and autonomous movement-policy design remain separate future work. They may rely on the accepted command, capability, physical-safety and movement-outcome contracts as design inputs, but cannot claim an implemented foundation, autonomous fairness or combined job-workload capacity from this approval. Neither is a new prerequisite for migration.

Validation of this planning handoff: repository/tracker review and clean diff checks; commit hooks passed formatting, TypeScript checking and all 68 existing tests. No application changes, new gameplay experiment, browser test or performance measurement was performed. Existing baseline tests do not validate the planned foundation.
