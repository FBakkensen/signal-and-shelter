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
