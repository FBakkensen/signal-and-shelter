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

Experiment 004 implements seeded arrival: enter a text seed (or leave it blank for a generated one), arrive beside a stranded spaceship on a small island, check its data connection at the terminal, and discover conductive seams (copper), ferric nodules (iron), and prismatic silica. These resource types are experimental choices, not a settled manufacturing design. First-person movement and the island overview remain available.

The same seed and world-generation version reproduce terrain, decorations, resources, ship placement, and the initial player state. The chosen seed appears in the game, in a selectable pause-menu field, and in the URL. Restarting recreates the beginning; it does not load saved progress. Generator changes in future experiments may change a seed's island.

Robots, gathering, power management, manufacturing, software delivery, and inter-island travel are not implemented. The terminal currently provides an in-game connection check. Evaluate whether arriving beside the ship and surveying the island feels like the beginning of the intended game before expanding those systems.

See [experiment 004's validation record](testing/experiment-004.md) for actual checks and limitations. No performance target has been agreed. Procedural footsteps, quiet wind, and interaction sounds remain untested suggestions.

## Open questions

2026-09-19: the user approved implementation of [experiment 002's controls plan](controls-plan.md). The controls are implemented; speed, sensitivity, jump weight, and comfort still await user feedback. The user rejects drag-to-look and explicitly requested a keyboard alternative: WASD movement with arrow-key look. Keyboard input must also work while mouse look is locked. Keyboard play now bypasses mouse capture; captured look remains unverified in the integrated browser.

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
