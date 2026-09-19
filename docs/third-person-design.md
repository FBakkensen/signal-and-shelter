# Third-person play and strategic zoom

Status: design checkpoint draft, 2026-09-19. Accepted choices are distinguished from proposals below. Production remains first-person; the camera, atlas and occlusion studies are throwaway evidence, not the production implementation.

Owning checkpoint: [Settle the design and define playable implementation increments](https://github.com/FBakkensen/signal-and-shelter/issues/9). The [wayfinder map](https://github.com/FBakkensen/signal-and-shelter/issues/5) indexes decision rationale.

## Accepted experience

- [Camera](https://github.com/FBakkensen/signal-and-shelter/issues/6): over-the-shoulder B, anchored to the humanoid. Scroll continuously from close play to distant strategic presentation. Zoom is exclusively user-controlled. No obstruction-driven distance, FOV, heading or tilt compensation.
- [Atlas](https://github.com/FBakkensen/signal-and-shelter/issues/7): A, with dark unvisited terrain, readable explored terrain, persistent discovered deposit identities and world-scale object footprints. Multi-part objects preserve their actual horizontal extent and gaps; symbols and labels supplement size. Retain the visible grid and voxel aesthetic.
- [Occlusion](https://github.com/FBakkensen/signal-and-shelter/issues/10): fade obstructing scenery and restore it when clear. Preserve collision and interaction rules. No through-wall humanoid silhouette is selected.
- [Controls](https://github.com/FBakkensen/signal-and-shelter/issues/8): screen-relative movement at every zoom, free pointer, explicit selection/use, active strategic play. Zoom does not grant remote actions or disable actions.

## Control contract

| Input                | Intended behavior                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| WASD                 | Move relative to the current camera heading; humanoid faces movement.                              |
| Space / Ctrl / Shift | Jump / sprint / sneak at all zoom levels, preserving existing physical rules.                      |
| Q/E or Left/Right    | Orbit the camera around the humanoid.                                                              |
| Home                 | Restore starting camera heading, preserving zoom.                                                  |
| Wheel over world     | Change zoom; camera tilt follows the selected framing curve.                                       |
| Wheel over UI        | Scroll that UI without zooming the world.                                                          |
| Left-click object    | Select and inspect. Does not move or pause the humanoid.                                           |
| Use button / F       | Use the selected object when allowed and within reach; with no selection, use the nearby terminal. |
| Esc                  | Pause.                                                                                             |

No pointer capture or drag-to-look. Arrow keys no longer mean first-person look. Keyboard focus in form fields belongs to the field; gameplay shortcuts must not consume typing. A selected out-of-range/non-actionable object must not silently cause an action on another object. Existing terrain/objects still occlude pointer picking, even when visually faded; information does not grant physical reach.

Terminal opening and focus loss pause play and clear held inputs. Resume is explicit; preserve heading and zoom. Restart/seed replacement resets humanoid, exploration, selection and progress while preserving heading and zoom. Remove the old separate paused overview once the strategic view is integrated; Esc supplies pause.

[Click-to-move/shared navigation](https://github.com/FBakkensen/signal-and-shelter/issues/11) follows this effort. Reserve right-click terrain for that feature; do not ship a misleading movement affordance before it exists. Its accepted direction is immediate WASD route cancellation, unreachable-target feedback and shared navigation for humanoid/future robots. No robot gameplay here.

## Proposed defaults for checkpoint confirmation

These are implementation starting values and visual refinements, not yet accepted decisions.

1. Keep the tested camera range (3.5–70 m), fixed 55° FOV and camera B framing. Blend into the atlas over 62–80% of scroll range. One continuous zoom value drives both views; crossing the blend does not change position, heading, selection or simulation. Tune numbers through playtests without changing the agreed behavior.
2. Exploration reveals an 8 m neighborhood during active play. Located but unsurveyed deposits show an unknown marker and neutral footprint; existing 4 m surveying reveals identity. Unvisited ground stays dark, ship and humanoid remain known, and zooming out never reveals new knowledge. Exploration freezes while paused and resets with the island. Keep the prototype's readable 2 m chart grid initially, but derive object bounds from real geometry. It is a strategic chart, not a precise navigation/reachability guarantee.
3. Fade over roughly 150–200 ms, with a short release delay to avoid flicker. Localize terrain fading to the obstruction region instead of fading an entire chunk. Preserve surrounding terrain and solid object identity. Camera-inside cases require a readable local opening without changing camera framing; exposed broad terrain undersides from the prototype are not a shippable outcome. Start from the prototype's 18% opacity and tune for legibility. This refinement is untested.

## Proposed playable increments

### 1. Third-person controls and usable close play

Replace pointer lock and keyboard-look modes with the agreed camera/input contract. Integrate B-style obstacle fading for close play alongside the camera so this increment is usable around the ship. Retain seeded starts, terminal, progress, pause/resume and reset behavior. Keep the old overview only as a clearly temporary existing feature until increment 2 replaces it; do not add new overview behavior.

Acceptance: start a seeded island; move, jump, sprint and sneak; orbit with both bindings; Home restores heading without zoom; select and use the terminal; reject out-of-range use. Scroll while moving and over panels. Focus loss/terminal pause clear inputs; explicit resume works. Obstructed and camera-inside views stay readable without camera adjustment. Clear views restore materials. Production starts without a prototype query.

### 2. Active strategic atlas and exploration

Integrate atlas A with the same camera state and active play. Add exploration coverage, unknown/surveyed identities, selectable true-size footprints and a smooth transition. Remove the separate paused overview and its shortcut/UI. Keep selection and interaction behavior across both presentations; manage labels so they do not hide the humanoid or selected target.

Acceptance: continuous manual zoom in both directions preserves location, heading and action availability. Known resources remain identifiable, unknown ones stay unknown, and every multi-part footprint matches its geometry. Jump and use the nearby terminal in map view. Pause, restart and seed replacement preserve only the agreed state. Desktop and 390×844 views retain usable controls and readable relevant markers without automatic fitting.

### 3. Integrated playtest and production handoff

Exercise the combined camera, atlas and occlusion behavior on representative seeds and around terrain/ship/vents. Address transition flicker, object/terrain fading, overlapping labels and lifecycle regressions. Remove comparison switchers, example-reveal modes and obsolete first-person settings from the production flow. Record measured rendering costs and actual test limits; do not invent a performance target without an agreed device baseline.

Acceptance: all changed logic covered by real production-code tests; `npm run check` passes; integrated-browser input and visual checks recorded. Human sustained traversal validates feel where browser automation cannot hold controls faithfully. Document any remaining blockers rather than declaring completion from screenshots or unit tests alone.

Execution tickets will be created and linked in this order after checkpoint confirmation. These are proposed increments, not work already performed.

## Implementation boundaries and migration

Keep island generation, geometry and collision ownership in `island`; preserve public package entry points. Keep movement, proximity, discoveries and input/session lifecycle in `play`. New exploration observations belong with gameplay knowledge, not in a render-only set that can diverge from real discoveries. Camera math and input mapping must be independently testable; Three.js materials, picking and DOM effects stay in application adapters. Do not copy prototype classes wholesale into production.

D007 remains the implemented first-person baseline until migration. On acceptance, record its replacement design as accepted but pending implementation; on delivery, mark D007's camera/input/overview contract superseded while retaining unchanged movement physics. Update the glossary's strategic-view/overview implementation status only as the migration lands.

## Evidence and unresolved limits

See [camera](testing/camera-prototype.md), [atlas](testing/strategic-map-prototype.md) and [occlusion](testing/occlusion-prototype.md) records. Prototype checks passed 63 tests; this is not validation of the integrated design. Browser sustained traversal, dense future-base labels and production performance remain unverified. Occlusion transition/terrain localization proposed here still requires implementation and validation.
