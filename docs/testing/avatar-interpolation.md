# Avatar interpolation review fix — 2026-09-19

Codex PR review identified mixed render timing: the camera used interpolated coordinates but the visible avatar used the latest fixed-step coordinates.

Validation plan: exercise fractional simulation intervals through the production controller; assert matching eye/ground interpolation for movement and jumping, crouch eye offset, and pause/resume/reset boundaries. Inspect normal seeded play and jumping in the integrated browser, then run full checks.

The production controller now exposes one render pose with ground and eye positions derived from the same interpolation. Main samples it once per frame. Scene places the avatar at its ground position before the occlusion adapter derives its target; the camera uses its eye position.

`npm run check` passed. The added controller regression executes 1.5 and 0.25 physics-step intervals, verifies intermediate positions rather than the next physics sample, and covers standing/crouching offsets and lifecycle boundaries. Integrated-browser normal startup, jump (Airborne HUD and visible airborne humanoid), landing and Esc pause passed. Browser warning/error logs were empty. The local server had stopped; it was restarted before testing in a fresh tab.

Browser screenshots do not establish high-refresh motion quality; the interpolation invariant is checked automatically. Sustained traversal/performance limitations remain unchanged. Existing bundle-size warning remains.
