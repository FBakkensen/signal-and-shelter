# Feet and stance visual comparison — 2026-09-20

Status: user selected B on 2026-09-20: 440 mm visible total span, 160 mm individual foot width, centres at ±140 mm. This accepts the visual proportions; physical support shape/orientation and authoritative traversal remain separate, unresolved design choices.

- Ticket: [Choose narrower humanoid feet and stance](https://github.com/FBakkensen/signal-and-shelter/issues/33).
- Return branch: `codex/deterministic-simulation-foundation`.
- Clean starting commit: `59371a3ef734e8fa692b99f7e9de9a14bc10743c`.
- Throwaway branch: `codex/feet-stance-prototype`; remain here through feedback. Archive this accepted comparison, verify the remote commit, then return; never merge.
- Verified command: `npm run prototype:feet -- --port 5174 --strictPort`; open `/feet-prototype.html`.

## Question and controlled differences

Compare the existing 520 mm visible foot span with 440 mm and 400 mm candidates. Change lateral stance and foot width only. Extract the actual procedural avatar into `src/avatar.ts`, called by both normal rendering and the comparison. Preserve upper-body proportions, materials and the distance-based leg pose. Shelf blocks are 500 mm cubes; a separate comparison surface uses a two-block width.

Physics defines possibilities independently of visible geometry. The user specifically wants alignment here, not general mesh-driven rules. The 600/440/400 mm axis-aligned support squares are independently authored study proposals, not computed mesh bounds. The 600 mm clearance outline stays unchanged. Baseline production does not have this separate full-support square; the study labels that distinction. Rendered stance, orientation and stride can differ from a proposed square without changing the rule. Exact support shape, orientation, dimensions and movement execution remain open in the parent physics decision.

No motion simulation, automatic traversal, grounding correction or body collision was changed. Shelf offset is an inspection control, not movement. The study retains the existing visual leg rotation, whose sole heights change during a stride; it does not demonstrate physically supported walking, turning or landing. Appearance of the torso/head is preserved; the top inspection view temporarily fades it to expose the feet.

## Validation plan and results

- Actual-mesh tests execute the shared avatar factory, verify the three foot spans, retained 220 mm depth and 550 mm torso, and opposed leg rotations at rest/maximum stride. Pass.
- Tests execute the study support-width predicate at exact shelf limits, positive/negative offsets and wider shelves; variant parsing fallback is covered. Pass. This predicate compares authored horizontal extents only; it is not authoritative support physics.
- Final unsandboxed `npm run check`: 71 tests pass, typecheck, dependency boundaries, strict ESLint, formatting and normal production build pass. Existing bundle-size warning remains. Earlier sandboxed run reported file-level totals; final run confirmed individual assertions.
- Integrated Chromium browser: switched A/B/C, front/angle/top, heading to 45 degrees, walking pose to maximum, offset to 150 mm, one/two-block shelf and outline toggle. UI values and support fit status updated. Variant C survived reload via URL; slider arrow keys changed sliders without switching variants.
- Desktop and 390×844 screenshots inspected. Initial top view hid feet behind the head; fixed with upper-body transparency and material recompilation. Initial narrow intro overlaid the shelf; moved intro into document flow. Reinspection showed visible feet and readable intro. Narrow controls are vertically scrollable, with a fixed variant switcher.
- Normal entry: began a seeded landing and inspected the baseline avatar rendered by the extracted shared helper. Browser warning/error logs empty in normal entry and comparison. No sustained normal-play movement retest or scale measurement is claimed.

## Remaining work

User selects/revises visual proportions; independently settle aligned support dimensions/shape in the physics interview. Only after explicit acceptance or finish: commit, push, verify archive, return to the recorded branch and capture durable findings there. Do not promote comparison source into production.
