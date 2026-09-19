# Vision

Last updated: 2026-09-19.

## Confirmed direction

The game is named **Signal & Shelter**.

Create a friendly, combat-free game in a voxel-style world, starting on a small island. You play a battery-powered humanoid stranded on a planet with a broken spaceship that cannot fly. The ship still has a working data connection, which could support requests for software updates or new capabilities.

Build a home and small robot companions. Give the robots jobs they carry out autonomously; the player does not program them. Over time, explore travel between islands with different resources and automation of manufacturing and logistics.

Power should create practical constraints for the player, robots, and base while preserving the friendly feel. Both the player and robots need a forgiving backup that slowly recharges them so they can eventually continue after running out of power. A small carried solar panel is one possible implementation, not a settled design. Base infrastructure should eventually offer faster charging, battery replacement, or both; the mechanism and when it becomes available remain open.

This direction was agreed with the user on 2026-09-19. It is an overall vision, not a description of implemented systems or a commitment to implement everything at once. Continue through small, playable experiments and user feedback, and expect the direction to change. Three.js and Blender remain the agreed starting direction.

Keep project knowledge in separate documents, with a compact AGENTS.md directing future work to the relevant context. Improve that guidance as evidence accumulates.

## Current experiment: Seeded island arrival

Experiment 004 implements seeded arrival: enter a text seed (or leave it blank for a generated one), arrive beside a stranded spaceship on a small island, check its data connection at the terminal, and discover conductive seams (copper), ferric nodules (iron), and prismatic silica. These resource types are experimental choices, not a settled manufacturing design. Third-person movement and the active strategic atlas replace the earlier first-person/overview controls.

The same seed and world-generation version reproduce terrain, decorations, resources, ship placement, and the initial player state. The chosen seed appears in the game, in a selectable pause-menu field, and in the URL. Restarting recreates the beginning; it does not load saved progress. Generator changes in future experiments may change a seed's island.

Robots, gathering, power management, manufacturing, software delivery, and inter-island travel are not implemented. The terminal currently provides an in-game connection check. Evaluate whether arriving beside the ship and surveying the island feels like the beginning of the intended game before expanding those systems.

