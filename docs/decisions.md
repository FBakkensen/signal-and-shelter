# Decisions

Record significant choices with date, status, rationale, and consequences. Use proposed, accepted, or superseded; link a replacement when superseding a choice.

## D008 — Make seeded arrival the next small experiment

- Date: 2026-09-19
- Status: Accepted and implemented; full browser traversal remains unverified
- Basis: The user agreed to reshape the opening around a stranded ship, a small island, a data terminal, resource discoveries and optional seed entry while preserving incremental development.
- Decision: The same seed and generator version reproduce the complete starting world and player state. Use a safe starter meadow with seed-varying coast, foliage, ship and deposits. Restart begins that island again; URL seed sharing does not save progress.
- Rationale: Reproducible starts let us revisit experiences and report problems while experimenting. A fixed safe interior constrains variation but keeps the opening accessible.
- Tradeoff: Generator changes may change an existing seed's world; we do not promise historical generator compatibility. Record a new generator version when changing generation in future work.
- Scope: Robots, gathering, power systems, manufacturing, software downloads and travel between islands remain later experiments. The terminal only records an in-game connection check.
- Evidence: [Experiment 003](testing/experiment-003.md) distinguishes production-code tests, browser interaction checks and tooling limitations.
- Consequence: Replaces D006's three-landmark discovery content while retaining D007's controls and the bounded island experiment approach.

## D007 — Try first-person Minecraft-like controls

- Date: 2026-09-19
- Status: Camera/input/overview superseded by D014 on the third-person and atlas implementation branches
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
- Consequence: The overall direction is now the friendly stranded-island game recorded in [vision](vision.md); a full feature roadmap remains open.

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

## D009 — Compare alien UI and visual studies before revising the presentation

- Date: 2026-09-19
- Status: Implemented — user selected study B's warm console interface
- Basis: The user finds the current voxel forms clunky and rejects recognizable Earth-like trees, water and sand as the visual premise.
- Decision: Build three development-only 3D/UI studies on the existing route, selected with `?variant=A`, `B` or `C`, to compare alien materials, block-built formations and UI layouts while preserving voxel geometry. Keep illustrative UI clearly labeled and provide overview/close-up inspection.
- Tradeoff: The studies can answer questions about shapes, materials and visual hierarchy; they cannot establish walking feel, collision fit or the final production terrain representation. They are handcrafted scenes, not seed-based world generation.
- Evidence: [Visual study validation](testing/visual-prototypes.md).
- Outcome: User selected study B's warm console interface. The prototype label was not a game or world name. Prototype source is captured at `8df36f9` on `codex/alien-visual-prototypes`; comparison code is removed from the playable game.

- D009 correction, 2026-09-19: The first implementation incorrectly interpreted “less clunky” as permission to abandon voxels. The user rejected that change. Voxel visuals are a retained constraint; the comparison now uses finer cubic terrain and voxelized formations. Half-metre terrain and quarter-metre formation cells are experimental scale choices, not an approved final resolution.

## D010 — Use finer voxel terrain for the seeded island

- Date: 2026-09-19
- Status: Implemented scale experiment within the selected B direction
- Decision: Use half-metre horizontal/vertical terrain cells and matching player-footprint sampling. Replace trees with narrower-at-the-top stepped vents, sharing every render block's dimensions with collision. Keep the connected level arrival shelf and existing controls.
- Rationale: Reduce the metre-block clunkiness while retaining unmistakable voxels and keeping first-person collision consistent with the rendered terrain.
- Consequence: Generator version increases from 1 to 2; earlier seeds remain reusable text but produce different terrain and decorations. New terrain steps still require jumping. No old-world compatibility is promised.
- Evidence: Seed/mesh/collision tests, 200 clear seeded starts, 15 production-controller resource routes, and focused browser interaction/layout checks in [experiment 004](testing/experiment-004.md). Full browser traversal and captured-look remain unverified.

## D011 — Name the game Signal & Shelter

- Date: 2026-09-19
- Status: Accepted
- Basis: The user approved Signal & Shelter as the game name and clarified that the label used by one interface prototype is not the name of the game or its world.
- Decision: Use Signal & Shelter as the game title. Do not assign a proper name to the planet or island based on prototype labels.
- Rationale: The title reflects the stranded ship's working data link and the longer-term goal of making a home, while allowing the game to expand beyond the opening island.
- Consequence: Browser title, visible branding, package metadata, and default seed use the new title. Prototype labels remain only as neutral study letters in historical records.

## D012 — Run project checks in GitHub Actions

