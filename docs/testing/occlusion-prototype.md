# Occlusion comparison — 2026-09-19

Question: how should camera B show an obstructed humanoid without changing zoom? Human selection pending.

## Validation plan

Exercise real Three.js geometry for clear, blocked and camera-inside cases; verify material restoration, no camera mutation and no silhouette in clear view. In the integrated browser compare A/B/C on real seeded ship/vent fixtures, inspect terrain intersection, manually scroll/orbit, select geometry, and inspect desktop/narrow layouts.

## Evidence

- `npm run check` passed 63 tests, strict types, lint, package boundaries, formatting and build. Tests execute the actual obstruction detector/treatment with real Three.js meshes, including inside-solid ray intersections, material isolation/restoration and fixed camera/FOV. Existing bundle warning remains.
- Integrated browser on `map-check`: A shows a mint silhouette through the ship and vent; B makes intervening meshes translucent; C leaves the view blocked. Switching variants retained 35% zoom, approximately 10 m distance and 55° FOV. All three inside-ship views were inspected.
- Terrain-intersection fixture in B reveals broad terrain removal and exposed undersides: whole-mesh fading is a rough comparison, not a finished solution. Silhouette alone does not restore surrounding navigation context when inside geometry.
- Real scroll changed zoom to 48% (14.7 m); Q changed the fixture orbit. Clicking ship geometry selected ship. Free play used the existing controller; Space was exercised, but this record does not establish held-control traversal or continuous occlusion behavior.
- 390×844 inspected. Moved status above the wrapped switcher, then visually rechecked. Panels still occupy substantial screen space. Restored normal viewport.
- Browser revealed a clear-view self-occlusion tint in A. Restricted silhouette visibility to actual scenery obstruction, added regression assertion and visually rechecked clear free play.

## Limits and scope

Fixtures use render-only humanoid poses around actual island geometry; they are explicitly labeled examples, not traversed routes or discoveries. Free play retains camera B. Temporary controls are Q/R and arrows for comparison, not the accepted final bindings. No terminal interaction is implemented in this isolated comparison.

Fading probes three points on the humanoid and switches whole meshes abruptly to 18% opacity; thin edge occlusions can be missed, terrain chunks may disappear broadly, and transparency sorting remains rough. Silhouette uses a depth-tested duplicate and may show overlapping body parts when blocked. No performance claim or final visual tuning. Scenery continues to block picking even when faded. The strategic atlas remains a separate study.
