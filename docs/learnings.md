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
