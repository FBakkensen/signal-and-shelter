# Shared physics and movement coordination — working design

Status: in progress, 2026-09-20. [Define shared physics and movement coordination invariants](https://github.com/FBakkensen/signal-and-shelter/issues/29) owns this decision. This is design analysis, not accepted implementation. The user has not accepted reservations; their cost and restrictions need justification. On 2026-09-20 the user requested prototype evidence before deciding, then explicitly clarified that this session must chart that work rather than build it. [Prototype movement conflicts and safe landing behavior](https://github.com/FBakkensen/signal-and-shelter/issues/32) owns that future experiment. Support dimensions also remain unresolved; the user has not selected a smaller footprint.

## Established constraints

Carry forward the [simulation contract](simulation-contract.md), [numeric design](numeric-design.md) and [navigation experience](navigation-design.md). Standing requires full coverage of an actor-specific support footprint, separately from full-body clearance. Actors block one another and do not provide standing support. Movement cannot resolve conflict by overlap, teleportation or involuntary player displacement. Direct input, route planning and execution use the same physics. Airborne steering is limited; a normal blockage must remain a valid simulation state.

## Geometry evidence

Read-only inspection of the current production baseline found a world-axis-aligned 600 × 600 mm player collision footprint and 1,800 mm standing height. The visible body is smaller and is not the collision shape. Current terrain uses 500 mm cells; authored solid boxes also contain finer dimensions. Physical scenery has axis-aligned faces, including layered ship boxes and overlapping parts.

The current `canStandAt` tests clearance without support. Current landing support accepts any horizontal overlap with a surface; four-corner sneak checks do not establish coverage of the footprint interior. Neither behavior meets the accepted support contract. These are source findings, not a new reproduction of the original blocked spot.

A fully supported 600 mm square cannot stand entirely on an isolated 500 mm-wide shelf. A separately specified smaller support footprint could fit while the full body overhangs, provided body clearance holds. The accepted contract allows those shapes to differ but has not selected their dimensions. Do not change support rules to compensate for a bad trajectory or silently shrink the footprint.

## Safety questions must precede mechanisms

A trajectory that was valid at takeoff is not necessarily valid after another actor moves. Checking for overlap at the next tick detects an immediate conflict but does not establish that the airborne actor can still finish safely. A correct dynamic design must preserve at least one legal continuation, or explicitly relax a gameplay requirement. The following are logical counterexamples, not executed tests or performance results.

| Candidate                                        | What it establishes                                                          | Counterexample or outstanding obligation                                                                                                                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Collision checks for the next tick only          | Immediate non-overlap if swept checks are correct                            | Another actor occupies the only landing while the jumper is airborne. Stopping horizontal movement can leave no supported landing; freezing in the air would introduce a new movement rule. |
| Protect the landing only                         | The destination may remain available                                         | Two jumps cross before either lands. Their bodies conflict in flight even though their destinations differ.                                                                                 |
| Protect one spatial volume for the whole jump    | A conservative exclusion zone can preserve the path                          | Actors are blocked from space long before or after the jumper needs it. This is an intentionally coarse comparison, not the recommendation.                                                 |
| Commit exact swept body space at relevant ticks  | Separates actors in both space and time along a known continuation           | Must include post-landing occupancy, stopped walkers, and safe steering changes. Cost depends on local density, trajectory duration and indexing; it is unmeasured.                         |
| Retain a safe fallback and replace it atomically | Steering can change the plan without discarding its previous safe completion | Still needs other actors to respect the retained continuation. It does not remove coordination; replacement validation and search add work.                                                 |

Reservations are one representation of future constraints, not an additional set of physics rules. Whatever representation is selected, its occupied space must derive from the exact same movement and body-clearance calculations used to execute ticks.

## A narrower candidate to evaluate

Do not reserve complete routes or global island cells for every actor. Consider protecting only movement that cannot safely stop immediately, plus its supported endpoint. Ordinary ground movement remains interruptible and is checked against current occupancy and committed continuations. Route intent alone creates no right to future space.

A committed continuation must end at a supported, non-overlapping position that can remain occupied. Releasing protection at the arrival tick is insufficient: the actor may stop there during recovery or indefinitely. A later departure may release space only when that departure is itself safely committed. Likewise, do not assume a walking actor will vacate a future landing merely because its current input says to move.

Limited airborne steering can propose a replacement continuation. Validate the replacement with the same physics and acquire its required space before releasing the old continuation. If that fails, retain the old safe continuation. This implies a concrete gameplay restriction: some airborne steering requests cannot be followed. It remains a proposal, not an accepted change to steering behavior.

Player priority may select between uncommitted requests and induce safe robot yielding. It cannot revoke a continuation if doing so strands an airborne actor. This creates possible brief player blocking, which the user has not accepted yet. Fair robot contention and impossible-traffic reporting remain separate open branches.

Spatial indexing should restrict consideration to nearby overlapping bounds, then evaluate exact time-aware conflicts. No linear scan of all actors or all solids is justified as the final design. Indexing is an optimization, not evidence of normal-speed capacity: representative measurements remain mandatory.

## Decision tree still open

1. Actor support dimensions and exposed-surface coverage, independent of visual shape.
2. Dynamic movement safety: acceptable player blocking and steering restrictions; representation and cost of future constraints.
3. Integer trajectory, swept contact, landing and edge-transition rules; planner/execution equivalence and direction conversion.
4. Deterministic contention, yielding/retreat, stable fairness and bounded search without job-policy decisions.
5. Pause/resume and interrupted preparation semantics consistent with already accepted lifecycle rules.
6. Small shared interface, geometry/capability invalidation, diagnostics and representative experiment requirements.

The decision cannot be marked accepted while these branches remain open. No gameplay code or runtime tests were changed for this analysis.
