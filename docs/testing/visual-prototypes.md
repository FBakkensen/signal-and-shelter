# Alien visual studies — 2026-09-19

Question: which combination of alien terrain, gentler geometry and interface feels like a friendly robot's new home?

## Validation plan

- Automated: import prototype selection and geometry functions; check variant parsing, wraparound, stable geometry and finite heights across each terrain. Preserve seed URL parameters when switching.
- Browser: inspect each of three rendered studies, switch with buttons and arrow keys, reload a selected variant, change overview/close-up and hide/show the interface. Expect matching scene, layout and visible study state. These are art studies, not walking simulations.
- Layout: inspect desktop and 390px-wide layouts for clipped text and inaccessible controls.
- Regression: visit the normal game route and verify the existing arrival screen. Run `npm run check`.
- Inspect browser errors for the exercised flows. Do not claim collision, traversal, pointer capture or performance validation from these studies.

## Results

- Environment: Codex integrated Chromium browser, Vite at `http://127.0.0.1:5174` (5173 was occupied), desktop viewport and 390×844 override.
- Visually inspected A, B and C at desktop and narrow sizes. No clipped comparison controls observed. Ember's compact heading initially joined two words; added whitespace and visually rechecked the correction.
- Real interactions: Next switched A→B; Right switched B→C; Next wrapped C→A. URL and scene/UI changed together. Reload on C restored C. Closer view and Rotate scene visibly changed the rendered viewpoint; Hide interface removed the overlay and Show interface restored it. Expanded details showed the selected materials, geometry, UI and view state. Current game returned to the existing arrival form with its enabled Begin button.
- `npm run check` passed strict types, zero-warning lint, all six test files (including selection, URL and height/boundary tests), formatting and production build. Build output contains the normal game's assets and excludes the visual studies. The existing approximately 630 kB game bundle warning remains.
- Browser logs: no application errors in the inspected logs. An initial Three.js deprecation warning for PCFSoftShadowMap was corrected to PCFShadowMap before the final checks; the captured log retains that earlier warning.
- Limits: these are static art studies with illustrative UI, not first-person gameplay. World generation, collision, resource collection, power, traversal, motion simulation and frame-rate performance were not evaluated. Existing integrated-browser pointer-lock limitations are unaffected. No user verdict yet.

## Voxel correction — 2026-09-19

User rejected the smooth/low-poly geometry: voxel visuals must remain. Validation scope for this correction: grid-aligned terrain levels and exposed cube geometry in automated tests; real close-up and variant switching in the browser to inspect terrain and formations. UI layout is unchanged, so the earlier narrow-layout evidence remains applicable.

- Red: `node --import tsx --test tests/visual-prototype.test.ts` failed after adding a half-metre-level assertion against the original smooth study heights.
- Green: `npm run check` passed after replacing smooth surfaces with cubic terrain and voxelized formations. Added tests execute the actual geometry builder, checking six faces for one cube, ten external faces for two adjacent cubes, empty output, outward winding, axis-aligned normals, grid coordinates and invalid dimensions.
- Browser: At the existing `/?variant=B`, visually inspected the restored voxel overview, clicked Closer view, switched with Previous to A and then C, and inspected each close-up. Terrain, arches, vents, stones and ship/robot silhouettes now visibly retain square faces and stepped outlines. Inspected application error logs were empty.
- Limitations: No gameplay, collision, performance or editable-voxel claims. Half-metre terrain and finer formation cells are an initial proposed scale, awaiting user feedback.
