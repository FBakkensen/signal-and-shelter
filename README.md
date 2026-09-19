# Stillwild — My First Game

Experiment 002: a small voxel-style island with first-person exploration. Walk through a terraced meadow, find three landmarks, and use the overview to see the whole island. Gameplay direction remains open.

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
| Begin / Keep wandering | Capture the mouse and enter first-person play |
| Mouse | Look horizontally and vertically |
| W A S D | Walk / strafe relative to your view |
| Arrow keys | Look left/right/up/down, including while mouse look is active |
| Ctrl + forward movement | Sprint |
| Space | Jump; hold to jump again after landing |
| Shift | Sneak, lower your viewpoint, and avoid walking off ledges |
| M or Overview | Pause in the island overview |
| Escape or pause button | Pause and release the mouse |
| Start a fresh walk | Reset position, view, movement, and discoveries |

Mouse sensitivity and invert-Y are available in the pause panel. **Use keyboard controls** starts play without mouse capture; WASD moves and arrow keys look around. Keyboard controls remain active while the mouse is locked too. The pause panel can switch back to mouse controls. Keep wandering, overview return, and reset preserve the selected mode until reload. Escape pauses either mode. The integrated browser currently rejects mouse capture; keyboard play and its resume flow have been checked there. Captured mouse look still needs a standalone-browser playtest. Drag-to-look is not supported.

Walk within four metres of each landmark to discover it. Jump onto one-block terraces; walking off a ledge causes a fall. Water and the island boundary remain impassable, including while jumping. Trunks and solid landmark parts have collision; leaves and flowers are decorative. There is no fall damage. Progress and look settings last until page reload; a fresh walk clears progress while preserving settings.

This experiment targets keyboard-and-mouse play. Narrow layouts are supported visually; touch movement, sound, terrain editing, swimming, and saved progress are not implemented.

## Validation

```sh
npm run check
```

Runs strict TypeScript checking, type-aware ESLint with zero warnings, automated tests, Prettier verification, and a production build. Individual commands are `npm run typecheck`, `npm run lint`, `npm test`, `npm run format:check`, and `npm run build`. Use `npm run format` to format code.

Gameplay and UI also require real integrated-browser interaction tests, per [the testing workflow](docs/testing.md). See the [current controls test record and remaining limitations](docs/testing/experiment-002.md), and the [first experiment record](docs/testing/experiment-001.md).

## Project documents

- [Vision](docs/vision.md): direction and open questions.
- [Architecture](docs/architecture.md): systems and Blender asset workflow.
- [Decisions](docs/decisions.md): choices and rationale.
- [Learnings](docs/learnings.md): observations and limitations.
- [Agent guidance](AGENTS.md): project rules and context reading instructions.
