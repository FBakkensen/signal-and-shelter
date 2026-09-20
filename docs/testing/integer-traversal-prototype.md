# Adaptive integer traversal prototype

Status: accepted by the user on 2026-09-20. Ticket: [Validate adaptive integer traversal and individual capabilities](https://github.com/FBakkensen/signal-and-shelter/issues/34).

Return branch `codex/deterministic-simulation-foundation`, clean starting commit `f20afee1884ca732a0c814f065a3d14980fbdb34`. Experiment branch `codex/integer-traversal-prototype`; never merge. Dedicated command: `npm run prototype:integer-traversal` (verified on 2026-09-20; Vite selected port 5175).

## Experiment plan

Question: do adaptive integer hops, safe landings and bounded pre-jump alignment feel right with independent actor capabilities?

Real foundations: use the existing production keyboard mapping and ThirdPersonCamera, half-metre axis-aligned terrain/solid convention, and the selected B avatar dimensions. The new headless integer transition is the experiment: candidate evaluation and execution use the same transition; existing floating-point physics cannot validate this numeric contract.

Controlled differences: small static courses, a bounded local coordinate space, limited actors, direct movement and narrow destination controls. No robot jobs, upgrades, terrain edits, fair traffic scheduler or 1,000-actor capacity claim. Preparation/recovery are seven ticks for the humanoid; alignment is supported movement at up to its walking speed. Existing 1800 mm standing clearance is retained.

User accepted early takeoff and vertical-first close starts on 2026-09-20. Acceleration 7 mm/tick² remains a tuning hypothesis. Vertical velocity is applied before acceleration. Candidate launches are integer velocities whose discrete apex is at most the actor's cap; speed is an integer up to its own walking speed. Straight heading flights either start horizontally immediately or rise before horizontal travel. Full direction table uses inward Q24 values and centered residues.

The path is explicitly piecewise linear between integer tick positions. On a descending tick crossing a top surface, propose the normal integer horizontal endpoint at that surface's exact integer height. This authors a shallower final segment ending at the tick boundary; it is NOT a fractional ballistic contact rounded to a platform. Validate that entire modified sweep, every intervening solid, and full endpoint support. Reject on failure; never move sideways to fit. Landing starts recovery; the next seven complete ticks remain stationary.

Static collision uses strict interior overlap (touching is allowed) and exact rational interval comparisons for swept axis-aligned bodies. Support is coverage by the union of coplanar top rectangles, including interior holes and seams. Ground paths check support at all footprint/geometry crossing intervals, not just endpoints. Local geometry is bounded to keep integer products exact. Trials cannot mutate live state.

Committed continuation protection is deliberately conservative spatial exclusion for remaining swept segments and persistent landing occupancy. It is bounded behavioral evidence, not the final scalable coordination design. Revalidate before takeoff; ordinary actor occupancy must remain safe even if the actor stops.

## Validation plan

Automated: exact support including seams/holes; thin obstacle sweep and contact boundaries; direction norm/residue identities; wall sliding/edge stop; cardinal/diagonal rise/drop and narrow landing; low ceiling safe/blocked; alignment cap/cancellation; pause in each phase; recovery input; individual capability/non-jumper; trial/execution equality; occupancy/committed conflicts; invalid-state diagnostic retention. Run `npm run check`.

Browser: actual course/profile controls, movement, pause/resume and traversal actions; desktop/narrow visual inspection and browser error log. Human playtesting judges feel. Search work/time is bounded evidence only.

## Results — 2026-09-20

Environment: local Linux, Node 26.5.0, Vite 8.3.0; Codex integrated Chromium browser. Dedicated server started with `npm run prototype:integer-traversal`, selected port 5175 because 5173/5174 were in use. Browser URL: `http://127.0.0.1:5175/integer-traversal.html`.

Automated checks: 36 focused kernel tests plus one host input-mapping test execute the actual experiment and production key mapping. Coverage includes all scenarios above, exact planned/executed tick equality, the two successive terrace landings, safe/declined airborne steering, preparation yielding, command recording, and retaining fault diagnostics. `npm run check` final result recorded below after completion. Existing production entry/build is retained; the experiment is a separate development HTML entry.

A read-only audit found a concrete bounds defect: a translated course near the top of the local coordinate domain could commit an arc whose apex later left that domain. Shared candidate/committed motion bounds now reject that arc before takeoff; the translated-course regression passes. Ground support interval subdivision rejects segments over 10,000 mm before forming products; actual ground ticks are at most 100 mm per axis. With coordinates bounded to 1,000,000 mm, subdivision denominators are at most 200,000,000 and scaled coordinates stay below 2^53. Swept contact compares two bounded rational interval endpoints; no floating tolerance is used.

Browser observations through real controls:

- Already at the wall: automatic takeoff pause left feet at (-300, 0, 0); One tick advanced to (-300, 118, 0), verifying an initial vertical segment. Resume reached (260, 1000, 0) with recovery counter 7. One tick retained that exact position and reduced the counter to 6.
- Diagonal one-metre course landed at (236, 1000, 236); low ceiling at (264, 500, 0); sideways alignment at (263, 1000, 200). No invariant fault was displayed.
- Alignment pause preserved the start; one tick moved sideways by 70 mm while remaining at ground height. Preparation pause and single stepping preserved position while changing the timer from 7 to 6. A release attempted after resuming alignment arrived during flight due to UI automation latency; it does not establish browser-level pre-takeoff cancellation. Automated tests cover release/direction cancellation in both earlier phases.
- Non-jumper stopped before the one-metre wall at x=-340, y=0. Smaller jumper landed at (245, 500, 0) with its own five-tick recovery and 45 mm/tick speed.
- Occupied landing stopped the humanoid before takeoff at x=-410. Conflict controls sent the second actor toward the landing and both remained separately visible after the humanoid landed. Automation latency did not establish the exact in-flight conflict timing; automated tests cover that timing and persistent landing occupancy.
- Real Escape paused. A brief real W keypress produced no positional change, consistent with press/release arriving before a simulation tick; the browser API offers no documented held-key duration here. Sustained WASD movement/diagonal/orbit feel remains for human playtesting. Course buttons exercised the real movement module, not state injection.
- Desktop screenshots inspected at the default 2098 × 1228 viewport; narrow screenshots at 390 × 844. The narrow layout stacks the course above controls, with no horizontal overflow (375 px layout and scroll widths, with the vertical scrollbar). Narrow course selection, Try course, phase pause and One tick worked. Temporary viewport override was reset. Browser warning/error logs were empty for the exercised flows before the final input-helper extraction; final log result recorded below.

### Bounded search measurements

One local Node run of 80 full simulation ticks per authored course, without rendering, measured the following. It includes planning, phase execution and state copying, not just search; warmup and workload differ, so these are debugging observations, not capacity gates.

| Course           | Total for 80 ticks | Slowest tick |
| ---------------- | -----------------: | -----------: |
| One-metre step   |           17.29 ms |     10.01 ms |
| Close wall       |           16.24 ms |     12.41 ms |
| Alignment        |           23.39 ms |     10.72 ms |
| Blocked ceiling  |           76.84 ms |      3.02 ms |
| Conflict fixture |           12.09 ms |      7.86 ms |

All five runs completed without a fault. The conflict fixture measurement did not order the second actor to move. No 1,000-actor, cross-runtime, rendering-rate or general traffic claim follows.

### Explicit experiment limits and tie rules

The local frame is bounded to ±1,000,000 mm; this experiment does not implement region normalization, island generation, exploration, replay persistence or background-worker scheduling. Its host paces whole ticks from requestAnimationFrame and can slow in a hidden tab. These are controlled omissions, not evidence for the full foundation contract.

Candidate target points come from static top rectangles, ordered by planar distance, then y/x/z. Targets on short dimensions aim at the middle; broad dimensions sample forward distances from 500 to 2600 mm in 300 mm increments. Align toward that heading line within the actor's cap and stop within 2 mm. Alignment uses supported Q24 movement no faster than walking. Candidate endpoints must be within 25 mm per axis of a target and fully supported; no horizontal snap is permitted. For each target, enumerate launch velocity upwards, speed downwards, immediate horizontal travel before vertical-first travel. Failed search means no solution within that family. It is not complete navigation over arbitrary terrain.

The humanoid has an experimental steering limit of 1024 heading units per tick (about 5.625 degrees), recorded per actor. A replacement must preserve a safe landing at the original selected height and satisfy the same bounds/sweeps. Unsafe changes retain the old continuation. Flight protection uses conservative remaining segment envelopes; already-executed motion within the current tick remains occupied for subsequent actor processing. Player-first arbitration and stable identifier ties are explicit, without a fair general traffic scheduler. Player preparation takes precedence over uncommitted robot preparation; an already committed continuation remains protected.

The piecewise-linear clipped final segment changes vertical speed in its last tick. Acceleration, steering rate, bounded candidate family, alignment speed, early-launch distance and visual feel remain prototype hypotheses. The exact selected body height remains the existing 1800 mm value. Small-profile rendering scales the selected B proportions; meshes never define physics.

### Direction table recipe

`scripts/generate-traversal-directions.mjs` uses 70-decimal-digit BigInt fixed-point arithmetic, a recorded pi expansion and 50 sine series terms to generate the inward Q24 quarter-turn table, with exact endpoints. Run from the repository root, then format the generated TypeScript file with Prettier. The SHA-256 of its 16,385 signed int32 little-endian values is `51536c7e41109875da68c138322b4b6692ba98509db8d5024b3708b94cd40b80`. Tests verify all 65,536 reconstructed headings are integer, symmetric and do not exceed unit norm, plus centered residue identities, signed half ties and the selected diagonal value. This is prototype numeric evidence; the final production table/region/replay verification remains a separate gate.

## Handoff state

The user reported “this is working as expected” on 2026-09-20, accepting the presented experiment. Earlier automated-browser limitations remain limitations of those checks; they do not negate this human verdict. Archive this exact experiment and return to the foundation branch; acceptance does not authorize production migration or establish general coordination/scale correctness.

Final verification: `npm run check` passed strict compilation, dependency boundaries (60 modules), lint, all 15 test files (including the 36-case traversal file and host-input test), formatting and production build. The existing approximately 648 kB production bundle warning remains. Final integrated-browser one-metre traversal reached (263, 1000, 0), paused at recovery counter 7; warning/error logs were empty. Reset to the initial one-metre course and left the browser tab and port-5175 server available for human playtesting.

## Human verdict — 2026-09-20

The user accepted the presented prototype: “this is working as expected.” Carry forward its adaptive traversal, early/vertical-first takeoff, bounded supported alignment, supported landings and individual capabilities as accepted behavioral evidence. Its numeric/contact implementation and finite search family remain bounded experiment evidence to assess in the shared-physics design, not a completed production solver.
