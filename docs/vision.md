# Vision

Last updated: 2026-09-19.

## Confirmed direction

Create a friendly, combat-free game in a voxel-style world, starting on a small island. You play a battery-powered humanoid stranded on a planet with a broken spaceship that cannot fly. The ship still has a working data connection, which could support requests for software updates or new capabilities.

Build a home and small robot companions. Give the robots jobs they carry out autonomously; the player does not program them. Over time, explore travel between islands with different resources and automation of manufacturing and logistics.

Power should create practical constraints for the player, robots, and base while preserving the friendly feel. Both the player and robots need a forgiving backup that slowly recharges them so they can eventually continue after running out of power. A small carried solar panel is one possible implementation, not a settled design. Base infrastructure should eventually offer faster charging, battery replacement, or both; the mechanism and when it becomes available remain open.

This direction was agreed with the user on 2026-09-19. It is an overall vision, not a description of implemented systems or a commitment to implement everything at once. Continue through small, playable experiments and user feedback, and expect the direction to change. Three.js and Blender remain the agreed starting direction.

Keep project knowledge in separate documents, with a compact AGENTS.md directing future work to the relevant context. Improve that guidance as evidence accumulates.

## Current experiment: seeded arrival

Experiment 003 implements the first small step toward this vision: enter a text seed (or leave it blank for a generated one), arrive beside a stranded spaceship on a small island, check its data connection at the terminal, and discover copper, iron, and silica deposits. These resource types are experimental choices, not a settled manufacturing design. First-person movement and the island overview remain available.

The same seed and world-generation version reproduce terrain, decorations, resources, ship placement, and the initial player state. The chosen seed appears in the game, in a selectable pause-menu field, and in the URL. Restarting recreates the beginning; it does not load saved progress. Generator changes in future experiments may change a seed's island.

Robots, gathering, power management, manufacturing, software delivery, and inter-island travel are not implemented. The terminal currently provides an in-game connection check. Evaluate whether arriving beside the ship and surveying the island feels like the beginning of the intended game before expanding those systems.

See [experiment 003's validation record](testing/experiment-003.md) for actual checks and limitations. No performance target has been agreed. Procedural footsteps, quiet wind, and interaction sounds remain untested suggestions.

## Open questions

2026-09-19: the user approved implementation of [experiment 002's controls plan](controls-plan.md). The controls are implemented; speed, sensitivity, jump weight, and comfort still await user feedback. The user rejects drag-to-look and explicitly requested a keyboard alternative: WASD movement with arrow-key look. Keyboard input must also work while mouse look is locked. Keyboard play now bypasses mouse capture; captured look remains unverified in the integrated browser.

- Does voxel mean a blocky visual style, editable blocks, or both?
- Does repairing the spaceship and leaving become a goal, or does building a home remain the focus?
- How should backup charging work for the player and robots, and what can they do while recovering power?
- How and when should base infrastructure provide faster charging or battery replacement?
- What first robot job would make a useful, enjoyable experiment?
- How should travel, resource differences, and logistics between islands work?
- How should we tune the new first-person sensitivity, speed, jumping, and sneaking?
- Which visual references best express the friendly atmosphere?
- Which devices and browsers should define our performance target?
- How should the seeded terrain evolve beyond the current clear starter meadow and varied shoreline?
- What interactions make exploration interesting?

Resolve questions when an experiment depends on them. Robot companions, power systems, manufacturing, logistics, and inter-island travel are intended directions, not implemented features. Multiplayer, infinite terrain, and persistent world editing have no current commitment; combat is excluded from the agreed vision.
