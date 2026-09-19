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
