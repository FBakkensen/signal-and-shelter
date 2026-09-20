# Exact contacts and simultaneous protected movement

Status: accepted by the user on 2026-09-20 (“approved”), with the evidence limits below retained. [Experiment ticket](https://github.com/FBakkensen/signal-and-shelter/issues/36).

Return branch: `codex/deterministic-simulation-foundation`. Clean starting commit: `c11d995e560dc18c7ef417db35a42045292f4927`. Experiment branch: `codex/physics-contact-prototype`; never merge. Reused source: integer-traversal archive `473279eba7f809bb17c34757be8e12f724dbbaf1`, limited to experiment entry, kernel, courses, direction generator and production-input adapter/test.

## Question and foundations

Does one integer transition preserve exact touching, full support, clipped/sliding ground movement, simultaneous actor motion and protected safe jump completion? Keep the archive's exact rational static sweeps, rectangle-union support, integer direction/residue rules, adaptive jump candidates and production camera/input mapping. Replace whole-step ground rejection, sequential actor mutation and untimed flight envelopes.

## Controlled differences and algorithm contract

Use small static courses and explicit per-actor movement commands; no autonomous jobs, queues or replanning policy. Local coordinate/capability bounds and the archive's finite trajectory candidate family remain. No production migration, region support, general routing or capacity claim.

All actors propose a transition from one immutable tick-start state. Ground movement selects a safe integer endpoint within its original per-axis travel budget. Full direct movement is preferred; on obstruction, find the maximal safe straight advance and safe tangential endpoint. Every accepted ground segment must retain full support and static clearance. As in the archived discrete kernel, positions interpolate linearly over the tick to the accepted endpoint: clipped movement has a reduced effective velocity for that tick. It does not simulate a fractional-time impact followed by a velocity discontinuity. The experiment can judge integer endpoints/sliding and simultaneous safety under this declared temporal convention, not a continuous impact model.

Compare two moving bodies by subtracting their simultaneous movements and using the same exact swept-box predicate. Compare matching tick offsets of protected flight continuations; extend the final supported endpoint as stationary occupancy indefinitely. A grounded proposal also extends as stationary occupancy after this tick: future input never promises departure.

Steering proposes replacement of the remaining flight. Keep the old continuation until the replacement is jointly safe. Already committed flights cannot be stopped. Uncommitted requests may be shortened/rejected; revalidate all dependencies after every change, then commit the whole tick together. Bounded fixture arbitration preserves existing commitments first; ordinary ground motion can cancel preparation, and simultaneous uncommitted proposals use player then stable actor ID; this is a declared experiment policy, not an autonomous robot decision design.

If no new compatible motion can be accepted, grounded actors retain their valid positions and committed actors retain their safe continuations. An inability to preserve those existing commitments is an invariant fault with last-valid-state retention, not ordinary blockage. Trials execute this same complete transition.

## Validation plan

Test exact-fit/too-small passages, wall release, partial steps and slides, support seams/holes/edges, close following, leader clipping and dependent follower clipping, crossed paths with clear endpoints, time-separated flight paths, persistent landing occupancy and safe/rejected steering. Test input ordering/replay, preview/execution agreement and fallback propagation. Browser checks must use real scenario controls and movement inputs, inspect desktop/narrow presentation and errors, and leave the prototype available for human playtesting. Automated assertions do not establish human feel or scale.

## Results — 2026-09-20

Run command verified: `npm run prototype:physics-contact`. Integrated-browser URL: `http://127.0.0.1:5180/integer-traversal.html`. The local server remains available for playtesting.

`npm run check` passed strict TypeScript, dependency boundaries, zero-warning lint, tests, formatting and the normal production build. Eleven new contact cases pass alongside all 36 retained integer-traversal cases and the existing project tests (16 test files in the full runner). The unchanged production bundle warning remains. The new cases include exact fit, partial progress/residues, touching followers, leader clipping, head-on and perpendicular crossings, supported edge clipping, preview equivalence, two time-separated committed jumps and a three-actor chain independent of actor storage order.

The leader/follower test found an initial resolver defect: priority-based rejection stopped the clipped leader instead of first checking whether shortening the follower could preserve both safe moves. The resolver now checks compatible reductions before using a conservative stop fallback. The regression asserts leader x=645 and follower x=45 in the same tick when their initial centres are 600 mm apart and the leader has 45 mm of clearance.

Timed-flight evidence uses two independently configured short actors with 200 mm bodies, 100 mm support, 400 mm height and no lateral alignment. Their future paths occupy some common volume at different times, independently asserted in the test. Both enter committed flight together and land at distinct supported endpoints. This is specifically a counterexample to untimed spatial exclusion, not evidence of general autonomous coordination.

Integrated-browser observations through real controls:

- Reset + one tick advances the contact course from x=0 to x=45. The leader-contact course reports player x=45 and second actor x=645 on tick 1, with separate body outlines visible at the wall.
- The 600 mm passage advances from x=-300 to x=-230 on tick 1. The 599 mm passage remains x=-300 and reports blockage.
- Following course advances from (-600, 0) to (-530, 70), then (-460, 140) on the next manually stepped tick, preserving 600 mm centre separation.
- Try course on timed crossing starts the second actor eight ticks later and reaches supported landings at (263, 500, 0) and (-1000, 500, 263). The course uses a disabled, explicitly labelled Short crossing actor profile.
- Controlled perpendicular movement completes without a reported fault. It is a physics fixture, not an autonomous traffic verdict.
- Automatic takeoff pause retains (-1600, 0, 0); One tick produces (-1531, 126, 0). After resume and the second-actor approach control, the jumper remains at (263, 1000, 0) and the second actor stops at (250, 1000, 600), preserving ordinary landing occupancy. Browser automation latency meant the approach input arrived after landing; exact in-flight timing is covered by automated tests, not this browser interaction.
- Screenshots inspected at the normal desktop panel size and a 390 × 844 viewport. Narrow controls remain usable; document client and scroll widths both measured 375 px, with no horizontal overflow. Temporary viewport override reset.
- Browser warning/error logs were empty. At the automated-check checkpoint, sustained direct keyboard feel and overall human acceptance were pending. The subsequent user approval supplies the human verdict without changing those automation limits; no performance, cross-runtime replay or scale claim is made.

## Human verdict and archive handoff

The user approved the presented prototype on 2026-09-20. This accepts its demonstrated exact-fit clearance, partial integer movement and sliding, simultaneous safe movement and timed jump protection as bounded behavioral evidence. The disclosed straight tick segment to a clipped endpoint is the experiment's temporal convention; this verdict does not prove a complete production solver, all geometric cases, replay portability or scale.

Archive `codex/physics-contact-prototype`, verify the remote commit, then return to `codex/deterministic-simulation-foundation`. Never merge this prototype. The physics decision remains open for the final contract and production verification obligations. The experiment ticket records the exact archive commit and completed return once verified.