- Date: 2026-09-19
- Status: Implemented; public repository created and CI required on `main`
- Basis: The user requested a public GitHub repository so GitHub Actions can run.
- Decision: Run `npm run check` on pushes and pull requests using Node 26 with read-only repository permissions.
- Rationale: Apply the project's existing local verification command to changes in the hosted repository.
- Consequence: The `check` job is required before merging pull requests into `main`, with the rule enforced for administrators.
- Evidence: The first hosted run passed on 2026-09-19 ([Actions run](https://github.com/FBakkensen/signal-and-shelter/actions/runs/35440373710)); GitHub branch protection requires the `check` status.

## D013 — Deep island and play modules

- Date: 2026-09-19
- Status: Implemented
- Basis: The user selected both opportunities from the architecture review and requested deep TypeScript modules.
- Decision: The island package owns generated terrain, placements, block descriptions and solid geometry. The play package owns input/session lifecycle and simulation bound to that island. Rendering consumes read-only play observations and pure island geometry; it no longer owns gameplay obstacles.
- Rationale: Concentrate the rules that must change together, and test them through the same entry points used by callers. Merely moving the existing files would retain the exposed mutable session and caller-supplied per-frame collision data.
- Tradeoff: Keep a separate headless simulation entry point for deterministic physics and traversal scenarios, while the browser uses the narrower play entry point. Keep geometry/authoring descriptions separate from seed selection rather than exporting every implementation helper in one barrel.
- Consequence: Generator version 2, controls, and authored assets are retained. Package internals and renderer independence are enforced by dependency-cruiser, including top-level integration tests.
- Evidence: [Deep-module validation](testing/deep-modules.md).

## D014 — Third-person play with active strategic zoom

- Date: 2026-09-19
- Status: Accepted; close-play controls and localized fading implemented, active atlas and shared exploration implemented on `codex/strategic-atlas-integration`
- Basis: The user selected camera B, atlas A with true-size footprints, fading treatment B, and confirmed the consolidated controls, defaults and three playable increments.
- Decision: Implement the [accepted third-person design](third-person-design.md). Zoom remains exclusively manual; active strategic presentation preserves actions and proximity rules. Replace first-person capture/look and retire the paused overview as the atlas lands.
- Rationale: Support close exploration and readable strategic inspection through one humanoid-anchored view. Smooth, localized fading preserves visibility without moving the camera.
- Tradeoff: Requires new presentation and input integration; prototype whole-chunk fading is insufficient. Shared click-to-move navigation follows separately.
- Consequence: This is the accepted replacement for D007's camera/input/overview contract; D007 camera/input/overview migration is complete on the atlas implementation branch. Existing movement physics remain unchanged.
- Evidence: [Design checkpoint](https://github.com/FBakkensen/signal-and-shelter/issues/9) and its linked prototype decisions. Atlas integration evidence is recorded in [validation](testing/active-strategic-atlas.md); sustained human playtesting remains pending.

### D014 exploration correction — 2026-09-19

The user rejected inconsistent knowledge across close and strategic views and explicitly removed the separate 4 m surveying rule. The confirmed interview specifies one 8 m horizontal reveal radius, permanent visible/active explored areas, obstacle-independent reveal, and concealment of unexplored terrain and objects at every zoom and in the menu. Partly explored objects stay partly revealed; any exposed deposit part identifies its material. Starts/resets grant only the starting area, with no ship or island-outline exception. Physical use distances remain unchanged.

Implemented with one simulation-owned half-metre coverage grid shared by discovery, CPU atlas clipping, GPU surface/shadow clipping and picking. This trades a mathematically smooth circle for a stepped boundary matching the voxel scale; the 2 m chart grid does not determine exploration. The previous atlas-only concealment and 4 m identity gate are superseded. See [accepted design](third-person-design.md) and [evidence](testing/active-strategic-atlas.md).

## D015 — Shared automatic traversal with individual capabilities

- Date: 2026-09-19
- Status: Accepted design; first production increment implemented on `codex/automatic-keyboard-traversal`, browser traversal acceptance pending.
- Basis: The accepted [navigation checkpoint](navigation-design.md) and its linked decisions.
- Decision: Navigation owns supported surfaces, local traversal and movement physics; play owns camera-relative input, exploration and lifecycle. Profiles carry individual body dimensions, speed, jump availability, elevation limit and setup/recovery durations. Planning in the next increment must reuse this movement implementation.
- Tradeoff: Ground support beneath the actor centre is distinct from clearance for the full collision body. This allows overhang on half-metre treads without shrinking collision dimensions; prevalidated arcs still reject blocked paths. Lateral airborne steering is allowed only when the remaining arc and landing remain feasible. Actual feel still needs human playtesting.
- Lifecycle: Explicit pause freezes movement; the terminal leaves it running with gameplay keys disabled. Focus loss clears held keys without pausing. A shared clock and hidden-page timer reduce dependence on render scheduling, with a two-second cap after browser/OS suspension; actual hidden-tab behavior remains unverified.
- Evidence: [Automatic keyboard traversal validation](testing/automatic-keyboard-traversal.md). No prototype branch was merged.

### D015 correction — 2026-09-19

The first implementation incorrectly required the whole 0.6 m body footprint to rest at one height. Human feedback showed that this blocked ordinary 0.5 m stairs. A deterministic reproduction at the screenshot's **rounded HUD coordinates** and a minimal staircase both failed before correction. Centre support with unchanged body clearance fixes the shared rule. This is a correction to the accepted normal-terrain traversal requirement, not a new movement mode. Reports preserve full floating-point coordinates; screenshots only provide rounded display values.
