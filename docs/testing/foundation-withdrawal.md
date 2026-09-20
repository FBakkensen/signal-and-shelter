# Foundation design: implementation withdrawal — 2026-09-19

## Plan

The user requested withdrawal of the automatic-traversal implementation. Preserve its complete archive, restore application code to `3929c5b`, and retain new design agreements as documentation and linked issues.

- Compare application source, tests, configuration and assets to the baseline: expect no runtime changes.
- Run the baseline's `npm run check`: expect existing production tests and build to pass.
- Reload the normal seeded island in the integrated browser. Start play, exercise manual Space jump and pause/resume, inspect the restored control hints and scene. Do not claim sustained traversal from discrete presses.
- Verify the withdrawn PR is closed, the archive exists remotely, the foundation child/dependency graph exists, and no new design ticket was marked resolved.

## Results

- Application source, tests, configuration and assets match `3929c5b`; only design/evidence documents differ on the new branch.
- `npm run check` passed: types, lint, boundaries, production tests, formatting and build. Existing Vite bundle-size warning remains (approximately 648 kB minified).
- Integrated browser, normal `signal-and-shelter` entry: start succeeded; a real Space press displayed Airborne; Escape opened the restored pause menu; Keep wandering resumed. Control hints show Space jump, Ctrl sprint and Shift sneak. Scene and HUD were visually inspected; inspected warning/error logs were empty. Sustained traversal was not retested, and no new physics correctness claim is made.
- Withdrawn implementation PR is closed without merging. Remote archive preserves `f09a795`; no force push or history deletion was used.
- Foundation map has four open child decisions. The contract ticket is unblocked; numeric/tick semantics, physics/coordination and acceptance decisions depend on it. Navigation implementation and robot-job design depend on the foundation map; click-to-move remains transitively blocked by navigation implementation. No new ticket was resolved during charting.
