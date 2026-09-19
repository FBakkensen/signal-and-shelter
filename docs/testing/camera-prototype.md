# Third-person camera comparison — 2026-09-19

Question: raised camera or over-the-shoulder camera for close play, scrolling toward an overhead view? Human decision pending. This is a throwaway comparison for [Compare raised and over-the-shoulder third-person cameras](https://github.com/FBakkensen/signal-and-shelter/issues/6).

## Validation plan

- Automated: run the actual camera solver at both zoom limits, with rotated headings, terrain walls and ship-like obstacles; assert bounded zoom, continuous endpoints, safe pull-in and unobstructed recovery. Execute the production play controller through the prototype adapter to check screen-relative movement, movement-facing avatar, pause/input clearing, switching and zoom-independent terminal availability.
- Browser: switch A/B using buttons and arrows, scroll closer/farther, rotate, walk, jump, pause/resume, select the ship, use its terminal at both zoom extremes, restart, and reload a variant URL. Observe camera/avatar framing, state readout and interaction results; inspect desktop and narrow layouts and error logs.
- Regression: normal game entry still uses its original flow; production build excludes the development prototype. Run `npm run check`.
- Limit: discrete browser key presses do not establish sustained movement feel. Do not substitute long tap sequences for a held-key test. Human comparison is required before resolving the ticket. Strategic-map rendering is a separate ticket.

## Results

- `npm run check` passed: 56 actual test assertions, strict types, boundary lint, ESLint, formatting and production build. The sandboxed runner hid assertion details; the final suite ran outside the sandbox. A new test fixture initially used haze-height terrain and correctly failed movement; changing the fixture to a dry shelf restored the intended movement scenario.
- Browser: Codex integrated browser, desktop viewport approximately 2046×1230 and a temporary 390×844 viewport. Inspected A raised close/default framing, B shoulder close/default framing, and far overhead framing. Both variants preserve the existing cubic terrain and ship asset.
- Actual interactions: button and arrow-key variant switching; scroll to both zoom limits; pointer ship selection at close and far zoom; E opened the terminal at both extremes; connection check changed its status. Background click/Space left terminal play paused. Explicit return resumed play. Space at far zoom produced an Airborne indicator and y=4.89. Escape/Space remained paused and grounded. Restart cleared the connection result. Reload restored variant B and reset transient play/zoom state.
- Narrow inspection found shoulder offset clipping the humanoid on the left. Reduced the offset with portrait aspect ratio, added an automated framing regression and visually rechecked the full avatar at close zoom. Narrow controls and terminal panel fit the viewport. Restored the browser's default viewport afterward.
- Inspected browser warning/error logs: empty. The prototype's runtime error counter remained zero.
- Normal game regression: Return to current game opened the original arrival UI; selecting keyboard controls and starting a random seed retained first-person play; Space showed Airborne. Production output contains no camera-study module, switcher or study styles. The existing approximately 636 kB game bundle warning remains.

## Limits and next decision

- Actual D and R key taps did not visibly change position or orbit. The tool exposes discrete presses rather than held keys, so sustained movement, orbit feel and live obstacle traversal remain unverified in the browser. Production-controller tests establish movement/facing and rotated movement; solver tests establish terrain/solid pull-in and clear recovery. Those are not a hands-on playtest.
- Camera collision is an unsmoothed sampled boom with clearance. It is a prototype, not a proven final occlusion solution: tight spaces may cause abrupt pull-in and need user feedback. No fade-through-wall behavior or camera lag was added.
- The distant view is still a perspective rendering of the island, not the planned simplified strategic map. Deposit selection hides unsurveyed names; this study does not implement exploration fog, map symbols or robots.
- Q/R orbit are temporary comparison bindings, while left/right arrows switch variants. They do not settle the replacement control contract. Mouse remains free; no mouse capture or drag-to-look is used.
- Human selection of raised versus shoulder framing is pending. Keep the ticket open; do not promote either option into production before the map's design checkpoint.

## User correction: manual zoom only — 2026-09-19

The user selected B and explicitly rejected all automatic zoom changes behind objects. Removed the terrain/solid boom pull-in entirely; the camera solver no longer receives scenery. FOV remains fixed. Objects can obscure the humanoid or intersect the camera for now; a separate design decision must choose how to address this without changing zoom. Earlier pull-in evidence above describes the rejected version.

Validation plan: regression compares clear and obstructed island camera frames at close/middle/far zoom and while orbiting, including FOV and retained user zoom. Run full checks. In the integrated browser inspect B, exercise manual scroll and verify the distance readout; continuous movement behind an object still requires held-key playtesting if the tool cannot provide it.

Result: `npm run check` passed all 56 tests and required checks. The new clear-versus-obstructed camera regression covers both variants, three zoom levels and orbit, with identical camera frames and fixed FOV. In the integrated browser, camera B loaded at 35% (10 m); a real scroll reached 100% (70 m), with unchanged humanoid position. Visual inspection passed. Held-key traversal behind scenery remains unverified by browser tools; no claim of that interaction is made.
