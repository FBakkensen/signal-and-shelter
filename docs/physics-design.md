# Shared physics contract

Status: consolidated design resolution, 2026-09-20, following the accepted behavior interview, four accepted experiments and the user's instruction to finish the contract. [Define shared physics and movement coordination invariants](https://github.com/FBakkensen/signal-and-shelter/issues/29) owns the resolution. The engineering rules below complete that design; they do not claim production implementation, general solver completeness or measured capacity.

Read with the accepted [simulation contract](simulation-contract.md), [numeric design](numeric-design.md), [navigation design](navigation-design.md) and [acceptance gates](simulation-acceptance.md). The [migration checkpoint](https://github.com/FBakkensen/signal-and-shelter/issues/31) owns implementation sequence and production evidence. No further physics experiment is required to resolve this design on the evidence currently available. A concrete contradiction may require a new decision; unspecified future hardening does not keep this ticket open.

## Scope and authority

One headless physics module owns valid state transitions for direct control, navigation trials and execution. Callers supply intent; physics owns positions, residues, phase changes, contacts and committed continuations. Rendering never determines geometry or movement capabilities.

[Robot job decisions](https://github.com/FBakkensen/signal-and-shelter/issues/21) and [autonomous movement decisions and replanning](https://github.com/FBakkensen/signal-and-shelter/issues/35) remain connected future work outside this map. They own choosing jobs, detecting operational congestion, waiting priority, retreat, retry and replanning. Congestion may arise anywhere; physics requires no pre-labelled passages or queue identities. Historical fairness preferences remain recorded on those issues and in the interview history, not as an implemented policy in this contract.

## Accepted physical behavior

The current humanoid has a fixed world-axis support square of 440 × 440 mm, separate 600 × 600 mm horizontal body clearance, retained 1,800 mm body height, 70 mm/tick walking speed, 1,000 mm up/down elevation limit, 1,250 mm apex ceiling, seven-tick preparation and recovery, and at most 250 mm lateral alignment from the start of an attempt. Dimensions, speed, acceleration, limits and timings are individual effective capabilities, initialized from type defaults and recorded in authoritative state. A non-jumper uses the same ground rules. The selected narrower visual feet deliberately align with the support dimensions without defining them.

Touching is allowed; positive-volume body overlap is forbidden. A 600 mm body can pass through an exactly 600 mm opening. Actors cannot support or push each other. Ground movement and alignment require full support and clearance throughout; there is no uncontrolled edge fall. An unsafe request stops or slides safely. A 70 mm request meeting a wall after 45 mm advances the safe 45 mm. Preserve unblocked tangential travel without increasing its speed or reusing its movement budget. Discard rejected displacement and clear only genuinely blocked-axis residues.

Automatic traversal uses adaptive hops, early takeoff or vertical-first takeoff where required, reduced horizontal speed where needed, and supported landings. For a given landing, prefer the lowest safe jump and then the fastest safe horizontal speed. Prefer the middle of a small safe landing area; do not invent an invisible body-clearance margin. Supported alignment precedes preparation and counts in route cost. Direction change or ordinary input release cancels alignment/preparation. Recovery is stationary and cannot be shortened by new input.

Uncommitted robot preparation yields to player movement. Everyone respects an already committed flight. Airborne steering may replace a continuation only after the replacement is validated; otherwise the original completes. Flight protection ends on landing, but body occupancy persists indefinitely until an actual safe departure. Upgrades require a stationary actor at a designated station; station gameplay is future work.

## Geometry and exact arithmetic

Use the accepted region/local integer coordinates, Q24 headings and centered residues. Rebase before local calculations and check declared bounds before arithmetic. Use exact integer comparisons; an operation whose products exceed safe Number bounds uses an exact wide comparison or rejects an unsupported input before mutation. Do not use floating tolerances to classify touching. Doubled coordinates can represent odd body half-widths without fractional authoritative positions.

Static solid geometry consists of axis-aligned boxes. At a standing height, clip all coplanar supporting top rectangles to the footprint. Partition their union at rectangle boundaries and verify every positive-area part of the footprint is covered. Shared edges do not create holes; a hole in the interior fails even if all corners are supported. Surfaces at other heights cannot fill missing coverage. Check body clearance separately, including overhead and overlapping solid boxes.

The within-tick convention is the one disclosed in the accepted contact experiment: each actor moves on the straight segment from its tick-start position to its accepted integer endpoint. A clipped endpoint changes that segment's effective velocity for the tick. It does not represent travel at the original speed until a fractional impact followed by another segment. The landing tick similarly ends on the integer support height and validates the actual segment to that endpoint. Trial validation, execution, actor conflict checks and rendering interpolation must agree on this convention.

Use swept axis-aligned interval intersection for body clearance. For two moving actors, subtract their motions and test the relative segment against the combined body extents over the same tick interval. Compare rational entry/exit times exactly by sign-aware integer operations; strict interior intersection is collision, face/edge touching alone is not. Do not substitute overlap of untimed swept envelopes for matching-time checks.

For supported movement, partition the path at all events where translated footprint edges cross support-rectangle edges, using exact rational event times. Full-area coverage at events and within each open interval establishes support along the segment; endpoint-only checks do not. This covers seams and interior gaps without arbitrary time sampling.

Ground clipping uses the experiment's deterministic candidate order: test the intended endpoint; otherwise test integer rounded prefixes from longest to shortest, then extend x and z in that fixed order within their original component budgets. Validate every candidate's entire straight segment for support and clearance. Retain the last safe candidate, including the start when necessary. Round rational candidate coordinates with the numeric design's positive-infinity half-tie convention. The fixed x-before-z tie can bias corner sliding; it is deterministic and does not promise the maximum possible displacement across every conceivable path. An indexed implementation may skip candidates only with equivalent results.

## Executable traversal family

Retain the demonstrated advance-then-accelerate recurrence: `yNext = y + verticalVelocity`, followed by `verticalVelocityNext = verticalVelocity - acceleration`. The current humanoid's demonstrated acceleration is 7 mm/tick². Choose nonnegative integer launch velocity within the individual's apex/elevation bounds and integer horizontal speed no greater than its walking speed. Horizontal displacement uses the same heading table and residues as walking. A descent crosses its selected landing height only onto a fully supported and clear integer endpoint, with vertical velocity reset to zero.

Planning emits concrete tick continuations, not estimated arcs. The initial supported family is bounded local landings, integer launch velocities/speeds, immediate horizontal motion or delayed horizontal motion until clearance permits it, and supported alignment. Use the accepted archive's candidate recipe as a behavioral reference: nearby targets within 2,600 mm forward distance, small-surface centres, wider-surface samples, at most 160 flight ticks and bounded alignment. These are a versioned search family, not universal physical limits or proof of reachability. Union support can validate a landing even when no single box supplies its whole footprint; failure of the initial target generator to discover such a landing is a search limitation, not invalid geometry.

Deduplicate targets by integer coordinates and surface identity; order by horizontal squared distance, then height, x, z and stable surface identity. For one target order by attained apex, descending horizontal speed, then launch velocity and delay. Use no random or container-order tie. Planner heading conversion selects the Q24 table direction with greatest integer dot product, ties by lowest heading index; zero target displacement requests no movement. This explicitly adopts deterministic table-vector conversion, rather than claiming mathematically nearest continuous angle. Optimize lookup only while preserving the reference result.

Alignment moves at no more than walking speed, uses the same supported segment checks and stops inside the original attempt's lateral bound. Never reset that origin every tick. Every emitted alignment/flight tick and the landing must pass the production transition before being returned as a candidate. Bounded steering produces a new complete continuation through that same transition; it cannot mutate airborne position directly.

Preparation consumes its configured number of complete stationary ticks after alignment; takeoff begins on the next tick. Landing enters recovery; the following configured number of complete ticks remain stationary, and ordinary movement resumes afterward. Route cost counts the actual alignment, preparation, flight and recovery transitions. Tests must lock down these boundaries and trial/execution equality.

A finished finite search reports `no-candidate-in-family`, distinct from a proved unreachable route. A paused search reports pending. Navigation cannot translate a bounded miss into global unreachability. Candidate-family expansion is implementation work constrained by the existing navigation acceptance requirements; it is not another behavior interview by default.

## Joint movement and protected completion

Build proposals from one immutable tick-start snapshot. Ordinary movement proposes one supported segment followed by stationary occupancy. A new flight proposes its full remaining swept continuation and stationary landing occupancy. An existing flight always retains its previously secured continuation as a fallback. Preparation is revocable and creates no entitlement over an existing commitment.

Validate joint proposals in matching time intervals, repeating each endpoint as stationary after its last segment. This permits followers to enter actually vacated space and flights to cross the same location at different times. It never assumes future walking input or departure after recovery. All relevant actors must be checked, including those outside the immediate next-tick sweep whose future protection intersects the candidate.

Resolve conflicts deterministically: protect established flight fallbacks first; among uncommitted proposals, ordinary movement precedes revocable traversal preparation, with player priority and stable actor-ID ties. This is a physical admission order for the foundation and fixtures, not robot fairness or route selection. Try safe shorter ground proposals before stopping them so a clipped leader and follower can both advance. Whenever any proposal changes, recheck every affected dependency before committing any actor.

Make the reduction process finite: each actor's candidate list is ordered and finite; a rejected candidate is not revisited that tick. An airborne replacement can fall back to its original continuation, never to an airborne stop. If compatible proposals cannot be retained, roll back uncommitted ground requests to their tick-start standing states and advance existing commitments. A valid prior state already guarantees those stationary occupancies do not obstruct retained flights. Recheck this baseline; inability to preserve it is an invariant fault, not ordinary congestion. Never halt merely because a legal movement request was blocked or a search budget ended.

Commit the entire validated tick atomically. A failed steering replacement retains its old protection until a complete safe replacement is secured. Current position, future continuation and landing occupancy form one transaction. Do not release the landing because the recovery timer expired. Atomic publication and exact safety predicates are mandatory; the prototype's 16-actor cap and arbitrary iteration cap are not production contracts.

## Shared interface and authoritative state

The proposed TypeScript module exposes three operations; concrete type names may follow implementation conventions:

| Operation        | Inputs                                                                             | Result and guarantee                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Initialize       | Versioned integer geometry, stable actor IDs, capabilities and valid starts        | Valid initial snapshot, or explicit invalid-initialization diagnostics                                  |
| Advance one tick | Immutable snapshot, ordered resolved intents, versioned logical-work configuration | Complete next snapshot with ordered observations, or an invariant fault retaining the previous snapshot |
| Trial            | Isolated snapshot, candidate intents and bounded tick horizon                      | The same advance operation's trace/outcome, without mutating live state or acquiring live protection    |

Navigation can retain trial results as candidates, but execution revalidates them against actual geometry, capabilities and occupancy before commitment. Direct control uses the same transition. Callers cannot write position, manufacture support or substitute their own collision estimate. Keep geometry indexes, contact routines and reservation storage private.

Snapshots contain movement positions/residues, phase/timers, alignment origin, current intent, effective capabilities/revisions, committed continuation and cursor, deterministic work queues/cursors, tick and version identifiers. Include any admission/work state that affects later results. Observations distinguish progress, landing, blockage, stale candidate, pending work, no candidate in the supported family and invariant fault. Blockage supplies factual obstacle/constraint information where available; it does not choose or abandon a job.

Trial work consumes logical units such as one candidate segment evaluation or navigation expansion. Record deterministic queue order and remaining work in state. Work quotas are versioned configuration and fixed for a run; cache hits consume the same logical work as misses. Numerical quota tuning belongs to migration performance validation against the already accepted deadlines, not a gameplay preference question. Safety validation of an accepted tick finishes before commit; a late worker delays wall-clock completion rather than skipping validation or advancing an incomplete tick.

## Indexes, invalidation and lifecycle

Index static solids and support surfaces by region and local spatial bounds. Index actor swept bounds and protected intervals in space and time. Broad-phase queries may overinclude, never omit a possible exact contact. Return candidates in stable order. Equivalent index rebuilds cannot change results or logical completion ticks.

Cache only static feasibility under keys containing physics/numeric/table version, relevant geometry-region revisions, effective capability revision, complete starting motion including residues, and candidate parameters. A trial involving dynamic occupancy is bound to that snapshot and must be revalidated on execution. Geometry or capability changes invalidate affected route edges, pending search work and uncommitted candidates. Cached failure needs the same revision discipline as cached success. Index storage is reconstructable; logical work/progress that changes future ticks is authoritative.

No upgrade can change capabilities during alignment, preparation, flight or recovery. A future stationary station transaction must validate new bounds, support, clearance and compatibility with all existing protections before replacing capabilities and invalidating results. Otherwise reject it while retaining the old valid state. Implementing the transaction UI or station is outside this map.

Current geometry is static during play. Future construction/modifier transactions must preserve current support, occupancy and existing committed continuations, or be rejected/deferred before mutation. Do not invalidate an airborne continuation after destroying its landing and call that normal blockage. Whole-island replacement starts a new validated run under the simulation contract. These constraints prepare for future systems without adding them here.

Explicit pause advances no simulation ticks and preserves phase, timers, residues, alignment and flight. Clearing host-held keys for pause is a lifecycle event, not an ordinary release command cancelling established traversal. Resume continues the saved traversal unless a new explicit movement/cancellation command changes a revocable phase. Flight still preserves a safe completion; recovery still finishes. Ordinary focus-loss input clearing follows the existing command contract and does not pause other actors.

Before publishing each tick, verify numeric bounds, standing support, clearance, matched-time non-overlap, valid phases and safe committed continuations. On an invariant failure retain the last valid snapshot, attempted commands, versions and diagnostics sufficient for replay. Never expose partially advanced actors.

## Evidence and implementation gates

Four accepted experiments supply the design evidence; their exact limits remain binding:

- [Movement conflicts](https://github.com/FBakkensen/signal-and-shelter/issues/32#issuecomment-5748276198): yielding before takeoff and protected completion; floating-point fixture evidence.
- [Narrower feet and stance](https://github.com/FBakkensen/signal-and-shelter/issues/33#issuecomment-5748376542): selected appearance, independent of physical rules.
- [Adaptive integer traversal](https://github.com/FBakkensen/signal-and-shelter/blob/473279eba7f809bb17c34757be8e12f724dbbaf1/docs/testing/integer-traversal-prototype.md): accepted movement, 36 traversal tests, shared trial/execution checks, full checks and browser inspection.
- [Exact contacts and simultaneous movement](https://github.com/FBakkensen/signal-and-shelter/blob/9eab9caaf96950e1fd1ee6f3928959a039d2ac97/docs/testing/physics-contact-prototype.md): approved straight-segment contact convention, 11 additional contact tests, retained traversal tests, full checks and browser inspection.

Prototype branches are archives and must never be merged. This consolidation changes documents only. General completeness, region migration, cross-runtime replay and 1,000-actor capacity were not demonstrated by these experiments.

The migration checkpoint must sequence implementation and verify: exact support/sweep reference comparisons, signed contacts and all headings, multi-actor storage-order independence, clipped-leader regressions, crossing/landing occupancy and failed steering, pause in every phase, geometry/capability invalidation, region crossings/overflow, generated command sequences and trial/execution equality. Preserve all accepted production replay, browser interaction and scale gates. Tests execute the eventual production interface; archive tests are reference evidence, not a substitute.

The existing congestion benchmark mentions yielding/fairness that exceeds this map's narrowed policy scope. The checkpoint must specify deterministic scripted intents exercising production physics and safe admission, label those as fixture behavior, and retain active movement/workload thresholds. It cannot claim autonomous fairness, silently lower a gate or bring robot policy back into this map. No numerical work quota or index design is assumed to meet the performance target until measured.

The physics design is complete at this level. Production implementation and its evidence remain behind the existing migration checkpoint; neither creates an unspecified remainder on this physics decision.