See [experiment 004's validation record](testing/experiment-004.md) for actual checks and limitations. No performance target has been agreed. Procedural footsteps, quiet wind, and interaction sounds remain untested suggestions.

## Accepted navigation and control direction

### Shared navigation direction — 2026-09-19

The user confirmed that [click-to-move and shared navigation](https://github.com/FBakkensen/signal-and-shelter/issues/11) should proceed through design, a playable prototype, and production implementation with validation. Jumping must be automatic for the humanoid and future robots; there must be no manual player jump action, including during direct keyboard movement. Every jump has a short setup before takeoff and a short recovery after landing. Routing must account for both delays and travel time, so a longer walking route may be faster than a jumping shortcut.

Start with terrain steps and low obstacles, requiring clearance and a valid landing. Gap jumping is outside this initial effort. Calculated routes use explored ground, but requested destinations may be unexplored or unreachable. Each right-click immediately replaces the previous destination. Every recalculation routes toward the requested destination if reachable, otherwise to the reachable point closest to it; newly explored terrain triggers recalculation toward the retained destination. There is no separate speculative exploration mode. If the closest reachable point is the current position, stay there with the destination retained. Direct keyboard movement remains available for exploration. Show only the requested destination marker, with no visible route line.

WASD immediately cancels the destination and takes direct control. Cancel jump preparation when the new movement no longer needs the jump; releasing direct movement during preparation cancels takeoff. An airborne jump finishes with limited steering, and the short landing recovery still applies. The accepted contract is recorded in [Settle route interruption and automatic-jump control rules](https://github.com/FBakkensen/signal-and-shelter/issues/17).

Remove sprint and sneak entirely. Reaching the requested destination within a small tolerance removes its marker; reaching an intermediate closest-reachable point retains the destination and marker. Tune the arrival tolerance in the prototype. Switching windows or tabs leaves the game running. Explicit pause freezes and preserves the state, including the destination and jump setup, flight and recovery, and explicit resume continues from that state. The ship terminal also leaves the game running, with gameplay keyboard controls inactive while using its UI; Escape opens the explicit pause menu. Restarting or changing the seed clears the destination.

The user accepted the navigation prototype on 2026-09-19: one shared maximum elevation change of 1 m for jumping up and down, with timing A (0.12 s setup and 0.12 s recovery). Custom scenarios must reuse the game’s movement, collision, input and camera logic. Steering strength, arrival tolerance and feedback can be refined during production integration. Robot gameplay remains outside this effort. See [accepted prototype evidence](https://github.com/FBakkensen/signal-and-shelter/blob/3c8a0b531eaa3ab993c593a08c1bb1a6e6ef4544/docs/testing/navigation-prototype.md). These values are accepted design, implemented only in the archived prototype so far.

These are accepted upcoming requirements, not implemented behavior. They supersede the earlier manual-jump, sprint/sneak, automatic focus-loss pause and terminal-pause design for this effort. Production still implements those earlier behaviors; background execution has not yet been validated.

2026-09-19: the user approved implementation of [experiment 002's controls plan](controls-plan.md). The controls are implemented; speed, sensitivity, jump weight, and comfort still await user feedback. The user rejects drag-to-look and explicitly requested a keyboard alternative: WASD movement with arrow-key look. Keyboard input must also work while mouse look is locked. Keyboard play now bypasses mouse capture; captured look remains unverified in the integrated browser.

## Open questions

- Voxel visuals are required. Should blocks also become editable?
- Does repairing the spaceship and leaving become a goal, or does building a home remain the focus?
- How should backup charging work for the player and robots, and what can they do while recovering power?
- How and when should base infrastructure provide faster charging or battery replacement?
- What first robot job would make a useful, enjoyable experiment?
- How should travel, resource differences, and logistics between islands work?
- Which third-person camera and strategic-zoom controls feel best in the agreed prototype comparison?
- Which visual references best express the friendly atmosphere?
- Which devices and browsers should define our performance target?
- How should the seeded terrain evolve beyond the current clear ceramic shelf and stepped outer terrain?
- What interactions make exploration interesting?

Resolve questions when an experiment depends on them. Robot companions, power systems, manufacturing, logistics, and inter-island travel are intended directions, not implemented features. Multiplayer, infinite terrain, and persistent world editing have no current commitment; combat is excluded from the agreed vision.

## Visual presentation — 2026-09-19

User feedback: the metre-block appearance is too clunky, and the Earth-like island and UI do not fit being stranded on an unfamiliar planet. Explore unfamiliar terrain and materials in place of recognizable trees, ordinary water, grass and sand. The specific replacements and final UI remain open; compare several prototypes before committing.

Three archived visual studies compared different voxel terrain treatments and interfaces. The user selected study B's warm console interface. Its prototype label was only for that study; the game is **Signal & Shelter**, and the planet and island have no settled proper name. The playable experiment currently uses ceramic terrain, stepped vents and amber haze as visual experiments; trees, grass, sand and water visuals have been removed. The comparison is preserved on `codex/alien-visual-prototypes` at commit `8df36f9`.

User correction, 2026-09-19: “you broke the voxels.” Preserve the voxel aesthetic. Less clunky means improving block scale, proportions, materials and composition; it does not authorize smooth or low-poly replacement geometry. The studies now use half-metre terrain cells and finer block-built formations. The exact scale remains experimental.

The seeded island uses half-metre terrain cells, finer stepped vent geometry and matching collision; generator version 2. Exact density, scale, lighting and movement feel still await play feedback. Selecting the console interface did not settle the world name or future manufacturing and power systems.

## Third-person and strategic zoom direction — 2026-09-19

The user agreed to replace first-person play with third-person play anchored to the humanoid: screen-relative WASD, a free mouse pointer for selection and interaction, a humanoid facing its movement direction, and scroll zoom. At sufficient distance, the presentation changes into a simplified strategic map while preserving position and orientation. Zoom does not enable or disable actions; physical proximity still governs nearby interactions. This is accepted direction, not implemented behavior.

Compare raised and over-the-shoulder close-camera prototypes before choosing the camera. Exploration should reveal resource deposit identities, and discovered deposits should remain recognizable across zoom levels. Exact map symbols, exploration coverage, transition behavior and remaining controls will be settled through prototypes and discussion. The strategic view is intended to support active play; the existing separate overview currently pauses it.

The user requested design first, with prototypes, followed by implementation. The canonical [Third-person play and strategic zoom: design through implementation](https://github.com/FBakkensen/signal-and-shelter/issues/5) map tracks that effort and its decision tickets. New robot orders, construction and other future gameplay systems remain separate efforts. D007 records the existing first-person implementation; its replacement control specification is pending this design work.

### Camera feedback — 2026-09-19

The user selected camera B (over the shoulder) and explicitly rejected automatic zoom changes when the humanoid is behind an object. Zoom is exclusively user-controlled. The camera-study branch removes all terrain/solid distance adjustment and keeps FOV fixed. This updates the prototype only; production first-person controls remain until the design handoff. How to show an occluded humanoid without changing zoom remains a separate decision. The earlier sampled pull-in behavior is rejected, not a retained option.

### Strategic map feedback — 2026-09-19

The user selected A, the exploration atlas, with a required correction: multi-block objects must occupy their matching world footprint on the visible terrain grid. Symbols and labels identify objects but must not replace their size. The prototype now projects all ship, vent and deposit block parts at their actual horizontal bounds. Exact exploration distance and transition thresholds remain tuning values for the design checkpoint.

### Controls agreed — 2026-09-19

The user accepted the [third-person control contract](https://github.com/FBakkensen/signal-and-shelter/issues/8): keyboard orbit, free-pointer selection and explicit use, movement at every zoom, explicit pause/resume, and retirement of the separate paused overview. This is a design decision; production and prototype bindings have not yet been migrated.

[Click-to-move and shared navigation](https://github.com/FBakkensen/signal-and-shelter/issues/11) is the agreed next effort after camera/map delivery. Right-click terrain requests a route; WASD cancels it immediately; unreachable destinations show feedback. Humanoid and future robots should share pathfinding with appropriate movement capabilities. Robot gameplay remains separate.

### Occlusion feedback — 2026-09-19

The user selected B: fade scenery that blocks the humanoid. Preserve user-selected zoom and camera framing; obstruction must never trigger camera pull-in, zoom-out or FOV compensation. This chooses the treatment direction. The prototype's abrupt 18% opacity and whole-terrain-chunk fading remain rough implementation details to refine at the final design checkpoint. See the [occlusion decision](https://github.com/FBakkensen/signal-and-shelter/issues/10).

### Design checkpoint accepted — 2026-09-19

The user confirmed the [consolidated third-person design](third-person-design.md), including tunable zoom/blend defaults, 8 m exploration with existing 4 m surveying, smooth localized fading, and three sequential playable increments. D014 records the accepted replacement for first-person controls; production implementation remains pending.

### First production increment — 2026-09-19

Third-person controls and localized fading are implemented on `codex/third-person-controls`, using the normal game entry. Manual zoom, free-pointer selection, F interaction, keyboard orbit and preserved camera settings replace first-person input. The separate overview remains only until the next atlas increment. Sustained movement/obstruction feel still needs human playtesting; see [evidence](testing/third-person-controls.md).

### Consistent exploration — 2026-09-19

During atlas implementation, the user rejected showing unexplored scenery in close play while obscuring it in the strategic view. One 8 m horizontal radius must uncover terrain, objects and deposit identities in both views; this supersedes the checkpoint's separate 4 m surveying rule. Exploration ignores obstructions and camera direction. Explored areas remain visible and active after leaving, with Factorio given as the user's reference for that behavior. Fog conceals unexplored terrain and objects at every zoom, while sky and atmosphere remain visible. Physical interaction ranges remain in force. Objects crossing the exploration boundary are revealed only in their explored portion; a deposit is identified as soon as any part is revealed. Fresh starts and resets reveal only the starting 8 m area, with no exception for the ship or island outline. The opening menu must conceal unexplored scenery too. The user confirmed the complete rule set. It is implemented on `codex/strategic-atlas-integration`; see [the atlas validation record](testing/active-strategic-atlas.md) for checks and remaining playtest limits.

### Shared navigation design accepted — 2026-09-19

The user agreed that humanoid and future robots share navigation, route execution and automatic traversal through shared movement physics; player controls, camera and terminal UI stay outside that module. Navigation must distinguish multiple supported walkable heights at the same horizontal position where existing geometry permits them.

Movement capabilities are individual, potentially determined by actor type and upgrades. Navigation consumes the individual's current capabilities rather than owning robot-type or upgrade rules. The design must accommodate actors unable to jump. Wheeled robots, flying actors and terrain-dependent properties (such as acid) illustrate future variation; implementing those systems is outside this effort. The user confirmed the complete decision in [Choose shared navigation boundaries and capability model](https://github.com/FBakkensen/signal-and-shelter/issues/19). This is accepted design; production implementation remains pending.

A click on known geometry preserves the chosen surface and height; an unexplored click retains a horizontal destination until a surface becomes known. If humanoid route execution fails, stop safely, retain the destination and recalculate from the actual position, excluding the failed transition from that recalculation. Existing nearest-reachable and exploration rules still apply.

Upgrades require movement to be interrupted first; subsequent routing uses the updated individual capabilities. Robot job selection, blocked-job recovery, automatic resumption, retry frequency and any tick scheduler belong to a separate robot-design issue. Navigation reports movement outcomes; it does not decide job policy or scheduling.

### Navigation design checkpoint accepted — 2026-09-19

The user accepted the [consolidated navigation design](navigation-design.md), its acceptance criteria and two sequential playable production increments: automatic keyboard traversal with shared individual capabilities and lifecycle behavior, followed by time-aware click-to-move using the same movement logic. Both require production-code tests and integrated-browser validation. The prototype remains archived; production implementation is pending.

### Fundamentals first — 2026-09-19

The user withdrew the automatic-traversal implementation and requested a new shared [deterministic simulation foundation map](https://github.com/FBakkensen/signal-and-shelter/issues/26) before further navigation or robot-job implementation. Confirmed project-wide requirements are consolidated in [Agree the simulation contract and migration boundaries](https://github.com/FBakkensen/signal-and-shelter/issues/27): cross-runtime replay determinism, integer sub-voxel coordinates, shared physics, explicit support footprints, actor blocking and safe yielding, and 1,000 active simulated robots at normal game speed. Visible robot count is independent of simulated population.

The game remains on its pre-implementation behavior while this design is settled. Navigation experience decisions remain inputs, but the prior implementation checkpoint is reopened. The withdrawn code is archived, not accepted or eligible for merging. Robot job selection remains a separate consumer of the foundation. Browser-first packaging continues with a separate simulation/presentation/host boundary; Electron remains an option if browser constraints warrant it.
