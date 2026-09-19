# Strategic map comparison — 2026-09-19

Question: which distant presentation makes known deposits and routes readable without changing zoom or available actions? User feedback pending.

## Validation plan

- Automated: execute exploration coverage and discovery visibility rules, transition endpoints, same-camera projection and marker hit-testing. Verify map inspection cannot survey deposits, and reset clears prototype exploration.
- Browser: scroll from camera B into each map variant, switch maps, inspect known/unknown markers, toggle a clearly labeled explored-preview fixture, jump and use the nearby terminal while in map view, return close, and restart. Inspect desktop and narrow layouts and error logs.
- Run `npm run check`; retain production first-person entry. No automatic camera distance or FOV change. Browser held movement remains a known limitation; record it rather than simulate it with long tap sequences.

## Evidence

- `npm run check` passed all 61 tests plus typechecking, package boundaries, ESLint, formatting and production build. New tests execute actual exploration, marker visibility, map hit-testing and same-camera projection functions. No new dependencies. The existing 636 kB production bundle warning remains.
- Integrated-browser inspection: `signal-and-shelter` and `map-check` seeds. Atlas and chart variants render the island with different disclosure and label treatments. Symbols identify the ship, humanoid and known deposits; small squares represent known vents. Labels remained separated on these example islands; arbitrary dense future bases are untested.
- Real UI actions: Far showed Map 100% at a 70 m camera distance; scroll back reached zoom 74%, distance 32.3 m and map opacity 76%, with the same humanoid position and orientation. The blend was visually inspected. Neither renderer alters the camera distance or FOV.
- Preview explored island displayed all deposit symbols/names with a prominent EXAMPLE PREVIEW label while actual Surveyed remained 0/3. Clicking Cu showed Conductive seams; keyboard Right switched atlas to chart and retained the selected deposit and zoom. Returning to actual exploration removes preview knowledge; the final version also clears preview selection.
- E opened the nearby terminal in full map view. Connection check succeeded; background click/Space left gameplay paused. Explicit return plus Space showed Airborne (y=4.86) while the map remained at 100%. Existing proximity rules remain authoritative.
- A 390×844 chart viewport was visually inspected. Buttons wrap and markers retain fixed screen size. The narrow viewport crops the island and some map content lies behind prototype guide panels; it does not automatically zoom to fit. Final mobile presentation and crowded marker layout remain design work. Restored the normal viewport.
- Browser error/warning logs inspected: empty. One reload briefly loaded an empty Vite style module after formatting; refreshing the CSS file restored the correct layout, visually rechecked on `map-check`. This was preview state, not a retained file change.

## Prototype assumptions and limitations

- Transition starts at 62% zoom and finishes at 80%. Both variants keep selected camera B; the A/B switch now selects map treatment on `?study=map`. This is not automatic zoom.
- Exploration marks 2 m cells within 8 m of the humanoid during active play; current game surveying still identifies deposits within 4 m. Pausing freezes exploration. These distances and the visibility rules are hypotheses for user feedback.
- Atlas darkens unvisited ground; chart shows terrain contours in unvisited areas. Both hide unlocated deposit markers and use ? for located-but-unsurveyed deposits. Surveyed identities persist. Sample preview is presentation-only and never updates game discoveries.
- The map samples terrain at 2 m for a rough chart and does not represent exact walkable gaps or full obstacle footprints. Detailed voxel rendering is unchanged. The crossfade exposes both representations briefly; its appearance needs user feedback. No performance benchmark was performed.
- The known held-key browser limitation still prevents claiming continuous exploration feel or live orbit/traversal verification. Actual unknown-to-surveyed movement on this UI was not browser-verified; production-code tests establish the separate exploration and discovery rules.
- This ticket remains open awaiting human preference. It does not settle the full controls, obstruction handling or production design checkpoint.
