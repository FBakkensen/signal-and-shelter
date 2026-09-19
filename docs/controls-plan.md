# Experiment 002 — Minecraft-like controls

Date: 2026-09-19. Status: Implemented after user approval, with browser validation limitations recorded in [experiment 002](testing/experiment-002.md). The original plan below is retained as design context.

Implementation status: the user rejected drag-to-look and requested keyboard play instead. WASD movement and arrow-key look work in both active modes. Keyboard play starts/resumes without mouse capture and remembers the selection across pause/overview/reset. Captured mouse look remains unverified because the integrated browser rejects it. Automated checks pass; a focused browser check verified keyboard selection, pause, Keep wandering and jump input.

## Goal and scope

Make exploring the existing island feel like direct first-person movement. The user explicitly requested more Minecraft-like controls. First person is the recommended interpretation, pending feedback; exact Minecraft physics parity is not a requirement.

Keep this a small playable experiment: mouse look, walking, sprinting, jumping, sneaking, and reliable pause/overview transitions. Mining, placement, inventory, swimming, survival mechanics, and a full voxel engine are outside this experiment. Preserve the island and discovery loop.

Reference: [Minecraft's official controls guide](https://www.minecraft.net/en-us/article/minecraft-controls) specifies mouse look, WASD movement, Space to jump, Ctrl to sprint, and Shift to sneak. The implementation choices below are our proposed defaults, not claims of exact Minecraft behavior.

## Findings from the current implementation

- `controls.ts` already maps WASD and arrows to movement. Shift runs; Q/E and dragging rotate horizontally.
- `game.ts` already normalizes diagonals, moves relative to yaw, substeps collision, and slides along blocked axes. Keep these useful properties.
- There is no player height, vertical velocity, grounded state, or camera pitch. Terrain height directly determines avatar height in `scene.ts`.
- One-metre steps up and down happen automatically. Drops greater than one metre are blocked. Jumping therefore requires changing movement and collision, not just binding Space.
- The camera sits 15 metres behind and 12 metres above the player, with position smoothing and a 44-degree vertical field of view. This produces a distant view and delayed camera response.
- Obstacles are horizontal circles with no vertical extent. A jumping controller needs an explicit policy for these colliders.
- Pause, overview, blur, and visibility handling exist, but pointer lock does not. Existing drag rotation does not recheck pause/overview on every move event.

Browser exploration on 2026-09-19: loaded the app at localhost:5174, started exploration, dragged the view, pressed W and Space, and inspected screenshots. Dragging visibly changed the camera heading. The short W press did not change the displayed coordinates, so this is not a movement validation. Space produced no visible jump, consistent with the source. No new controller, pointer lock, sustained movement, or performance was tested.

## Proposed controls

| Input | Behavior |
| --- | --- |
| Mouse | Immediate horizontal and vertical look while captured |
| WASD / arrows | Move relative to horizontal view direction; A/D strafe |
| Ctrl + forward movement | Hold to sprint; release or stop moving forward to end sprint |
| Space | Jump when grounded; holding repeats after landing, never in midair |
| Shift | Hold to sneak: slower movement, lower eye height, grounded ledge protection |
| Escape | Release mouse, clear inputs, and pause |
| M | Enter island overview and release mouse; movement and physics stop |
| Begin / Resume / Return to exploration | Explicit click captures the mouse and starts play |

Sneak overrides sprint. Remove Q/E turning from the default scheme. Keep M as this project's overview shortcut. Defer double-tap sprint and alternate camera modes until the basic feel is evaluated.

## Implementation sequence

### 1. First-person look and input lifecycle

- Add pitch alongside yaw, clamp pitch just short of vertical, and map relative mouse motion without frame-time scaling. Movement uses yaw only, so looking up does not change walking speed.
- Position the camera at player eye height, hide the local avatar in first person, and remove follow-camera lag during play. Begin with a tunable 70-degree vertical FOV and 1.62-metre standing eye height; these are starting values to playtest.
- Add sensitivity and invert-Y settings in the pause panel. Start without head bob or sprint FOV effects.
- Request pointer lock from explicit button/canvas clicks. Only enter active play after capture succeeds. On lock loss, error, Escape, blur, or hidden page, clear input and pause. Display a retry message if capture is unavailable; never silently run without working look controls.
- Model welcome, playing, paused, and overview transitions explicitly. Returning from overview presents a click-to-resume action; it must not rely on automatic recapture. Preserve position, view angles, and vertical motion across a pause, with no accumulated-time catch-up.
- Add a small central crosshair and update help text and canvas accessibility description. Keep menus operable with an unlocked pointer and keyboard focus.

Deliverable: look and walk around the island from eye level, with reliable capture and release. Existing terrain stepping is temporary at this checkpoint.

### 2. Grounded movement, jumping, and sneaking

- Introduce feet height, vertical velocity, and grounded state. Run movement on a bounded fixed simulation step with collision substeps; render interpolation must not delay mouse orientation.
- Replace terrain-snapped vertical movement with gravity and landing. A one-block rise requires jumping; walking off a ledge falls naturally. Target a jump slightly higher than one block (roughly 1.25 metres), with tunable gravity and takeoff speed.
- Use a player footprint and height for collision. Evaluate all overlapped terrain cells, resolve walls and support consistently, and prevent tunnelling at sprint speed or during long frames. The current height field remains sufficient for solid ground without caves or overhangs.
- Give solid landmark/trunk colliders vertical bounds consistent with their visible geometry; prevent jumping through their sides or tops. Decide explicit foliage behavior (recommended: non-solid decoration) and inspect close-up clipping. Derive collision data separately from rendering where practical so production collision can be tested without WebGL.
- Implement grounded sneak ledge protection, including diagonal corners; it should prevent stepping into unsupported space, not cancel a deliberate airborne jump. Lower the camera while sneaking and check standing clearance where solid overhead obstacles exist.
- Start tuning near 4.3 m/s walk, 5.6 m/s sprint, and 1.3 m/s sneak. These are proposed feel targets rather than measured equivalence. Preserve normalized diagonal movement and wall sliding.
- Keep water cells and the finite world boundary impassable even while airborne, so jumping cannot bypass the island boundary. No fall damage in this experiment. Provide a safe-spawn recovery for invalid/out-of-world positions.
- Reset must clear velocity, grounded/crouch state, held inputs, pitch, and discoveries. Preserve proximity discoveries and count horizontal travel without vertical jump inflation; evaluate discovery independently of whether horizontal input is held.

Deliverable: jump onto a one-block terrace, fall and land correctly, sprint across open ground, and sneak to a ledge safely.

### 3. Validate the complete exploration loop and tune

- Automated production-logic tests: input priority and release; yaw/pitch limits; normalized movement; no pitch-dependent speed; jump apex and landing; no midair jump; held jump; collision at edges/corners; head clearance; sneak protection; airborne water/boundary rejection; reset and invalid-time handling.
- Test equivalent movement and jump outcomes at different render frame rates, with frame stalls bounded. Replace obsolete automatic-one-block-step assertions rather than preserving incompatible behavior.
- Test lifecycle transitions with production transition logic: lock success/failure/loss, repeated Escape, overview return, blur while moving, and resume with keys previously held. Integration must still exercise actual browser capture.
- Run `npm run check`, then perform real integrated-browser mouse and keyboard interactions. Specifically verify unlimited turning, vertical look, simultaneous movement and look, Ctrl combinations not triggering browser shortcuts, jump/landing, sneak at corners, Escape/capture loss, resume, overview, and reset.
- Walk to all three landmarks under the new traversal rules and visually inspect close terrain, foliage, landmark clearance, HUD, and narrow layout. The current reachability test assumes automatic stepping and must be replaced or supplemented with traversal checks matching the new controller.
- Record exact actions and unresolved failures in `docs/testing/experiment-002.md`. If the integrated browser tooling cannot perform real relative mouse input or sustained key holds, report that validation gap and require a real playtest before declaring the controller verified.
- Update README controls and architecture only after implementation; update decisions and learnings with actual findings. Ask for user feedback on sensitivity, speed, jump weight, and comfort after the playable experiment.

## Code boundaries

Keep `controls.ts` responsible for translating keys and mouse deltas into intent; `main.ts` owns DOM events and browser pointer-lock calls; `game.ts` owns simulation and transitions; `scene.ts` reads state to render the camera and world. Extract a small pure movement/collision module if vertical physics makes `game.ts` unwieldy. Avoid adding a general physics dependency unless this bounded implementation proves insufficient.

## Completion criteria

The player can click to enter, look freely, walk/strafe, sprint, jump one-block terraces, sneak along ledges, visit every landmark, and reliably leave and resume play. No stuck inputs, faster diagonal movement, midair jumps, terrain tunnelling, or mouse capture in menus. Automated checks pass and browser evidence supports each changed flow; remaining feel judgments are explicitly left for user feedback.
