# Stillwild — My First Game

Experiment 001: a small voxel-style island to explore. Walk through a terraced meadow, find three landmarks, and use the overview to see the whole island. Gameplay direction remains open.

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
| W A S D or arrow keys | Walk relative to the camera |
| Shift + movement | Run |
| Q / E or drag the world | Rotate the camera |
| M or Overview | Toggle the island overview; movement stops |
| Escape or pause button | Pause / resume |
| Start a fresh walk in the pause panel | Reset position and discoveries |

Walk within four metres of each landmark to discover it. Water, large terrain steps, and tree trunks block movement. Ordinary one-block steps are automatic. Progress lasts until reset or page reload.

This experiment targets keyboard-and-mouse play. Narrow layouts are supported visually; touch movement, sound, jumping, terrain editing, and saved progress are not implemented.

## Validation

```sh
npm run check
```

Runs strict TypeScript checking, type-aware ESLint with zero warnings, automated tests, Prettier verification, and a production build. Individual commands are `npm run typecheck`, `npm run lint`, `npm test`, `npm run format:check`, and `npm run build`. Use `npm run format` to format code.

Gameplay and UI also require real integrated-browser interaction tests, per [the testing workflow](docs/testing.md). See the [first experiment test record](docs/testing/experiment-001.md).

## Project documents

- [Vision](docs/vision.md): direction and open questions.
- [Architecture](docs/architecture.md): systems and Blender asset workflow.
- [Decisions](docs/decisions.md): choices and rationale.
- [Learnings](docs/learnings.md): observations and limitations.
- [Agent guidance](AGENTS.md): project rules and context reading instructions.
