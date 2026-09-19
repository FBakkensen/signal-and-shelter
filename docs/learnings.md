# Learnings

Record durable observations with date, evidence, implications, and limitations. For experiments, add the question, setup, result, and next action. Keep hypotheses labeled until tested.

## 2026-09-19 — Initial environment inspection

- Evidence: Workspace listing showed no project source or documentation before this documentation task. `git status` reported that the directory was not a Git repository despite the presence of a `.git` directory.
- Implication: Application scaffolding and usable version control have not been established. Recheck the environment before initializing Git; the existing `.git` entry may be environment-managed.
- Evidence: Executable lookup found Node, npm, pnpm, and Blender.
- Limitation: Executable availability does not prove that project builds or asset exports work; neither has been tested.

## 2026-09-19 — Blender MCP connection verified

- Evidence: `mcp__blender__get_blendfile_summary_datablocks` returned successfully. The connected scene contained one mesh, one camera, and one light, used Eevee, and had Layout as its active workspace.
- Implication: Direct scene inspection is available through MCP. Check tool discovery as well as local executables when assessing capabilities.
- Limitation: This was a read-only check. Creation, export, and rendering have not yet been verified, and scene contents can change.

## 2026-09-19 — Documentation loading approach

- Evidence: [Official AGENTS.md guidance](https://learn.chatgpt.com/docs/agent-configuration/agents-md) describes loading guidance along the project directory path.
- Implication: Root guidance should explicitly instruct when to read supporting documents; a Markdown link alone is not an automatic import mechanism.

## 2026-09-19 — Commit prototype boundaries and return before instruction changes

- User requirement: commit pending work on the original wayfinder branch before creating a prototype branch; commit and push the finished prototype archive, then return to the previous branch. Prototype branches must never be merged. Local instruction changes belong on the previous branch.
- Evidence: navigation design notes were committed on `codex/navigation-design` at `6da9585` before the prototype branch was created. When the user requested an explicit workflow correction, the unfinished experiment was checkpointed and pushed on `codex/navigation-prototype` at `3e02a72`, then the worktree returned to `codex/navigation-design` for the instruction edits.
- Limitation: that prototype checkpoint is unfinished and has not received automated behavior tests, integrated-browser validation or user playtesting. Its ticket remains open.
- The enforced sequence lives in [prototype handoff](agents/prototype-handoff.md), reached from AGENTS.md before branch creation, prototype completion and workflow instruction changes.

## Untested ideas

- Chunk meshes with exposed faces should be a useful approach if we choose dense block terrain. Implemented with exposed terrain quads in experiment 001; no project benchmark exists yet.
- Procedural footsteps and ambient wind may suit the visual style. No sounds have been generated or auditioned.
- GLB/glTF should provide the exchange format for authored Blender assets. The export-and-load path is now verified below; reimport into Blender has not been tested.

## 2026-09-19 — First playable experiment

- Evidence: Strict TypeScript, type-aware ESLint, formatting, automated tests, and the production build passed. See [the test record](testing/experiment-001.md).
- Evidence: Actual keyboard movement reached all three landmarks in the integrated browser. Journal state progressed from 0/3 to 3/3; pause and overview prevented movement, and reset cleared progress.
- Evidence: A tree trunk blocked the approach to the grove; moving around it allowed the final discovery. Visual inspection also showed that nearby foliage can obscure the avatar.
- Implication: The basic exploration loop and collision work; camera occlusion deserves attention in the next movement refinement.
- Evidence: The Blender GLB loaded in the browser and through the automated Three.js loader test. The original Blender scene was restored after asset generation.
- Limitation: The exporter reported an unavailable optional MeshOptimizer library, but uncompressed GLB export succeeded and requires no such decoder.
- Limitation: No audio was created, no frame-rate benchmark was measured, and narrow-layout checks do not establish touch playability.

## 2026-09-19 — First-person movement and browser capture

- Evidence: `npm run check` passed after implementing first-person look, fixed-step physics, jumping, sneaking, finite box collisions and session input handling. Production-controller route tests reach all three landmarks, and actual integrated-browser drag-mode traversal also completed the journal. See [experiment 002](testing/experiment-002.md).
- Evidence: Pointer lock consistently rejected with an internal Chromium `UnknownError` in the integrated browser. Temporary targeted logging isolated a promise rejection rather than a missing API return value. Logging was removed.
- User correction: Captured mouse look is required. The unsolicited drag-to-look alternative was explicitly rejected and removed. A tool limitation must be reported as a blocker, not used to change the requested interaction. Real captured look and lock-loss handling remain unverified.
- Evidence: A quick Space press can begin and end between render frames. The input session now queues taps and the controller buffers them for 120 ms; production tests cover a press/release across a frame shorter than one physics step.
- Evidence: Real keyboard chord sequences and mouse drags completed all three discoveries, reset cleared them, and the narrow pause/HUD layouts were visually inspected. The tools did not expose held-key events, so these are not continuous-control feel or speed measurements.
- Limitation: Opening a second integrated-browser tab did not induce observable focus loss. Actual blur/visibility behavior still needs a browser-level check despite passing input lifecycle tests.

## 2026-09-19 — Validation scope and annotated resume failure

- User requirement: Use change-driven, risk-based validation. Each check needs a changed behavior, expected result and observable evidence; stop at a concrete tooling limitation. The authoritative workflow is in [testing](testing.md).
- Evidence: Clicking the annotated Keep wandering button reproduced the capture rejection. The user then explicitly rejected drag-to-look; its UI, event handlers, session mode and tests were removed. The capture failure now shows a plain-language explanation while keeping the Keep wandering label.
- Limitation: Error reporting is improved, but the underlying embedded-browser capture failure is unresolved. Automated lifecycle tests do not establish working real mouse capture.

## 2026-09-19 — Isolated pointer-lock reproduction

- A temporary standalone diagnostic page invoked requestPointerLock directly from a button click after focusing the target. In the integrated browser, document focus was true, visibility was visible, transient user activation was true, and the document was top-level. The request still rejected with Chromium UnknownError. This rules out the game's pause/resume state machine as a necessary cause of this rejection; it does not identify the host-level cause.
- Only the Codex integrated browser was connected to the browser tools. Standalone Chrome/Firefox behavior has not been tested. The temporary diagnostic files were removed after this focused check.

## 2026-09-19 — User-approved keyboard controls

- User requirement: WASD movement and arrow-key look must always work during active play, including when the mouse is locked. Provide keyboard play as the alternative to captured mouse look. Drag-to-look remains rejected.
- Implemented: keyboard play does not request capture; selected mode survives pause/overview/reset. Keep wandering now resumes keyboard play without hitting the embedded-browser capture failure.
- Evidence: focused real-browser selection → Escape → Keep wandering → Space entered play and showed Airborne. Automated tests cover arrow-only look, WASD movement, simultaneous locked-session keyboard input, clearing inputs and mode retention. Full checks pass. Sustained keyboard-look feel and real captured input remain unverified by browser tools.

## 2026-09-19 — Seeded arrival experiment

- Question: Does a small island opening beside a stranded ship establish the intended game's premise?
- Implemented: optional seed entry, deterministic world generation version 1, safe arrival beside a Blender-authored ship, an interactive data-link check, and three discoverable resource deposits. Player feedback on the experience is still pending.
- Evidence: `npm run check` passed; 200 seeds had clear dry starts and level ship sites. Production movement traversed 15 resource routes across five seeds. Actual GLTFLoader geometry matched all 17 ship colliders. See [experiment 003](testing/experiment-003.md).
- Browser evidence: seed entry, terminal interaction/pause/return, restart, seed changes, random-seed generation and repeated-seed overview were exercised. Narrow start/pause/terminal layouts were visually inspected; a terminal width issue was corrected. Browser logs inspected for these flows were empty.
- Tradeoff: a connected level starter meadow simplifies safe placement and access while coastline, outer hills, foliage, ship and resources vary. More varied interior terrain is an untested future direction.
- Limitation: the browser tool exposes discrete key presses without held input; full browser resource traversal remains unverified. Captured mouse look retains the documented host limitation. Automated reachability does not establish movement feel.
- Next: user feedback on arrival, the ship's scale and resource surveying should guide the next small experiment. Robots and power remain future work.

## 2026-09-19 — Alien visual studies

- User evidence: The current metre-block terrain looks clunky; recognizable Earth-like environments and UI do not convey the intended unfamiliar planet.
- Initial experiment (subsequently corrected): Three actual Three.js scenes compared shallow porcelain facets and arches, continuous ceramic folds and vents, and violet strata with suspended luminous stones. Each has a different UI composition. See [the validation record](testing/visual-prototypes.md).
- Observed: All three rendered at desktop and 390×844. Button/keyboard switching, wraparound, URL reload, closer view, rotation, hide/show and return to the current game were exercised. A narrow-layout missing word space was fixed and rechecked.
- Hypothesis: Gentler terrain transitions and fewer persistent interface elements may improve the sense of exploration. No user preference or gameplay conclusion has been established yet.
- Limitations: Static art studies; haze, vents and floating stones imply materials and motion but have no physical simulation. No authored Blender assets were changed. Collision, traversal, performance and the existing pointer-lock issue were not retested by this work.

## 2026-09-19 — Preserve voxels when reducing clunkiness

- User correction: “you broke the voxels.” The smooth/triangulated study geometry contradicted the requested voxel style. The initial visual proposal was rejected on that basis; browser rendering success did not validate the design choice.
- Correction: Half-metre cubic terrain with exposed square faces; block-built arches, vents, stones and celestial silhouettes; crisp ship and humanoid boxes. Alien palettes and UI comparisons remain available.
- Evidence: A new half-metre-level regression failed before the correction and passed afterward. Geometry tests cover face counts, hidden-face removal, empty volumes, grid alignment, axis normals, triangle winding and invalid dimensions. `npm run check` passed. Integrated-browser close-up inspection and real variant switching checked A/B/C; no application errors in inspected logs.
- Limit: These are still visual studies, not production collision or editing systems. User feedback on the finer voxel scale is pending.

## 2026-09-19 — Study B presentation implemented

- User decision: Select study B's warm console interface for the playable experiment. The study's label is not a game or world name; the game is Signal & Shelter.
- Implemented: generator version 2 with half-metre terrain; cell-aware footprint collision; vent parts shared by rendering and obstacles; updated materials, regions, resource display names and UI. Existing seeded arrival, terminal and exploration mechanics remain.
- Evidence: `npm run check` passed. Automated checks verify half-cell walls, seam-free meshes, axis normals, vent/collider correspondence, 200 clear starts and 15 real-controller resource routes across five seeds. Integrated-browser seed entry, keyboard start, short movement, jump, terminal check/return, pause/resume, restart and overview were exercised. Desktop and 390×844 start/pause/terminal layouts were inspected; application error logs were empty.
- Limitations: Browser movement tools provide discrete presses; a short movement from x=6.0 to x=6.1 and an Airborne indicator establish basic integration, not sustained movement feel or full resource traversal. No new pointer-lock or performance claim. The original ship asset is preserved.
- Prototype capture: `codex/alien-visual-prototypes` at `8df36f9`; playable implementation lives on `main`. See [experiment 004](testing/experiment-004.md).

## 2026-09-19 — Whole-codebase review: terminal pause defect

- Scope: Entire current implementation including uncommitted seeded-arrival work, reviewed independently for standards and spec. See [review record](testing/code-review-2026-09-19.md).
- Confirmed browser defect at review time (resolved in the follow-up below): with keyboard controls, E opens the terminal; clicking the exposed world resumes the game without closing the terminal. Space then shows Airborne while the terminal is still visible. The canvas resume handler lacks a terminal-open guard.
- Coverage gap: Existing game/session unit tests pass but do not execute the main module's actual lifecycle orchestration. Add coverage at that production integration boundary when correcting it.
- Maintenance observation: Resource rendering/collision dimensions are duplicated; current values match. Sharing their definitions would reduce drift risk.
- Validation: `npm run check` passed. No implementation changes were made as part of the review.

## 2026-09-19 — Review findings resolved

- Moved lifecycle coordination into the production `GameApplication` controller and tested terminal guards, control entry/cancellation, seed replacement, reset and input clearing. The terminal background regression failed before its fix and passed afterward.
- Resource rendering and collision now consume shared block parts; tests compare actual mesh bounds to every resource collider and verify deposit colors.
- Evidence: `npm run check` passed all eight test files and required checks. Real browser background click/Space kept the terminal paused; explicit return resumed jumping. Overview, pause, restart and replacement seed worked. Visual inspection passed and error logs were empty. See [validation record](testing/review-fixes.md).
- Existing captured-mouse and sustained browser traversal limitations remain. The build retains its bundle-size warning.

## 2026-09-19 — Deep-module entry-point checks

- Implemented: dependency-cruiser 18.3.1 scans `src/`, with `src/packages/` as the package root; `npm run lint:boundaries` is included in `npm run check`. The example package exposes reading summaries through its root interface and keeps the implementation in `lib/`.
- Evidence: scanning all of `src/` passed with 20 modules and 28 dependencies cruised. A temporary `../lib/impl` import from `tests/example.test.ts` failed with the `tests-through-entrypoints` rule; removing it restored a pass.
- Validation: the final `npm run check` passed typechecking, boundary lint, ESLint, all nine tests, formatting, and the production build.
- Limitation: existing game systems remain direct modules under `src/`; the package is a starter template, not an extracted game system.

## 2026-09-19 — Deep island and play modules

- Implemented: island generation now returns matching solid geometry. A single placement implementation handles ship, vents and deposits; resource descriptions no longer import Three.js. Play binds physics to the current island and hides its mutable control session. Rendering consumes read-only observations and no longer supplies obstacles to play.
- Evidence: the pre/post geometry digest matched across four seeds, all 192×192 terrain samples per seed, placements, solids and sampled quads. The final unsandboxed `npm run check` passed 49 tests plus all other checks. Negative import probes confirmed private-entry and renderer-dependency enforcement.
- Browser evidence: seeded entry, jump, terminal pause guard/check/return, restart, overview, seed replacement and keyboard recovery after rejected capture. Screenshots inspected and warning/error logs empty. See [deep-module validation](testing/deep-modules.md).
- Tooling limitation: sandboxed test execution reported file-level successes; a direct no-isolation run stalled. Individual assertions were verified by the unsandboxed suite. Discrete browser movement presses did not visibly change the HUD position; sustained movement and captured mouse look remain unverified in this run.
- Documentation: current entry points and asset-authoring import path are recorded in architecture/package guidance; D013 records the ownership choice, and CONTEXT.md defines the existing island/play terms.

## 2026-09-19 — Third-person camera comparison prepared

- Implemented on a throwaway branch: raised and shoulder camera variants, scroll zoom from 3.5 to 70 metres, active humanoid-centered play, movement-facing avatar, free-pointer inspection and sampled camera pull-in. No camera variant has been selected by the user.
- Evidence: 56 tests and full checks passed; real integrated-browser switching, zooming, ship selection, jumping, terminal use at both zoom extremes, pause, restart and reload were exercised. Desktop and narrow visuals inspected; warning/error logs empty. See [camera-study record](testing/camera-prototype.md).
- Correction: a fixed shoulder offset clipped the avatar in a 390×844 viewport. Scaling the offset with portrait aspect ratio restored full-avatar framing, with a new regression test.
- Limits: browser D/R taps did not visibly move/orbit; held-control feel and camera collision during live traversal need user playtesting. The distant view remains detailed 3D; strategic-map readability is the next prototype ticket.

### Camera feedback — 2026-09-19

The user selected camera B (over the shoulder) and explicitly rejected automatic zoom changes when the humanoid is behind an object. Zoom is exclusively user-controlled. The camera-study branch removes all terrain/solid distance adjustment and keeps FOV fixed. This updates the prototype only; production first-person controls remain until the design handoff. How to show an occluded humanoid without changing zoom remains a separate decision. The earlier sampled pull-in behavior is rejected, not a retained option.

## 2026-09-19 — Strategic map comparison prepared

- Implemented on a throwaway branch: an explored-area atlas and a terrain chart, blending from camera B without changing zoom or FOV. Fixed-size symbols and optional labels expose known deposits; an explicit example mode previews explored content without changing gameplay discoveries.
- Evidence: all 61 tests and full checks passed. Browser inspection covered two seeds, desktop/narrow visuals, map switching, deposit selection, manual zoom blend, example/actual modes, active jumping and terminal use/pause guard in map view. See [record](testing/strategic-map-prototype.md).
- Hypotheses awaiting user feedback: 62–80% transition range, 8 m exploration coverage, unvisited-terrain disclosure, and persistent labels versus compact glyphs.
- Limits: rough 2 m chart terrain and simple vent marks do not establish precise route safety. Narrow views crop the island and guide panels can cover markers; no automatic fit is applied. Held-key traversal and dense future-base marker layout remain unverified.

## 2026-09-19 — Atlas selected; object scale corrected

- User selected map A and required multi-block objects to match their size on the terrain grid. Replaced fixed vent marks and icon-only objects with footprints from actual block definitions; identity callouts remain separate.
- Evidence: full checks passed with 62 tests, including exact footprint bounds against every production collider on two seeds and polygon selection inside/outside an object. Browser inspection verified full-map footprints, ship selection away from its icon, manual scroll blend and narrow rendering. Browser warnings/errors were empty.
- Limits: terrain still uses the prototype's rough 2 m sampling; object footprints are dimensionally accurate in the horizontal plane, not a height-aware navigation map. Narrow views retain existing clipping and panel overlap.

## 2026-09-19 — Occlusion treatments prepared

- Compared through-wall silhouette, obstructing-mesh fading and manual orbit with fixed user zoom. A silhouette preserves scenery but cannot restore surrounding context when the camera is inside it; whole-mesh fading can reveal large terrain interiors. These are observed prototype tradeoffs, not accepted design decisions.
- All 63 tests and required checks passed; integrated-browser ship/vent/inside-geometry comparisons and narrow inspection are recorded in [validation](testing/occlusion-prototype.md). Clear-view silhouette tint was found and corrected. Continuous traversal and performance remain unmeasured.

### Occlusion selection — 2026-09-19

The user selected B (fade obstructing scenery) after the comparison. Broad terrain fading, exposed undersides and abrupt opacity changes remain known prototype limitations, not settled production quality. Camera zoom/framing remains entirely independent of obstruction. The next design checkpoint must turn this direction into implementation acceptance checks. No code or browser behavior changed in recording this selection.

## 2026-09-19 — Third-person controls and localized fading

- Implemented on the production entry: manual shoulder camera, keyboard orbit, free-pointer selection/F use and lifecycle preservation. Fade geometry is a tapered local opening with smooth coverage and a release delay; it does not remove whole terrain chunks or adjust the camera.
- Tests caught heading loss during reset because the old look function ignores paused states; preservation now explicitly updates the new state's heading. Independent orbit aliases remain held until both are released. Browser inspection caught and corrected selection/journal overlap.
- Evidence: 68 tests and full required checks pass. Browser exercised normal start, ship selection, terminal/check/paused background guard/resume, jumping, manual zoom, UI scroll isolation, restart and new seed. Production fading inspected on real seeded ship, terrain and inside-ship render fixtures. Desktop/narrow inspection passed; browser warning/error logs empty.
- Limits: fade uses visible stippling and a small local opening, not full-object alpha transparency. Camera-inside views retain surrounding solid surfaces. Continuous traversal/orbit feel and frame-rate targets are unverified; fixtures establish rendering, not route traversal. See [validation](testing/third-person-controls.md).

## 2026-09-19 — Separate wayfinder experiments before implementation

- The first third-person implementation incorrectly inherited throwaway study routes, source and renderer hooks. Development guards hid the comparisons from builds but left production adapters coupled to experiments.
- Preserved the original prototype branches and the exact pre-cleanup fixture snapshot, then removed the comparison code, styles, tests, scripts and dispatch. Normal play now loads directly in development and builds.
- Durable workflow: AGENTS.md points to the prototype handoff instructions before prototype tickets, implementation transitions and increment handoffs. Separation is required at each increment rather than deferred to final polish.
- Evidence: production checks and all 54 production tests passed; old study URLs loaded normal play and zoom/terminal integration passed browser checks. See [cleanup validation](testing/prototype-cleanup.md).

## 2026-09-19 — Pointer selection review findings resolved

- Extracted the production raycast into `picking.ts`; the scene delegates to this same implementation. Real geometry tests now cover nested ship/resource identifiers, offset canvas projection, avatar exclusion, nearest-hit ordering, faded scenery blocking and no-selection cases.
- Replaced obsolete active-control descriptions in architecture and consolidated prototype details into archived evidence links.
- Evidence: full checks and all 58 tests passed. Integrated-browser ship selection, F use, explicit return and ground deselection passed; visual inspection and browser logs were clear. See [review-fix validation](testing/picking-review-fixes.md).

## 2026-09-19 — Share interpolation between camera and avatar

- Codex review found the visible avatar used the newest physics sample while the camera interpolated between samples. The renderer now consumes one play-owned ground/eye pose, also positioning the avatar before occlusion probing.
- Regression coverage checks fractional-step positions and lifecycle/crouch boundaries. Full checks and focused browser jump/landing/pause inspection passed; high-refresh smoothness is not inferred from screenshots. See [validation](testing/avatar-interpolation.md).

## 2026-09-19 — Shared exploration must survive presentation changes

- User feedback rejected close play showing most of the island while the atlas concealed everything outside explored ground. The earlier accepted 8 m/4 m split was also rejected: one 8 m rule now reveals terrain and identifies deposits.
- Confirmed through a live design interview: explored areas remain visible/active, obstacles do not block reveal, unknown geometry stays concealed at all zoom levels and in the opening menu, object boundaries reveal partially, and starts/resets grant only the initial radius. Physical use still requires proximity.
- Implemented one immutable simulation-owned coverage mask. CPU atlas geometry, GPU surface/shadow clipping, picking and deposit discovery share it. Both views preserve partially revealed objects instead of exposing an entire mesh or only its icon.
- Evidence: 68 tests and full checks pass. Real seed `atlas-92` places a deposit centre about 8.15 m from spawn but its footprint intersects explored ground: its material is identified, the exposed edge can be selected, and the concealed side cannot. Desktop/narrow browser checks exercised zoom, jump, terminal pause/return, restart and replacement seed without warning/error logs. See [validation](testing/active-strategic-atlas.md).
- Limits: half-metre exploration sampling produces a stepped boundary and sliced object edges; chart terrain remains sampled at 2 m. Discrete browser movement/orbit input did not demonstrate sustained traversal. Full integrated feel and measured rendering costs remain for the next increment.

## 2026-09-19 — Accepted automatic-navigation prototype

- The initial standalone motion code produced inconsistent block-relative takeoffs/landings and broken diagonal input. Replacing the custom scenarios with the existing island was also the wrong response: the user wanted deliberate test courses using the game's existing logic.
- The revised study executes the shared movement simulation for actual movement and candidate jump validation, reuses input mapping and the third-person camera, and layers experimental routing and setup/recovery on top. The user accepted it after selecting 1 m up/down and timing A; vision owns those selected values.
- Archive: `codex/navigation-prototype` at `3c8a0b531eaa3ab993c593a08c1bb1a6e6ef4544` (playable changes at `09eb483`). Full checks passed, including 18 prototype cases. Browser checks covered diagonal chords, automatic terrace arrival, pause/resume, disabled manual jump, and selected defaults. Sustained feel was subsequently accepted by the user. Hidden-tab scheduling, layered geometry and whole-island routing remain production validation items.
- Generalized lesson: preserve implementation fidelity where it affects the experiment’s conclusion, while simplifying unrelated work. Custom scenarios and fixtures help isolate a question; separately recreating established behavior can invalidate the answer. The prototype guidance now requires a short question/foundations/controlled-differences plan and gives movement, UI, domain-logic and integration examples. Production readiness is not the completion criterion.
- An earlier return to the design branch happened before the user had tested the build. The workflow now explicitly gates return on user acceptance/finish, preserves a clean committed branch boundary, and records durable decisions on the return branch. No prototype source was merged or copied into design.
- Evidence: [archived validation](https://github.com/FBakkensen/signal-and-shelter/blob/3c8a0b531eaa3ab993c593a08c1bb1a6e6ef4544/docs/testing/navigation-prototype.md).
