# Decisions

Record significant choices with date, status, rationale, and consequences. Use proposed, accepted, or superseded; link a replacement when superseding a choice.

## D007 — Try first-person Minecraft-like controls

- Date: 2026-09-19
- Status: Accepted and implemented; captured-look validation pending
- Basis: The user requested more Minecraft-like controls, then explicitly requested implementation.
- Decision: First-person pointer-locked mouse look, WASD, Space jump, Ctrl sprint, and Shift sneak, retaining the island and overview. See [the implementation and validation plan](controls-plan.md).
- Rationale: The present elevated camera, drag-only horizontal look, and automatic one-block stepping differ substantially from the requested feel.
- Tradeoff: Jumping requires vertical physics and updated collision/reachability tests; pointer capture requires explicit browser lifecycle handling.
- Evidence: Automated controller tests and integrated-browser drag-mode traversal reached all three landmarks; see [experiment 002](testing/experiment-002.md).
- User correction: Removed the unsolicited drag-to-look alternative. The user explicitly requested WASD movement and arrow-key look as a keyboard alternative, with keyboard input always available during captured mouse look as well. Keyboard mode resumes without capture and preserves its selection across pause/overview/reset. Pointer capture still fails in the integrated browser; keyboard mode is usable there.
- Consequence: Supersedes D006's third-person movement choice. Captured-look feel and lock loss still need a supported-browser playtest. Block editing and survival systems remain outside scope.

## D001 — Explore before defining a full game

- Date: 2026-09-19
- Status: Accepted
- Basis: The user wants a voxel-style open world and to see where it evolves.
- Decision: Develop through small experiments and user feedback.
- Consequence: A genre and full feature roadmap remain open. The proposed first experiment is described in [vision](vision.md).

## D002 — Start with Three.js and Blender

- Date: 2026-09-19
- Status: Accepted as the starting direction
- Basis: The user suggested these tools and endorsed the initial plan.
- Decision: Use Three.js for the browser world and Blender for authored visual assets.
- Rationale: This separates interactive rendering from asset creation, while letting us work directly with Blender through its connected MCP tools.
- Tradeoff: We will need to assemble game systems around the renderer. No comparison with a full game engine has been performed.
- Consequence: Revisit the choice if experiments reveal requirements that make this approach unsuitable. Implementation details remain open.

## D003 — Keep guidance compact and knowledge explicit

- Date: 2026-09-19
- Status: Accepted
- Basis: The user requested evolving agent guidance with separate referenced learning documents, then requested documentation creation.
- Decision: Use root AGENTS.md for durable working rules and conditional reading instructions, with separate vision, architecture, decisions, and learnings documents.
- Rationale: Future work can retrieve relevant context without turning the root guidance into a session log.
- Consequence: Update knowledge during meaningful work; distinguish observations from assumptions and revise obsolete entries.

## D004 — Require automated logic tests and real browser playtests

- Date: 2026-09-19
- Status: Accepted
- Basis: Explicit user requirement during implementation of experiment 001.
- Decision: All application logic receives real automated tests. Gameplay and UI changes also require actual interactions and visual inspection in the integrated browser. Follow [the testing workflow](testing.md).
- Consequence: Build success and mocked interactions alone cannot establish completion. Record what was actually tested and any limitations.

## D005 — Use TypeScript and strict linting

- Date: 2026-09-19
- Status: Accepted
- Basis: Explicit user preference for TypeScript and strict linter rules.
- Decision: Application and tests use TypeScript with strict compiler settings and type-aware ESLint; Blender automation uses its Python API. Tooling configuration may use JavaScript.
- Consequence: `npm run check` includes types, zero-warning lint, tests, formatting, and build. Fix violations instead of weakening the rules.

## D006 — Make the first experiment a bounded third-person island

- Date: 2026-09-19
- Status: Camera/movement superseded by D007; bounded island and discovery loop retained
- Decision: Use generated voxel-style terrain, third-person walking, three proximity discoveries, and an overview camera. Use a Blender-authored beacon to validate the asset pipeline.
- Rationale: Provides a concrete environment and a small reason to explore without committing to a game genre or editable voxel storage.
- Consequence: Feedback may change the camera, style, terrain representation, or interaction model. Audio is deferred so this experiment focuses on navigation and visuals.
