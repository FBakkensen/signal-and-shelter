# Numeric and tick semantics — accepted design

Status: accepted by the user, 2026-09-19. [Choose deterministic numeric and tick semantics](https://github.com/FBakkensen/signal-and-shelter/issues/28) owns the decision. The consolidated rules below are accepted design. Production implementation and its validation remain pending.

## Confirmed choices

- 1 millimetre integer position units; integer region coordinates plus bounded local positions. Region dimensions, storage types and cross-region arithmetic are specified below.
- 60 simulation ticks per simulation second, independent of rendering.
- Walking speed is 4.2 m/s, exactly 70 mm per tick along an axis. Divisibility is a constraint on authored time-based tuning, not merely a convenience.
- Preparation and recovery are each exactly 7 ticks (7/60 second); this supersedes the earlier 120 ms durations.
- Whole-tick schedules and integer quotient/remainder handling for derived quantities. Remainders affecting future state must be reproducible.

## Direction representation and its limits

Scale direction components by S = 2^24 = 16,777,216. The cardinal vector is (S, 0); the 45-degree vector is (D, D), where D = 11,863,283. Combine each component with the 70 mm travel budget and retained integer residue before extracting whole millimetres.

This is a finite approximation to normalization. A perfect 45-degree displacement of length 70 mm requires a component a with 2a² = 4900; no integer-millimetre a exists. Neither this representation nor a finer finite fixed-point representation provides literal equal Euclidean displacement on every tick. The user accepted this explicitly qualified approximation; mathematical exactness and completed validation are not claimed.

## Arithmetic evidence

Exact integer calculations were evaluated with BigInt as an arithmetic reference, not a production implementation or benchmark:

| Quantity                                                                            |          Exact result |
| ----------------------------------------------------------------------------------- | --------------------: |
| S² − 2D²                                                                            |             9,634,478 |
| 70D                                                                                 |           830,429,810 |
| 70S + (S − 1), conservative component numerator bound for residue magnitude below S |         1,191,182,335 |
| 3S², bound for a sum of three component squares when each magnitude is at most S    |   844,424,930,131,968 |
| JavaScript maximum safe integer                                                     | 9,007,199,254,740,991 |

The listed operations fit the safe-integer range. This does not establish bounds for arbitrary speeds, rotations, generation, global coordinates, geometry predicates or chains of products. Signed-32-bit bitwise operations cannot be used indiscriminately for the larger intermediates.

The diagonal vector's relative length error is approximately −1.7114271 × 10^-8, about −0.017114 mm per kilometre of commanded travel, before positional quantization. This normalization error grows with travel length; carrying remainders does not remove it.

For a fixed direction and no collision, retained remainders can avoid additional cumulative step-rounding drift. For example, after 216,000 ticks (one simulation hour), each diagonal axis numerator divided by S yields quotient 10,691,454 mm and remainder 5,847,936. That reference identity does not select the production signed-rounding convention. Positional quantization is separate from direction normalization error.

## Validation and downstream obligations

The numeric rules below are settled at design level. Production tests must still demonstrate turning/stopping behavior, blocked-residue handling, region normalization, arithmetic bounds and overflow rejection. The shared-physics decision owns contact classification, planner heading conversion and trajectory rules; the acceptance decision owns the supported-runtime matrix and normal-speed scale evidence.

The arithmetic reference checks do not establish production correctness, cross-runtime replay or capacity for 1,000 active robots. Reusing direction data while intent is unchanged is permitted only when it preserves the accepted authoritative behavior.

## Accepted numeric and tick rules

The user accepted this consolidated design on 2026-09-19, including the explicit host fallback limitation. The remaining physics and scale tickets still own their detailed algorithms and validation.

### Regions and arithmetic bounds

- Use 16 m regions: 16,000 mm per axis, containing 32 of the current half-metre terrain cells. This is a coordinate partition, not a decision to implement terrain streaming or couple rendering chunks to physics.
- Represent each axis with a signed-32-bit region index and a canonical local integer in [0, 15,999]. Normalize with floor division, including negative crossings; check the resulting region index before storing it. A carry changes representation without changing position or movement residue.
- Region extent is a representation limit, not a resident-world promise: the full signed region range spans approximately 68.7 million km per axis. Do not flatten these values into one large millimetre coordinate for physics.
- Use exact integer-valued TypeScript `number` arithmetic in bounded kernels; its underlying Number representation does not authorize fractional authoritative coordinates. Use named integer quotient/remainder operations. Use BigInt for reference calculations and infrequent wide comparisons when required, not as an assumed per-actor performance solution.
- Initial local arithmetic kernels accept relative coordinate components with magnitude at most 1,000,000 mm (1 km). Check the bound before subtraction/products enter a kernel. Larger queries use region-level traversal and rebasing, or a separately specified exact wide operation. This is a kernel limit, not an island-size limit or a new visibility restriction.
- Direction components are bounded by S. A local coordinate × direction product is at most 16,777,216,000,000; a sum of three such products remains below 2^53. Squared local distances also fit. Chained products still require their own bound: these examples do not license arbitrary arithmetic.
- Use safe integer counters with a declared maximum, initially 2^48−1 for ticks, per-source command sequence numbers and per-stream random draw counters (including rejection-sampling draws); reject overflow rather than wrapping. Hash operations alone deliberately use modular unsigned-32 arithmetic. Do not use `|0`, bit shifts or `Math.imul` as general large-coordinate multiplication shortcuts.

### Directions, rounding and residues

- Encode horizontal heading in 65,536 directions per turn. This introduces a maximum nearest-heading angular quantization of half a heading step (about 0.00275 degrees), separate from speed and position errors. It is not an eight-direction-only control scheme. Host camera input is quantized to the nearest heading; exact half-step ties select the increasing heading modulo 65,536, and the resolved value is recorded. Planner-generated headings must use deterministic integer target conversion and an explicit tie rule; the shared-physics decision owns that conversion, constrained by this direction set.
- Use a checked-in, versioned quarter-turn table of nonnegative Q24 sine values, rounded inward, reconstructing other quadrants and cosine by symmetry. The table has 16,385 signed-32 entries (65,540 bytes before packaging), is shared by every actor, and is looked up when intent changes. Its reproducible generation recipe, checksum and full-table validation must exist before implementation acceptance. No runtime platform `sin`, `cos`, `atan2` or `hypot` determines authoritative movement.
- Inward component quantization gives every direction squared length at most S². Validate that property for every table heading. The worst-case direction length deficit is less than sqrt(2)/S, under 0.085 mm per kilometre of commanded travel; the specific 45-degree vector has the smaller deficit already measured above. This removes systematic normalization overspeed, not position-step fluctuations.
- For each world axis, combine the intended Q24 displacement with its retained residue. Extract the nearest integer displacement using q = floor((n + S/2)/S), then r = n − qS. The canonical residual range is [−S/2, S/2); exact half ties go toward positive infinity. Implement via integer quotient/remainder, without accumulating decimal fractions.
- Retain world-axis residues when intent turns or stops. Without contact, position*S + residue equals the initial value plus the sum of intended Q24 displacements. Stop adds zero; a direction reversal cannot create extra cumulative displacement. A rounded position stays within 0.5 mm per axis of the accumulated Q24 position from an initially exact position. Horizontal positional error is therefore at most approximately 0.707 mm, separate from heading and normalization error.
- Physics commits only accepted integer movement. Discard rejected whole displacement and clear the residue on axes actually blocked by contact; preserve tangential residues. Do not redistribute the blocked component to make the actor move faster along the wall. The shared-physics ticket defines contact classification and swept collision; these arithmetic rules are constraints on that design, not an alternate collision implementation.
- Position/normalization bounds apply between contact projections. Do not describe them as a proof about arbitrary collision paths; contact and repeated near-wall direction changes require production-sequence tests. Landing/resting geometry must satisfy the shared support contract regardless of visual interpolation or residue.
- Author speeds as integer mm/tick and phase durations as integer ticks. Acceleration and other authored rates must have declared tick-based units chosen with the physics design. The old 24 m/s² gravity is not silently retained or replaced here. Upgrades/modifiers must produce supported canonical values, not arbitrary fractional outputs.

### Tick phases and commands

- Every recorded command contains its target tick, stable source identifier, source sequence, kind and explicit integer gameplay arguments. Preserve deliberate order within a source; define a fixed source order for simultaneous sources. Local UI input becomes recorded commands for the next unstarted tick. A paused host does not advance that tick; lifecycle controls resume the driver outside the paused queue.
- The recorded command stream is the reproducibility input. Different machines need not map unrecorded physical gestures to identical ticks. Playback executes the recorded tick assignment and resolved direction/target, independently of browser callback batching.
- Process ticks in explicit phases: ordered commands and intent changes; deterministic controller/planning work; coordinated movement; exploration/discovery and interaction effects; invariant checks; commit and ordered observations. Interactions validate their effects against the post-movement state. Physics coordination must not inherit accidental iteration order as traffic priority.
- Define ordering keys for entities, events and work requests; use deterministic tie breakers. Fair traffic policy may change priority according to recorded simulation state, not wall time.
- Planning work that influences the tick when a route becomes available has a deterministic logical work budget. Caches and workers may accelerate it but cannot change its logical completion tick. If a required worker result is late, simulation waits; it does not use whichever result arrived first. Work-budget values belong to physics/acceptance decisions.

### Randomness and generation

- Keep seed normalization explicit and versioned. A blank seed may be selected using host randomness; record the resolved seed before initialization.
- Use named, versioned integer random streams keyed by seed, purpose and stable entity identity, with a per-stream integer draw counter included in state. Adding visual effects or another actor must not consume a shared gameplay stream.
- Selected first algorithm: fixed-order seed/purpose/entity/counter fields, with unsigned-32 little-endian byte lengths for UTF-8 string fields and fixed-width little-endian integer fields (including 6-byte counters), FNV-1a over the encoded bytes followed by the existing unsigned-32 avalanche mix (xor right-shift 13, multiply modulo 2^32 by 1,274,126,177, xor right-shift 16). Version the exact encoding and algorithm; publish golden vectors. Use explicit low/high words for wider integer fields. This is a non-cryptographic gameplay hash, not an entity-identity mechanism or a security primitive.
- Map random words to integer ranges with rejection sampling, not an intermediate floating value in [0,1). Rejected samples advance the stream counter deterministically. Coordinate-addressed generation uses explicit integer coordinates/purpose keys, so querying cells in a different order cannot change the island.
- Migrate generation to a new generator version using integer/fixed-point expressions and versioned tables where needed. Current v2 uses runtime trigonometric functions; its old seed geometry is not silently promised to remain bit-for-bit identical. Preserve the accepted island experience and test the new generator. Record game, generator, numeric/table and replay-schema versions in each run.

### Host pacing and suspension — explicit limitation

Browser lifecycle signals do not provide a portable, complete explanation of every elapsed-time gap. A long gap alone cannot prove whether the cause was sleep, freezing, blocking work or scheduling delay. Therefore the host needs an explicit conservative policy; it cannot guarantee perfect cause detection.

Accepted policy:

- Use a simulation driver independent of rendering, with integer wall-time credit solely for pacing. Completed ticks and recorded commands are authoritative; wall-clock timestamps never enter gameplay calculations.
- Schedule 60 ticks per second. Cap admitted pacing credit at six ticks (100 ms); process a bounded batch before yielding. If processing cannot keep up, discard excess wall-clock debt and run slower without skipping or partially executing simulation ticks.
- Explicit freeze/resume or restored-page lifecycle signals reset pacing credit. A callback gap greater than 100 ms also resets old credit; on the next permitted driver callback, execute at most one fresh tick and re-anchor pacing, without replaying the gap. This allows even heavily throttled background callbacks to make slow progress rather than resetting forever without executing a tick. This can classify a long ordinary stall as a suspension; its consequence is slower game time, not altered tick outcomes. An unreported short suspension can still resemble ordinary scheduling jitter; document and test this limitation.
- Hidden does not itself mean paused. Keep requesting background work while allowed, but do not promise that a browser will keep a hidden page running at 60 Hz. A discarded page has lost in-memory state; resuming after discard would require persistence, which is outside this map.
- Focus loss clears held player input via the command boundary; it does not pause robots. Explicit pause freezes simulation and clears held player input. Terminal UI remains live with gameplay keyboard input disabled. Reject gameplay commands received during explicit pause rather than queueing them for later execution; presentation and resume controls remain usable. Pause preserves already-established traversal state under the accepted lifecycle contract; clearing host held keys must not silently cancel a prepared jump. The shared-physics decision must define that resumption transition explicitly.

The user accepted this fallback limitation on 2026-09-19. It does not weaken same-recorded-command tick determinism.

### Replay comparison and verification gates

Use a versioned canonical state encoding with fixed field order, integer values, stable entity ordering and explicit residual/random/command-work state. Compare exact fields/bytes and identify the first differing tick. A digest may accelerate comparison but is not proof of equality by itself. Exclude presentation state and caches only under the accepted contract's reconstructability condition.

Require reference arithmetic and production-interface tests for signed ties, reversals, stops, all headings, region crossings, overflow rejection and contact projection; identical replay across the runtime matrix chosen by the acceptance ticket; and normal-speed scale measurements. This design does not claim those production/cross-runtime/performance gates have passed.

## Independent arithmetic audit — 2026-09-19

A read-only audit exercised ephemeral integer reference calculations: one million seeded eight-direction/stop steps checked the cumulative displacement identity and centered residue bounds; 126 signed region-boundary cases checked floor normalization; a separate Node Number calculation matched a BigInt accumulated identity over one million steps. Stops and reversals preserved the identity. No repository implementation, collision solver, arbitrary-heading table, browser replay or performance benchmark was tested.

The audit identified the need to validate every direction's norm, specify half ties, discard only genuinely blocked residues, and bound local geometry before forming products. Those refinements are incorporated in the accepted design above.

## Primary-source constraints

- [ECMAScript numeric and Math semantics](https://tc39.es/ecma262/2025/multipage/numbers-and-dates.html): safe integer bounds, modular `Math.imul`, and implementation-approximated trigonometric functions motivate explicit arithmetic and versioned tables.
- [Chrome page lifecycle](https://developer.chrome.com/docs/web-platform/page-lifecycle-api): hidden, frozen and discarded states differ; freezing suspends tasks and discard may occur without an event. The host policy must not equate hidden with paused or promise recovery of discarded in-memory state.
