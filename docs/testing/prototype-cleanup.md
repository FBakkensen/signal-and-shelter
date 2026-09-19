# Prototype separation — 2026-09-19

## Validation plan

- Inspect archived refs before deleting experiment source; preserve the production-fade fixture snapshot too.
- Remove prototype source/styles/tests, query dispatch, npm commands and shared-renderer hooks. Search runtime source and configuration for remaining references.
- Run production checks; inspect normal entry and former study URLs in the integrated browser. Exercise manual zoom and terminal use/return to detect camera or lifecycle regressions.

## Results

- Existing local and remote camera, strategic-map and occlusion prototype branches retain the design experiments. Local branch `codex/third-person-prototype-archive-41ab0d5` preserves the exact pre-cleanup snapshot, including the production-fade fixtures, at `41ab0d57314a7a317e2907cb224b32ea662e8710`.
- `index.html` now loads `main.ts` directly. Runtime/test/config searches for prototype, study, variant and removed occlusion mode flags return no matches. The scene always uses the production visibility adapter; its camera-frame argument carries no comparison treatment.
- `npm run check` passed types, boundary lint, ESLint, tests, formatting and build. A separate unsandboxed `npm test` confirmed all 54 individual production tests pass. The 14 removed tests belonged to the archived experiments. The existing large-bundle warning remains (640 kB uncompressed).
- Codex integrated browser, local Vite at port 5173: both old map-A and occlusion-C URLs displayed the normal welcome screen with no comparison controls. Normal `/?seed=map-check` also displayed the normal welcome screen.
- Started from the old map URL: third-person humanoid, ship and terrain rendered correctly in a desktop screenshot. Wheel changed zoom from 35% to 100%; F opened the nearby terminal. Check connection then explicit return restored play at 100% and displayed Data link confirmed. The exercised tab's warning/error logs were empty.
- `git diff --check` passed. No new gameplay logic was introduced; production camera/controller/occlusion tests remain unchanged.

## Limits

This cleanup does not implement the strategic atlas. Prior continuous traversal and rendering-performance limits remain. Camera-inside fixture evidence is historical and belongs to the archive; those fixtures are no longer exposed by the playable game. Narrow layouts and sustained movement were not retested because their implementation did not change.
