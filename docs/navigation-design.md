# Navigation design checkpoint

Current gate — 2026-09-20: foundation design and migration sequence are accepted. Follow the [implementation backlog](simulation-implementation-plan.md): complete the core production prerequisites before keyboard-play cutover, then routing/click integration and combined acceptance. The withdrawn implementation remains archived and must never be merged.

Status: accepted by the user, 2026-09-19, including both sequential playable increments and their acceptance criteria. Production implementation remains pending.

## Decision sources

- [Settle route interruption and automatic-jump control rules](https://github.com/FBakkensen/signal-and-shelter/issues/17#issuecomment-5744156007): controls, destination lifetime, exploration, interruption and lifecycle.
- [Prototype automatic jumps and time-aware click-to-move](https://github.com/FBakkensen/signal-and-shelter/issues/18#issuecomment-5744511185): accepted traversal limit and timings.
- [Choose shared navigation boundaries and capability model](https://github.com/FBakkensen/signal-and-shelter/issues/19#issuecomment-5744590115): shared movement/navigation, individual capabilities, supported surfaces and recovery.

This checkpoint consolidates those decisions for implementation; it does not reopen them.

## Accepted experience

WASD remains continuous, camera-relative movement with normalized diagonals. Jumping is automatic during keyboard and routed movement. Remove manual jump, sprint and sneak. The humanoid's maximum elevation change is 1 m up or down, with 7 simulation ticks of preparation before takeoff and 7 ticks of recovery after landing at 60 ticks per second (approximately 116.67 ms each). This explicitly supersedes the prototype's 0.12 s timings, as agreed in [numeric and tick semantics](https://github.com/FBakkensen/signal-and-shelter/issues/28#issuecomment-5745146189). Require supported takeoff/landing and full body clearance. Gap jumping is excluded. Camera zoom remains entirely manual.

Right-click replaces the requested destination immediately at any zoom, including unexplored or unreachable locations. A known clicked surface retains its height; an unexplored request retains its horizontal position until a surface becomes known. Calculate routes through explored ground to the destination when reachable, otherwise to the closest reachable endpoint. Newly explored ground triggers recalculation toward the retained destination. Show only the requested destination marker. Final arrival clears it; reaching an intermediate endpoint retains it, including when no further progress is possible.

WASD cancels destination intent immediately. Cancel jump preparation when the new movement no longer needs the jump; releasing manual movement during preparation cancels takeoff. Airborne movement finishes with limited steering and landing recovery. Failed route execution stops safely and replans from actual position, retaining the destination and excluding the failed transition from that recalculation.

Explicit pause freezes and preserves state and jump timers; resume continues it. Losing focus or switching tabs does not request pause. The terminal leaves simulation running while disabling gameplay keyboard input. Escape explicitly pauses. Restart and seed replacement clear movement intent. Preserve established selection, physical interaction ranges, exploration and camera behavior.

## Shared implementation direction

Navigation owns movement requests, planning, route execution and automatic traversal through shared movement physics. Player input, camera, terminal presentation and future robot job management stay outside it. Use island geometry and existing exploration knowledge, and distinguish supported surfaces at different heights at the same horizontal location. Clearance alone does not prove support.

Planning and execution consume the same individual's movement capabilities: support footprint, body dimensions, walking speed, jump availability, up/down and apex limits, setup/recovery timings and alignment settings. Type defaults initialize per-individual effective values; individuals of the same type may differ, including through future upgrades. The humanoid tuning values above are not universal robot or humanoid constants. Prepare to record individual values without implementing upgrades now. Upgrades require a stationary actor at a designated station; they cannot occur during movement (clarified 2026-09-20). The station location and upgrade interaction remain future design. Validate reuse with differing capability profiles, including no jumping, without adding robot gameplay.

Navigation reports arrival or inability to progress. Separate future work pairs [robot job decisions](https://github.com/FBakkensen/signal-and-shelter/issues/21) with [movement decisions and replanning](https://github.com/FBakkensen/signal-and-shelter/issues/35): job intent constrains movement policy, and movement outcomes inform job reconsideration. Their shared contract and decision scheduling remain future design outside the foundation wayfinder and do not gate its migration. Job gameplay, flying and terrain-specific movement implementation remain outside this effort.

## Accepted playable increments

### 1. Automatic keyboard traversal in the real game

Establish shared movement and per-individual capabilities, then integrate automatic jumps into normal seeded-island keyboard play. Remove manual jump, sprint and sneak. Implement safe support/clearance checks, setup/recovery, interruption and normalized diagonal movement. Deliver the accepted explicit-pause, focus-loss and live-terminal behavior for this movement state.

Acceptance:

- Walk diagonally and turn/release without snapping or completing an obsolete movement segment.
- Traverse eligible steps and low obstacles with timing A; reject excessive rises/drops, unsupported landings, gaps and insufficient clearance.
- Exercise different body sizes and a non-jumping capability profile through production logic.
- Release or redirect during setup; take over in flight; freeze/resume setup, flight and recovery.
- Verify Space/Ctrl/Shift do not jump, sprint or sneak; preserve camera, selection, proximity and exploration.
- Exercise terminal and background/focus behavior in the integrated browser. Record actual browser scheduling behavior; do not infer hidden-tab execution from a model test or from a tab that remains visible.

Playable result: normal seeded-island exploration with the accepted automatic movement behavior.

### 2. Time-aware click-to-move and complete navigation integration

Add explored-ground routing over supported surfaces, using the first increment's movement implementation. Integrate right-click at close and strategic zoom, requested-destination marking, route replacement, keyboard takeover and nearest-reachable recalculation. Account for walking, jump travel, setup and recovery time. Include safe failure recovery and destination lifecycle across pause, terminal, restart and seed replacement.

Acceptance:

- Compare a jumping shortcut and walking detour; select by complete travel cost and execute the selected route with the same movement rules.
- Reach diagonal targets smoothly without corner cutting. Distinguish reachable upper and lower surfaces.
- Request unexplored and unreachable destinations; reveal more ground, recalculate, and retain intent at a no-progress endpoint.
- Replace a destination and take over with WASD during walking, preparation, flight and recovery.
- Exercise a failed transition without immediately repeating it; preserve the destination and actual physical position.
- Validate capability differences and interrupted capability changes through the shared interface.
- Verify destination-only feedback and correct known-surface picking at close and strategic zoom. Preserve all first-increment behavior.
- Run integrated seeded-island routes and the complete pause/terminal/background/reset lifecycle, then obtain human play feedback on the normal game.

Playable result: the full accepted navigation experience in the normal game.

## Validation and separation

Each increment requires production-code behavior tests, `npm run check`, real integrated-browser interactions and visual inspection under [the testing workflow](testing.md). Reuse controlled geometry as test fixtures to expose boundaries precisely, and test integration on seeded islands. Keep tests of actual implementation; a standalone reimplementation is not evidence.

The accepted prototype is archived at `codex/navigation-prototype`, commit `3c8a0b531eaa3ab993c593a08c1bb1a6e6ef4544`; [its evidence](https://github.com/FBakkensen/signal-and-shelter/blob/3c8a0b531eaa3ab993c593a08c1bb1a6e6ef4544/docs/testing/navigation-prototype.md) includes limitations, not whole-world production validation. Start implementation from the production baseline with accepted design records available. Never merge the prototype branch or ship its study entry, comparison controls or course renderer. Apply [prototype handoff](agents/prototype-handoff.md).

Arrival tolerance, steering strength and feedback wording may be refined against the accepted behavior during integration. Record chosen values and measured limitations. Timing A and the 1 m elevation limit remain selected values. Do not claim performance, background scheduling or human acceptance without corresponding evidence.

## Foundation migration handoff — 2026-09-20

The accepted [migration plan](simulation-migration.md) supersedes the earlier implementation sequence where it conflicts. The existing navigation execution map now owns the [concrete implementation backlog](simulation-implementation-plan.md); build and verify its core production prerequisites before the first playable automatic-traversal cutover. Resume click-to-move after that cutover passes its gates, then complete combined replay and scale acceptance using the production planner. The foundation planning map is complete; no production gate is thereby passed. The existing two implementation tickets remain open.
