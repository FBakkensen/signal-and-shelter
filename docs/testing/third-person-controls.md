# Third-person controls and fading — 2026-09-19

Scope: first accepted production increment. Atlas integration and final combined playtest remain separate tickets.

## Validation plan

- Execute production camera math at zoom endpoints and intermediate values; verify bounded wheel modes, fixed FOV, no geometry input, and reset heading preservation.
- Exercise production play lifecycle, selection/use eligibility, movement-facing, orbit aliases, pause clearing and seed/reset behavior. Retain existing collision/traversal tests.
- Execute production fade detection on real Three.js meshes, including camera inside a solid, clear view, shared-material isolation, restore/disposal and fade timing.
- In the integrated browser start normal play, select/use the ship, test paused background input and explicit resume, zoom, inspect UI scroll behavior, restart/change seed, and inspect desktop/narrow layouts. Use labeled render fixtures against actual island geometry for reproducible camera-inside validation; do not call them traversed routes.

## Evidence

- `npm run check`: 68 tests pass, plus strict types, package boundaries, lint, formatting and production build. Existing approximately 639 kB bundle warning remains.
- Normal `/?seed=map-check` starts directly into third-person without capture. Clicked ship geometry and used F; connection check succeeds. At 100% zoom, F still opens the nearby terminal. Background click and Space keep it paused; explicit return and Space show Airborne.
- Wheel changed zoom 100% to 66%; scrolling over the journal did not change it. Restart preserved 66% and cleared the connection check. Close zoom reached 0%; full humanoid remained in frame.
- Seed replacement through the real UI changed map-check to signal-and-shelter, cleared selection/progress and retained 35% zoom. Reset/seed heading preservation at a nonzero heading is covered by production-code tests, not claimed from browser taps.
- 390×844 production view inspected: avatar, controls and selection information visible. Fixed selection inheriting the journal's left position; panels now occupy separate sides and selection help remains visible. Restored viewport.
- Production adapter exercised via `?study=occlusion&variant=B&seed=map-check&production=1`: localized ship opening, inside-ship opening and terrain opening inspected. The first untapered corridor revealed too much near-camera scenery; tapering it preserves geometry outside the local opening. Camera values stay fixed. The fixture is render-only and not gameplay traversal.
- Browser warning/error logs from the production and fixture tabs are empty. GLSL compiled and rendered in the actual browser. At this validation snapshot, comparison UI remained development-only. It was subsequently removed; see [prototype cleanup](prototype-cleanup.md).

## Limits

The fade deliberately uses stippled fragment coverage rather than sorting entire translucent chunks. This texture and the aperture's size can be tuned during integrated playtesting. Inside-terrain views retain solid surrounding surfaces and a local opening; the camera is never relocated. No frame-rate benchmark or continuous obstruction traversal is claimed.

Browser short key presses do not faithfully establish sustained walking, sprint/sneak or orbit feel. The real controller tests cover those semantics and existing traversal tests still pass; human held-control playtesting remains for the combined validation increment. The temporary paused overview is retained as agreed. No new strategic-map or click-to-move implementation is included here.

Historical fixture evidence above refers to commit `41ab0d5`, preserved on `codex/third-person-prototype-archive-41ab0d5`; those URLs no longer expose fixtures on the implementation branch.
