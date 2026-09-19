# Shared simulation contract

Status: consolidated proposal for [Agree the simulation contract and migration boundaries](https://github.com/FBakkensen/signal-and-shelter/issues/27), 2026-09-19. Individual user agreements below are confirmed; the proposed authority/command/migration details await consolidated approval. This document does not authorize implementation or claim current compliance. The issue's eventual resolution is the canonical decision.

## Confirmed requirements

- For the same versions, initialization and ordered commands, every completed simulation tick produces identical gameplay state across supported browsers and machines. Island generation is included: the same seed and generation version produce identical gameplay geometry. Visual interpolation is excluded.
- Simulation time uses integer ticks; positions use smaller integer units that permit stopping between voxel centres. Exact arithmetic, bounds, rounding and units belong to the numeric decision.
- Under overload, simulation time slows without skipping work. Actual browser/OS suspension resumes from the last completed tick without wall-clock catch-up. Background play continues while the runtime permits execution. Explicit pause freezes simulation.
- Headless TypeScript simulation, presentation and host integration are separate. Desktop packaging remains an option, not a migration decision.
- One authoritative physics contract validates and executes movement for player input, route planning and robots. Full support of an actor-specific feet/base footprint and clearance for its body are distinct requirements. No centre-only shortcut.
- Actors physically block one another, cannot provide standing support, and never overlap or teleport to resolve traffic. Robots safely yield to the player without pushing or moving the player automatically. They may retreat/detour while retaining destinations; deterministic fair coordination handles contention. Impossible traffic stops/reports without claiming guaranteed progress.
- An unexpected invalid internal state pauses the simulation and preserves reproducible diagnostic evidence; tests fail on the same violation. Ordinary movement blockage remains a valid state and does not pause other actors. Detection coverage is not a claim that all defects can be detected automatically.
- Restarting or changing islands begins a new reproducible run. Each run records versions, initialization inputs and ordered gameplay commands; failed-run diagnostics remain available. Storage/retention details are not settled here.
- The scale target is 1,000 simultaneously active simulated robots at normal game speed on documented reference hardware, including route requests, movement, jumps and congestion. Simulated population and visible population are independent workload dimensions. Visibility must not change gameplay outcomes. Slowdown is an overload fallback, not a passing benchmark.

## Proposed authority and command contract

The simulation owns every value that can affect future gameplay: island gameplay geometry, actors and capabilities, movement progress, occupancy, exploration, discoveries, interaction results, and any future gameplay counters or random state. Derived indexes/caches may be omitted from authoritative snapshots only if rebuilding them cannot change outcomes or the tick on which gameplay results become available.

Presentation owns camera framing, visual interpolation, animation and purely visual selection/menu state. Host integration owns browser events, lifecycle signals and delivery of commands. Neither directly changes authoritative gameplay fields.

Translate input into explicit simulation commands: camera-relative movement becomes a defined gameplay direction; interaction selection becomes an explicit target. Record the resolved gameplay command so replay does not need camera rendering, raycasts or DOM state. Simulation validates the request against current authoritative state. A normal rejected request produces an explicit outcome without corrupting state; existing accepted nearest-reachable routing remains a defined command behavior, not an arbitrary substitute action.

Every command has an assigned simulation tick and stable ordering. External callbacks and worker completion order cannot decide gameplay ordering. All gameplay changes within a tick follow a defined deterministic sequence, including movement, exploration and interactions. Pause/resume controls whether subsequent ticks execute; it must not deadlock behind the advancement it pauses. Exact ordering, tick rate and lifecycle mechanics belong to the numeric/tick decision.

Gameplay randomness is explicit, seeded and reproducible, with owned state and stable consumption rules. Host randomness may select a new island seed, but the selected seed becomes recorded initialization input. Visual randomness cannot affect simulation. Exact generator/stream algorithms belong to the numeric decision.

A valid completed tick is the observable gameplay result. On an invariant violation, halt before accepting further gameplay work and retain the last known valid state plus the failing transition evidence. The fault must not be presented as an ordinary blocked request. Exact diagnostic capture, checking strategy and memory costs belong to the physics/validation decisions.

Tests, headless benchmarks and the interactive game exercise the same simulation interface. Planner feasibility and execution use the same physics contract; any cache or optimized planning representation must preserve that contract. Dynamic changes require revalidation or explicit safe failure, not promised success based on stale geometry.

## Existing systems that must migrate

Read-only inventory against production baseline `3929c5b`; no new tests or performance measurements were performed for this inventory.

| Area                                     | Current evidence                                                                                                               | Required migration                                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Island generation and collision geometry | `island/lib/world.ts` uses seeded hashing plus floating/trigonometric terrain calculations; solids derive from authored blocks | Defined deterministic gameplay geometry and numeric representation, validated across supported runtimes                         |
| Movement and support                     | `play/lib/game.ts` and `collision.ts`; `simulation.ts` standability currently delegates to clearance                           | Shared movement/support contract, integer authoritative quantities and explicit invalid-state handling                          |
| Whole-tick progress                      | `game.ts:186–198` reveals exploration after an outer call's physics batch                                                      | Exploration/discovery advance in the defined simulation sequence, independent of callback batching                              |
| Input and interactions                   | `application.ts:250–252` directly mutates link result; `280–288` applies look once per outer call                              | Recorded explicit gameplay commands and simulation-owned effects; presentation stays responsive without writing gameplay state  |
| Lifecycle and host clock                 | `main.ts` uses capped render deltas and pauses on blur/hidden; game also caps accumulated time                                 | Agreed overload, suspension, explicit-pause and live-terminal semantics through host/simulation separation                      |
| Invalid-position handling                | `game.ts:161–181` silently recovers to spawn; existing tests assert it                                                         | Halt/report invariant violations, with tests updated to the approved behavior                                                   |
| Verification                             | Existing headless entry and production-interface tests are useful foundations                                                  | Replay/state comparison, generated sequences, invariants, migration regressions and independent simulation/rendering benchmarks |

No robot jobs, gathering, resource transfers, saves, runtime gameplay PRNG, or replay system currently exist. They are future consumers or new infrastructure, not existing implementations to rewrite. Keep visual assets and accepted camera behavior outside the migration unless a demonstrated dependency requires a specific change.

## Proposed gates and ownership

This ticket approves the project-wide contract and migration scope only. It does not select units, tick rate, physics algorithms, spatial indexes, scheduling implementation, support dimensions, runtime matrix or hardware budgets.

- [Choose deterministic numeric and tick semantics](https://github.com/FBakkensen/signal-and-shelter/issues/28) owns arithmetic, generation, command ordering, random-state semantics and lifecycle timing.
- [Define shared physics and movement coordination invariants](https://github.com/FBakkensen/signal-and-shelter/issues/29) owns support, swept movement, planning/execution agreement, dynamic occupancy and safe/fair coordination.
- [Define reproducibility and normal-speed scale acceptance](https://github.com/FBakkensen/signal-and-shelter/issues/30) owns the runtime/hardware matrix, workloads, evidence and performance thresholds.

After those decisions and any needed experiments, agree a concrete migration sequence and acceptance checkpoint before authorizing production work. Existing navigation and robot-job work remains dependent on the foundation map. The withdrawn implementation is an evidence archive, not a starting implementation to merge. Detailed job selection, retry and abandonment policy remains in the separate robot-job effort.
