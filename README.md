# Signal & Shelter

Experiment 004 — seeded island arrival: arrive beside a broken spaceship on a ceramic voxel shelf, surrounded by stepped vents and amber haze. Check the ship's data link and survey conductive seams, ferric nodules and prismatic silica (copper, iron and silica). This is the first small step toward the [friendly robot-companion vision](docs/vision.md); gathering, robots and power systems come later.

Enter a text seed at the start, or leave it blank for a generated one. The same seed and generator version recreate the same terrain, placements and starting state. Copy the seed from the pause menu or share the game's URL. Restart begins the same island again; Choose another seed returns to the start screen. Seeds are case-sensitive, trimmed and limited to 80 characters in the form. Future generator versions may produce different islands. Progress is not saved.

## Run locally

Use a recent Node.js version compatible with Vite (verified here with Node 26.5.0) and npm.

```sh
npm ci
npm run dev -- --port 5173
```

Open the URL printed by Vite, normally http://127.0.0.1:5173. The page requires WebGL. No external fonts, accounts, or runtime asset services are needed.

## Controls

| Input | Action |
| --- | --- |
| Begin your landing / Keep wandering | Enter first-person play with the selected controls |
| Mouse | Look horizontally and vertically |
| W A S D | Walk / strafe relative to your view |
| Arrow keys | Look left/right/up/down, including while mouse look is active |
| Ctrl + forward movement | Sprint |
| Space | Jump; hold to jump again after landing |
| Shift | Sneak, lower your viewpoint, and avoid walking off ledges |
| M or Overview | Pause in the island overview |
| Escape or pause button | Pause and release the mouse |
| E near the ship console | Open the terminal; gameplay pauses while it is open |
| Restart this island | Reset this seed's position, view, discoveries and data-link check |
| Choose another seed | Return to the seed-entry screen |

Mouse sensitivity and invert-Y are available in the pause panel. **Use keyboard controls** starts play without mouse capture; WASD moves and arrow keys look around. Keyboard controls remain active while the mouse is locked too. The pause panel can switch back to mouse controls. Keep wandering, overview return, and reset preserve the selected mode until reload. Escape pauses either mode. The integrated browser currently rejects mouse capture; keyboard play and its resume flow have been checked there. Captured mouse look still needs a standalone-browser playtest. Drag-to-look is not supported.

Walk within four metres of each resource deposit to survey it. Jump onto half-metre voxel terraces; walking off a ledge causes a fall. The haze edge and the island boundary remain impassable, including while jumping. Stepped vents, resource deposits and ship parts have collision. Terrain rendering and footprint collision both use half-metre cells. There is no fall damage. Progress and look settings last until page reload; a restart clears progress while preserving settings.

This experiment targets keyboard-and-mouse play. Narrow layouts are supported visually; touch movement, sound, terrain editing, swimming, and saved progress are not implemented.

## Validation

```sh
npm run check
```

Runs strict TypeScript checking, type-aware ESLint with zero warnings, automated tests, Prettier verification, and a production build. Individual commands are `npm run typecheck`, `npm run lint`, `npm test`, `npm run format:check`, and `npm run build`. Use `npm run format` to format code.

GitHub Actions runs the same checks for pushes and pull requests.

Gameplay and UI also require real integrated-browser interaction tests, per [the testing workflow](docs/testing.md). See the [deep module refactor checks](docs/testing/deep-modules-2026-09-19.md), [name and UI cleanup check](docs/testing/name-and-ui-2026-09-19.md), [seeded-arrival validation record](docs/testing/experiment-004.md), [arrival history and remaining limitations](docs/testing/experiment-003.md), [controls record](docs/testing/experiment-002.md), and [first experiment record](docs/testing/experiment-001.md).

## Project documents

- [Domain language](CONTEXT.md): island, solids, deposits and terminal.
- [Vision](docs/vision.md): direction and open questions.
- [Architecture](docs/architecture.md): systems and Blender asset workflow.
- [Decisions](docs/decisions.md): choices and rationale.
- [Learnings](docs/learnings.md): observations and limitations.
- [Agent guidance](AGENTS.md): project rules and context reading instructions.

## Name and visual study history

The game is **Signal & Shelter**. The warm console interface from study B was selected for the current prototype; the study's label was not a game or world name. The playable implementation is on `main`. Generator version 2 uses half-metre terrain cells and stepped vent formations; a seed from version 1 will produce different terrain/decorations.

Three interface and visual studies were captured at commit `8df36f9` on `codex/alien-visual-prototypes`. That branch supports `/?variant=A`, `B` or `C` in development. The playable game removes the comparison route and switcher; open `/` to play. No prototype state is migrated.
