# Project guidance

This project explores a voxel-style open world and may evolve into a game. Work in small, playable experiments so experience can guide the design.

## Read the relevant context

- Before planning features or changing scope, read [docs/vision.md](docs/vision.md) for direction and open questions.
- Before implementing systems or changing the asset pipeline, read [docs/architecture.md](docs/architecture.md) for the current implementation and proposed boundaries.
- Before making or revisiting a technical or design choice, read [docs/decisions.md](docs/decisions.md) for its status and rationale.
- Before investigating a problem or repeating an experiment, read [docs/learnings.md](docs/learnings.md) for evidence and known limitations.

These are explicit reading instructions; linked documents are read when relevant, rather than assumed to be automatically loaded.

## Working agreements

- Write application code and tests in TypeScript. Keep strict compiler options and type-aware ESLint rules enabled; resolve violations rather than weakening checks or adding unvalidated casts. Blender automation may use Python.

- Keep proposed behavior distinct from implemented behavior. Report what was actually run, viewed, or measured.
- All application logic must have real automated tests that execute production code and assert behavior, including relevant edge cases.
- All gameplay and UI changes must be tested through real interactions in the integrated browser, including visual inspection. Read [docs/testing.md](docs/testing.md) before implementation and validation; record results and unresolved failures before handing off.
- Discover available Blender MCP tools and inspect the connected scene before editing assets. Preserve existing user work and keep editable source assets alongside exports once the asset pipeline exists.
- Establish run and validation commands when implementation begins; document verified commands in the README and keep executable definitions in project configuration.

## Maintain project knowledge

After meaningful work, update the document that owns the finding:

- Direction and user preferences belong in vision.
- Implemented structure and asset conventions belong in architecture.
- Significant choices, alternatives, and tradeoffs belong in decisions.
- Experiments, failures, measurements, and limitations belong in learnings.

Record evidence and dates for findings; label untested ideas as hypotheses. Promote a lesson into this file only when it becomes a durable instruction for future work. Correct or remove stale guidance, consolidate repeated findings, and summarize documentation changes in the handoff. Documentation maintenance happens as part of a task, not as an unattended background process.
