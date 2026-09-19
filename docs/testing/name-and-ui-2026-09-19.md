# Game name and UI cleanup — 2026-09-19

## Validation plan

- Check that the browser title, visible header, accessibility labels and default seed use Signal & Shelter.
- Start with keyboard controls and open the pause panel to verify the live interface remains connected after the title change.
- Inspect the desktop and 390×844 layouts, then check browser errors.
- Run `npm run check` for TypeScript, lint, automated tests, formatting and production build.

## Results

- `npm run check` passed: strict TypeScript, zero-warning ESLint, all eight test files, Prettier and production build. The existing bundle-size warning remains.
- Integrated browser on local Vite at `http://127.0.0.1:5175`: page title and accessibility tree show Signal & Shelter. The initial seed is `signal-and-shelter`; the header, canvas label and experiment footer use the updated branding.
- Selected keyboard controls, began the island survey and opened the pause panel. The active canvas label and pause controls were present.
- Inspected the default desktop layout and 390×844 pause layout. The full title fits in the header at both sizes. Restored the browser viewport afterward.
- Browser error log was empty.

## Scope

This check covers branding and responsive layout. It does not revalidate terrain, controls feel, captured mouse look or full island traversal.
