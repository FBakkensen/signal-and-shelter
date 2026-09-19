# Vision

Last updated: 2026-09-19.

## Confirmed direction

Create an open world in a voxel style, potentially evolving into a game. The project is intentionally open-ended: experiments and user feedback will shape the result. Three.js and Blender are the agreed starting direction.

Keep project knowledge in separate documents, with a compact AGENTS.md directing future work to the relevant context. Improve that guidance as evidence accumulates.

## Current experiment: first-person exploration

Stillwild: a small coastal island with terraced terrain, trees, water, warm lighting, and three discoverable landmarks. The user requested Minecraft-like controls after the initial third-person experiment. First-person exploration, mouse look, jumping, sprinting, and sneaking are now implemented, alongside the island overview. Evaluate the movement feel before expanding the world.

Possible initial audio: procedural footsteps, quiet wind, and interaction sounds when corresponding interactions exist. These are suggestions, not implemented features or a settled sound style.

The experiment runs locally and has been exercised in the integrated browser. See [the controls validation record](testing/experiment-002.md). The next step is user feedback on the look, camera, and movement; no performance target has been agreed.

## Open questions

2026-09-19: the user approved implementation of [experiment 002's controls plan](controls-plan.md). The controls are implemented; speed, sensitivity, jump weight, and comfort still await user feedback. The user rejects drag-to-look and explicitly requested a keyboard alternative: WASD movement with arrow-key look. Keyboard input must also work while mouse look is locked. Keyboard play now bypasses mouse capture; captured look remains unverified in the integrated browser.

- Does voxel mean a blocky visual style, editable blocks, or both?
- How should we tune the new first-person sensitivity, speed, jumping, and sneaking?
- What atmosphere should the world have, and which visual references express it?
- Which devices and browsers should define our performance target?
- Should the first terrain be handcrafted, generated, or a mixture?
- What interactions make exploration interesting?

Resolve questions when an experiment depends on them. Multiplayer, survival systems, infinite terrain, and persistent world editing are possible future directions, with no current commitment.
