# Shared physics and movement coordination — working design

Status: partial decisions accepted during the 2026-09-20 interview; engineering proposal incomplete. This document is a working checkpoint, not a resolved contract or authorization for production implementation. [Define shared physics and movement coordination invariants](https://github.com/FBakkensen/signal-and-shelter/issues/29) owns physical validity and committed-motion safety. [Design autonomous robot job selection and blocked-job recovery](https://github.com/FBakkensen/signal-and-shelter/issues/21) and [Design movement decisions and replanning under emergent congestion](https://github.com/FBakkensen/signal-and-shelter/issues/35) own the connected decision policy. Historical coordination preferences below are inputs to those tickets.

Read with [simulation contract](simulation-contract.md), [numeric design](numeric-design.md), [acceptance gates](simulation-acceptance.md), and [navigation design](navigation-design.md). Those accepted contracts remain binding.

## Accepted behavior

### Individual movement capabilities — clarified 2026-09-20

The roughly 1.25 m apex cap is accepted as the current humanoid prototype starting value. It limits height above takeoff, separately from that humanoid's 1 m up/down landing-elevation limit. Exact representable trajectory tuning still requires validation.

All actor-specific physical dimensions, speeds, jump availability/limits, preparation/recovery and alignment settings belong to that individual actor's movement capabilities. Type defaults may initialize them; different individuals of the same type may have different effective values, including future upgrades. The 440 mm support width, 600 mm clearance width, 70 mm/tick walking speed, 1 m elevation limit, roughly 1.25 m apex cap, seven-tick phase durations and 250 mm alignment cap discussed here describe the current humanoid configuration, not constants for every robot or humanoid.

Shared physics enforces the same support, clearance, non-overlap, determinism and safe-completion rules using each actor's effective values. Planning and execution read the same individual capabilities. Include effective values and any version needed for cache/plan validation in authoritative state and replay; never resolve them from rendered meshes. Capability changes require invalidation/revalidation. On 2026-09-20 the user clarified that upgrades happen at a designated station while stationary, not during movement. The ship is a possible station, not a selected location. Do not queue an upgrade through a committed jump; movement is ineligible for upgrading. Exact station interaction and validation of changed dimensions remain future design. Prepare to record individual values now; do not build upgrades or robot gameplay in this map.

### Geometry and support

Physics defines what is possible independently of rendering. Visible meshes and animation never determine authoritative dimensions. The user wants deliberate alignment of appearance and physics in the humanoid feet case.

The humanoid's support footprint is a 440 × 440 mm square fixed to the world axes. Facing and walking animation do not rotate or resize it. Its whole area must be supported at a valid standing position; a centre or corner-only test is insufficient. The separate horizontal full-body clearance remains 600 × 600 mm. A 500 mm ridge with open sides can support the humanoid; a 500 mm passage between solid walls cannot clear it. This interview has not newly selected body height.

The accepted visual variant B has a 440 mm total foot span, 160 mm individual width, centres at ±140 mm and the retained 220 mm depth. Its appearance does not imply that physical support is two animated foot meshes. [Prototype evidence](https://github.com/FBakkensen/signal-and-shelter/blob/a03f661feb780137fd5c4a05ac700fb1f5c9d417/docs/testing/feet-stance-prototype.md) is a visual comparison, not traversal validation.

### Ground movement and traversal

- A wall blocks its normal movement component while permitting safe tangential movement. Do not boost tangential speed. The accepted blocked-axis residue rules apply.
- Stop at an unsafe edge instead of permitting an uncontrolled fall. Use automatic traversal when a safe descent exists within the accepted 1 m elevation limit. Tangential edge movement still requires full support and body clearance.
- Jump only as high as needed to safely clear the obstacle. Smaller hops may fit under lower ceilings only if the whole body clears the complete trajectory.
- On small platforms, prefer a target near the centre of the safe landing area over the earliest fully supported edge position. Stay within the accepted jump/alignment limits and preserve full-body clearance and occupancy. This does not request travel to the centre of a large surface.
- For the same landing, choose the lowest safe jump first, then the fastest safe horizontal speed at that height. Route costs use the resulting duration; this does not override route-level fastest-path selection.
- A planned jump may use lower horizontal speed to avoid overshooting a supported landing, equally for player and robots. If no safe trajectory exists, remain before takeoff.
- A small automatic sideways adjustment may align a safe landing while continuing toward the intended direction. This is supported, collision-checked movement, never a snap or teleport. Its accepted starting lateral limit is 250 mm from the start of the alignment attempt; if a larger correction is needed, stop and let the player reposition. It does not authorize arbitrary detours.
- Finish alignment before beginning the seven-tick preparation. Then execute flight and the seven-tick recovery. Route cost includes all four phases. Alignment rate and flight arithmetic remain open; the 250 mm starting limit still needs movement validation.
- During landing recovery the actor remains stationary for its configured duration (currently seven ticks for the humanoid). New input updates subsequent intent but cannot shorten or skip recovery. Flight protection has ended; body occupancy persists.
- Changing direction or releasing direct movement cancels alignment/preparation. The accepted separate explicit-pause preservation rule still applies: clearing host-held keys for pause must not be mistaken for an ordinary release that cancels established traversal.

### Actor coordination

#### Scope correction — 2026-09-20

The user challenged the interview's assumption of identifiable passages and queues. Congestion can emerge anywhere and at any time from generated geometry, actor movement and, in future, building or modifiers. No pre-labelled bottlenecks, stable conflict identities or queue-detection algorithm have been accepted. References below to passages, crossings and junctions describe examples and behavioral preferences, not a known partition of the island.

Detecting interference, deciding when to wait/retreat/replan, and avoiding repeated mutually disruptive decisions require a coherent movement-decision design. The earlier question about merging/splitting queues was not accepted; the assistant's subsequent claim that it was merely a settled engineering detail was premature. Keep the accepted fairness intent, safe retreat permissions and jump protection as constraints, while treating their operational conflict model as unresolved.

Accepted scope split: move both job decisions and emergent movement decisions out of the physics ticket. Reuse the existing job-decision ticket and connect it to the new movement-decision ticket as future work outside this wayfinder. The job ticket first establishes the intent and constraints movement decisions need; movement outcomes feed back into job reconsideration. Exact information exchanged remains to be designed together. Physics retains validity and committed-motion safety. Neither decision ticket blocks this map’s migration checkpoint. The assistant’s earlier addition of both tickets to the map was unauthorized and has been removed. Physical-safety and existing validation obligations remain; any mismatch with benchmark assumptions must be made explicit rather than claimed as validated autonomous policy.

Actors occupy space, never overlap, never support one another, and do not push or teleport to solve traffic. Robots can wait, retreat or detour while retaining their destinations; job selection/abandonment is a separate system.

Robots yield before takeoff; everyone respects a jump already underway. Revalidate before commitment. A committed jump may briefly block entry and decline unsafe steering so it can complete safely. Flight protection ends on landing, while ordinary body occupancy remains. The [accepted conflict experiment](https://github.com/FBakkensen/signal-and-shelter/issues/32#issuecomment-5748276198) establishes behavior, not an exact reservation representation or scale claim.

Among robots that can safely proceed through a contested passage, the longest-waiting gets the next opportunity. Stable ties are deterministic. Necessary retreat preserves waiting priority. A robot with a blocked exit must not prevent unrelated safe traffic. Player priority and committed-flight protection override ordinary robot turn-taking, so there is no bounded-wait promise under continuous player interference or impossible traffic. Precise contention-group definitions and fairness state remain open.

Accepted on 2026-09-20: each successful crossing ends that robot’s turn. The oldest safely eligible waiter receives the next opportunity; following robots do not inherit priority from travel direction. A yielding robot may backtrack to an earlier junction along a verified safe path if the nearest space cannot clear the passage, preserving its destination and waiting priority. If no safe retreat exists, report movement blockage. Exact passage boundaries, retreat search and work limits remain engineering obligations.

Also accepted on 2026-09-20: waiting age belongs to the current passage conflict. Preserve it while yielding or retreating within that conflict; clear it after the actor clears the conflict or abandons that route. A later conflict starts a new wait rather than inheriting accumulated priority. Exact conflict identity and merge/split handling remain to be specified.

A yielding robot may automatically jump to a safe retreat position using its individual capabilities and the normal protected-jump rules, provided that retreat helps clear traffic. Otherwise it waits and reports movement blockage. Yielding does not bypass support, clearance, preparation, recovery or existing committed continuations. Search completeness and progress under general congestion remain unvalidated.

## Existing production evidence

Read-only inspection of the current production baseline found a world-axis-aligned 600 × 600 mm player collision footprint and 1,800 mm standing height. The visible body is smaller and is not the collision shape. Current terrain uses 500 mm cells; authored solid boxes also contain finer dimensions. Physical scenery has axis-aligned faces, including layered ship boxes and overlapping parts.

The current `canStandAt` tests clearance without support. Current landing support accepts any horizontal overlap with a surface; four-corner sneak checks do not establish coverage of the footprint interior. Neither behavior meets the accepted support contract. These are source findings, not a new reproduction of the original blocked spot.

## Safety analysis and candidate mechanisms

A trajectory that was valid at takeoff is not necessarily valid after another actor moves. Checking for overlap at the next tick detects an immediate conflict but does not establish that the airborne actor can still finish safely. A correct dynamic design must preserve at least one legal continuation, or explicitly relax a gameplay requirement. The following are logical counterexamples, not executed tests or performance results.

| Candidate                                        | What it establishes                                                          | Counterexample or outstanding obligation                                                                                                                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Collision checks for the next tick only          | Immediate non-overlap if swept checks are correct                            | Another actor occupies the only landing while the jumper is airborne. Stopping horizontal movement can leave no supported landing; freezing in the air would introduce a new movement rule. |
| Protect the landing only                         | The destination may remain available                                         | Two jumps cross before either lands. Their bodies conflict in flight even though their destinations differ.                                                                                 |
| Protect one spatial volume for the whole jump    | A conservative exclusion zone can preserve the path                          | Actors are blocked from space long before or after the jumper needs it. This is an intentionally coarse comparison, not the recommendation.                                                 |
| Commit exact swept body space at relevant ticks  | Separates actors in both space and time along a known continuation           | Must include post-landing occupancy, stopped walkers, and safe steering changes. Cost depends on local density, trajectory duration and indexing; it is unmeasured.                         |
| Retain a safe fallback and replace it atomically | Steering can change the plan without discarding its previous safe completion | Still needs other actors to respect the retained continuation. It does not remove coordination; replacement validation and search add work.                                                 |

Reservations are one representation of future constraints, not an additional set of physics rules. Whatever representation is selected, its occupied space must derive from the exact same movement and body-clearance calculations used to execute ticks.

## Accepted committed-jump protection direction — 2026-09-20

The user accepted protecting the swept body space needed at each tick of a committed jump, plus its supported endpoint. Include the complete movement between tick positions, not only occupancy at tick boundaries. Other actors may use nearby space when their movement cannot interfere. This selects a time-aware protection direction instead of excluding the entire jump area for the whole flight; exact conflict arithmetic, data structures, congestion behavior and performance remain to be validated.

Do not reserve complete routes or global island cells for every actor. Ordinary ground movement remains interruptible and is checked against current occupancy and committed continuations. Route intent alone creates no right to future space.

A committed continuation must end at a supported, non-overlapping position that can remain occupied. Releasing protection at the arrival tick is insufficient: the actor may stop there during recovery or indefinitely. A later departure may release space only when that departure is itself safely committed. Likewise, do not assume a walking actor will vacate a future landing merely because its current input says to move.

Limited airborne steering can propose a replacement continuation. Validate the replacement with the same physics and acquire its required space before releasing the old continuation. If that fails, retain the old safe continuation. The user accepted this replacement direction alongside time-aware jump protection; it is not yet implemented or validated as a general coordination mechanism.

Player priority may select between uncommitted requests and induce safe robot yielding. It cannot revoke a continuation if doing so strands an airborne actor. Brief player blocking to protect committed flight is now accepted. The detailed fairness and impossible-traffic algorithms remain open under the accepted behavioral rules above.

Spatial indexing should restrict consideration to nearby overlapping bounds, then evaluate exact time-aware conflicts. No linear scan of all actors or all solids is justified as the final design. Indexing is an optimization, not evidence of normal-speed capacity: representative measurements remain mandatory.

## Remaining engineering obligations and ownership

These are design obligations and proposed structure, not newly accepted algorithms.

1. **Coverage and contact:** specify exact area coverage by the union of supporting static top surfaces, including seams, holes and multiple surface heights. Specify touching versus overlap and how safe integer positions are selected from swept contacts. Preserve full support during alignment/walking; airborne states require a verified safe continuation rather than standing support.
2. **Trajectory kernel:** specify integer tick-based velocity/acceleration, adaptive arc selection, reduced horizontal speed, landing detection and bounded steering. Define the candidate search space, completeness limits and deterministic tie order. Do not substitute a planner estimate for executable physics. A trajectory must account for takeoff clearance, intermediate body sweeps and supported landing, not only endpoints.
3. **Alignment bounds:** use the accepted 250 mm maximum lateral displacement from the alignment start, choose its speed, preserve intended forward progress, and include actual duration in costs. Validate cancellation, blocked alignment and repeated intent changes. These numeric tuning choices require representative movement evidence.
4. **Coordination:** specify and validate the accepted time-aware swept-body protection and safe replacement of committed continuations, including stationary actors after landing. Define safe handling of simultaneous physical commitment requests and factual rejection outcomes. The connected job/movement tickets own conflict detection, waiting-age identity, retreat/replanning policy and decision-work budgets. Do not assume an actor will vacate its landing because its flight protection ended.
5. **Geometry/index invalidation:** separate static geometry/capability feasibility from dynamic occupancy. Include relevant versions in reusable results. Rebuilding a cache cannot change the tick a gameplay result becomes available. Revalidate plans and clearance before committing movement; reject upgrades during movement and define safe handling of other invalidations during established traversal.
6. **Interface:** use one headless simulation transition for direct control, planning trials and execution. Callers submit intent, not writable positions or render meshes. Expose read-only observations, ordinary blocked/rejected outcomes and separately typed invariant faults. Keep resumable planning and coordination state authoritative when it affects future ticks.
7. **Lifecycle and validation:** make alignment/preparation/flight/recovery preservation across explicit pause precise, including new input after resume. Define per-tick checks, last-valid-state retention and reproducible failure evidence. Use the accepted focused integer traversal evidence below. Autonomous congestion-policy and combined job/movement experiments belong to the separate future decision tickets. They are not gates for this wayfinder. Retain the foundation’s physical-safety and replay/scale obligations and explicitly reconcile any policy assumptions at the migration checkpoint.

The engineering proposal should resolve the remaining rules without reopening accepted preferences unless concrete conflicting evidence appears. Exact algorithms, bounded work budgets and failure behavior need review before this ticket can close.

## Evidence boundary

Before the adaptive integer experiment, the feet comparison and floating-point conflict archive did not establish one-block integer traversal, adaptive integer jumps or alignment. Their limits remain unchanged. The subsequent accepted integer experiment supplies bounded traversal evidence, summarized under Experiment frontier below; it still does not establish general fair coordination or 1,000-actor capacity.

## Integer trajectory arithmetic investigation — 2026-09-20

Read-only exact arithmetic explored a **proposed, unaccepted** discrete family: integer vertical velocity `v` mm/tick; each tick first advances by the current velocity, then subtracts 7 mm/tick from it. This corresponds to 25.2 m/s², and is a hypothesis for a representative prototype, not a settled tuning value. After `n` ticks, relative height is `n*v - 7*n*(n-1)/2`. These calculations assume straight swept segments between tick positions; a within-tick parabola would be a different contract.

A launch velocity of 115 mm/tick reaches an apex of 1,003 mm; 114 reaches 986 mm. Height alone is insufficient. For a cardinal approach to a vertical 1 m step, the centre must travel at least 520 mm from first possible body entry (300 mm body half-width before the edge) to a fully supported landing (220 mm support half-width beyond it). A centre-of-cell landing needs 550 mm from that first body entry.

At a maximum horizontal speed of 70 mm/tick, the theoretical horizontal distance available while the vertical centre-of-feet path is at or above 1 m is approximately:

| Initial vertical velocity | Apex     | Available horizontal distance |
| ------------------------- | -------- | ----------------------------- |
| 115 mm/tick               | 1,003 mm | 122.5 mm                      |
| 116 mm/tick               | 1,020 mm | 328.27 mm                     |
| 117 mm/tick               | 1,037 mm | 453.13 mm                     |
| 118 mm/tick               | 1,054 mm | 548.20 mm                     |
| 119 mm/tick               | 1,071 mm | 634.00 mm                     |

These are necessary geometric checks, not executed traversals or sufficient conditions. They expose why minimizing height must validate body clearance and landing together, and why reducing horizontal speed can prevent climbing even when it helps avoid overshoot. Diagonal movement must use actual Q24-derived integer displacements and residues, not a continuous-speed approximation.

A prototype needs an explicit velocity/apex cap, safe integer landing/contact selection, exact within-tick sweep convention and a declared candidate family. No candidate found means none within that supported family, not mathematical impossibility for every imaginable trajectory. A naive search over 120 velocities × 71 speeds × roughly 42 ticks approaches 358,000 segment evaluations per heading before geometry work; this is an illustrative count, not a measured cost or proposed production strategy. Candidate generation and reused results need independent scale evidence.

The investigation ran ephemeral reference arithmetic only. It did not execute production movement or modify application code.

## Integer traversal experiment plan — historical checkpoint

The following plan preceded the accepted experiment documented below. Its unaccepted-hypothesis wording records the starting status; see the acceptance and evidence boundary below for the current status.

The representative experiment should exercise a headless integer movement module through the same interface for direct input, candidate validation and actual movement. Existing float-based trajectories cannot validate these new numeric rules. Use controlled courses with the real body/support settings, production input mapping, selected avatar appearance and camera; introduce only the integer kernel and traversal rules under investigation. Keep experiment code on an isolated archive branch.

### State and interface

- Initialize a run from explicit static integer geometry and actors with recorded effective movement capabilities. Each actor carries position, movement residues, phase/timers, original intent, alignment origin, chosen traversal and any committed continuation. No render mesh enters the interface.
- Advance one complete tick with ordered resolved input commands. Return a valid next state plus ordered observations, or a fault preserving the last valid state. A rejected candidate or blocked request is an ordinary outcome, not a fault.
- Candidate evaluation executes the same motion/contact transition on isolated trial state. It cannot change live actors, consume unrelated random streams or publish partial movement. Tests and the browser use the same headless interface.
- Geometry indexes and cached transitions are internal. Reuse is keyed by geometry and effective capabilities, and dynamic occupancy is revalidated. Cached results do not bypass logical planning work or change result timing.

### Initial numeric hypothesis

For the current humanoid only, investigate vertical acceleration of 7 mm/tick², initial vertical velocity selected from nonnegative integer values, and the accepted 1,250 mm apex ceiling. Under the advance-then-accelerate recurrence above, initial velocity 128 mm/tick reaches 1,235 mm and 129 reaches 1,254 mm; these two apex values were verified by an ephemeral integer reference loop, not production motion. The exact highest admissible velocity is derived from this actor's configuration, never a constant shared by all actors. Horizontal speed remains bounded by the actor's walking capability, with lower candidates allowed. These acceleration/trajectory values are **hypotheses**, not accepted tuning or executed traversal evidence.

Inspect the complete swept body path for every tick and every actual contact adjustment, not just endpoints. Decide the exact landing/contact convention before building: a fractional-time contact cannot silently become an unsupported rounded integer position. Landing must have full support and body clearance, and must preserve the declared numeric/residue semantics. Neither snapping to a nearby platform nor freezing in midair is a valid fallback.

### Required courses and observations

1. Cardinal and diagonal rises/drops of 500 and 1,000 mm, including repeated one-block landings. Inspect body clearance, full support and centred landing preference.
2. Small steps beneath low ceilings: show a lower valid hop and a truly blocked case.
3. Near-edge starts, seams between coplanar blocks and a hole inside the support footprint; verify full area coverage rather than centre/corner samples.
4. Alignment inside/outside the 250 mm bound, direction changes and release during alignment/preparation; verify that preparation starts only after alignment completes.
5. Reduced-speed landing candidates, phase duration and exact route cost accounting; compare trial and actual tick states.
6. Two differently configured actors, including a non-jumper, executing the same shared rules. No upgrade UI or robot job behavior.
7. Explicit pause in each movement phase; preserve established traversal while applying the accepted input/lifecycle rules.
8. Focused occupancy conflicts and a stopped actor on a landing; preserve the accepted safe-continuation behavior. General fair traffic and scale measurements remain separate obligations.

Automated tests must execute the new module and compare exact state; interactive browser evidence must cover actual course traversal, controls and visual inspection. A human verdict is required for alignment, hop and landing feel. Do not claim complete physics or capacity from this bounded experiment.

### Experiment frontier

[Validate adaptive integer traversal and individual capabilities](https://github.com/FBakkensen/signal-and-shelter/issues/34) was accepted by the user on 2026-09-20: “this is working as expected.” [The archived experiment and detailed evidence](https://github.com/FBakkensen/signal-and-shelter/blob/473279eba7f809bb17c34757be8e12f724dbbaf1/docs/testing/integer-traversal-prototype.md) are preserved on `codex/integer-traversal-prototype` at `473279eba7f809bb17c34757be8e12f724dbbaf1`; remote commit verified, clean return completed, never merge.

The accepted behavior includes anticipatory early takeoff and vertical-first takeoff when already near a step, adaptive hops, bounded supported alignment before preparation, full supported landings/recovery, and individual movement capabilities. Preserve the previously selected 440 mm support square, separate 600 mm body clearance, humanoid speed/elevation/apex limits, and seven-tick preparation/recovery. The prototype retained 1800 mm body height and tested integer acceleration 7 mm/tick², actor-specific limited steering, and a piecewise-linear final landing segment ending at an integer supported position. These mechanisms now have accepted behavioral evidence, not proof of production completeness.

All 105 tests passed in the archive commit hook, including 36 focused traversal tests and one input-mapping test; prior full project checks and desktop/narrow integrated-browser checks passed. The user supplied the human verdict after the earlier automated held-key/timing limitations. Exact sweeps, rectangle-union support, planned/actual agreement and a coordinate-bound regression provide bounded evidence. The source is an experiment, not production migration.

The shared-physics decision remains open for exact safety mechanisms, indexing/invalidation, validation of stationary capability changes, and the production physics interface/validation design. General fair coordination, conflict detection and decision-work budgets now belong to the connected job/movement tickets; those future tickets do not gate this wayfinder’s migration checkpoint. Assess the prototype's bounded target/trajectory family, conservative occupancy envelopes and landing-segment convention explicitly; do not infer complete routing, full cross-runtime replay or 1,000-actor capacity. Those questions already belong to the existing physics and migration tickets; this acceptance creates no new ticket or implementation authorization.
