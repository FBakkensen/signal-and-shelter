# Signal & Shelter

## Navigation prototype archive

This branch is a throwaway navigation study and must never be merged. Its normal entry opens four controlled voxel courses. Run `npm ci`, then `npm run dev -- --port 5173`; run `npm run check` for validation. The production README below describes the baseline, not this experiment.

Right-click requests a destination, including unknown ground. WASD cancels it; Q/E or Left/Right arrows orbit, Home restores heading, and the mouse wheel zooms. Jumping is automatic; Space, Ctrl and Shift have no gameplay action. Timing A (0.12 s setup / 0.12 s recovery) and a shared 1.0 m maximum jump up/down are the selected defaults. Compare A/B/C timings, try the shared 0.5/1.0 m limits, and use the terminal near spawn to check running versus explicit pause.

Start with **Terraces**, then **Jump or detour**. Brisk timing can jump the low bar while weighty timing makes the walking detour cheaper. **Explore toward a target** includes a wall and an uncrossable gap; **Low ceiling** exercises body clearance. Only the requested destination is marked.

The custom courses use the game’s movement simulation, gravity, collisions, keyboard direction mapping, exploration and third-person camera. An experimental eight-direction planner with smoothed walking routes and an automatic-jump controller sit above that shared logic. It does not establish final navigation architecture or whole-world routing. See [validation and limitations](docs/testing/navigation-prototype.md). Return branch: `codex/navigation-design`.

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

| Input                               | Action                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------- |
| Begin your landing / Keep wandering | Enter third-person play with a free pointer                            |
| WASD                                | Move relative to camera heading; humanoid faces movement               |
| Q/E or Left/Right arrows            | Orbit                                                                  |
| Home                                | Restore starting heading without changing zoom                         |
| Scroll over world                   | Manual zoom; UI scrolling never zooms the world                        |
| Left-click                          | Select/inspect; empty ground clears selection                          |
| F / terminal button                 | Use selected ship within reach; with no selection, use nearby terminal |
| Ctrl / Space / Shift                | Sprint / jump / sneak with existing physics                            |
| Escape / pause / focus loss         | Pause; explicit resume required                                        |
| Restart / new seed                  | Reset progress and selection; preserve camera heading and zoom         |

No mouse capture or drag-to-look. Scenery fades locally around an obstructed humanoid; it never changes camera zoom or FOV. Scroll out into the active strategic atlas. Both views share an 8 m exploration radius: unexplored terrain and objects stay concealed, explored ground stays visible, and a deposit is identified as soon as any part is revealed. The paused overview and M shortcut are retired. See [atlas validation](docs/testing/active-strategic-atlas.md).

Explore within eight metres to reveal terrain and resource deposits; there is no separate surveying distance. Jump onto half-metre voxel terraces; walking off a ledge causes a fall. The haze edge and the island boundary remain impassable, including while jumping. Stepped vents, resource deposits and ship parts have collision. Terrain rendering and footprint collision both use half-metre cells. There is no fall damage. Progress and camera settings last until page reload; a restart clears progress while preserving settings.

This experiment targets keyboard-and-mouse play. Narrow layouts are supported visually; touch movement, sound, terrain editing, swimming, and saved progress are not implemented.

## Validation

```sh
npm run check
```

Runs strict TypeScript checking, package entry-point checks, type-aware ESLint with zero warnings, automated tests, Prettier verification, and a production build. Individual commands are `npm run typecheck`, `npm run lint:boundaries`, `npm run lint`, `npm test`, `npm run format:check`, and `npm run build`. Use `npm run format` to format code.

Git commits also format staged files with Prettier, then run typechecking and tests.

GitHub Actions runs the same checks for pushes and pull requests.

Gameplay and UI also require real integrated-browser interaction tests, per [the testing workflow](docs/testing.md). See the [deep-module validation](docs/testing/deep-modules.md), [name and UI cleanup check](docs/testing/name-and-ui-2026-09-19.md), [seeded-arrival validation record](docs/testing/experiment-004.md), [arrival history and remaining limitations](docs/testing/experiment-003.md), [controls record](docs/testing/experiment-002.md), and [first experiment record](docs/testing/experiment-001.md).

Implemented deep TypeScript modules live in `src/packages/island` and `src/packages/play`; see the [package guide](src/packages/README.md) for their entry points.

## Project documents

- [Vision](docs/vision.md): direction and open questions.
- [Architecture](docs/architecture.md): systems and Blender asset workflow.
- [Decisions](docs/decisions.md): choices and rationale.
- [Learnings](docs/learnings.md): observations and limitations.
- [Agent guidance](AGENTS.md): project rules and context reading instructions.

## Name and visual study history

The game is **Signal & Shelter**. The warm console interface from study B was selected for the current prototype; the study's label was not a game or world name. The playable implementation is on `main`. Generator version 2 uses half-metre terrain cells and stepped vent formations; a seed from version 1 will produce different terrain/decorations.

Three interface and visual studies were captured at commit `8df36f9` on `codex/alien-visual-prototypes`. That branch supports `/?variant=A`, `B` or `C` in development. The playable game removes the comparison route and switcher; open `/` to play. No prototype state is migrated.

## Archived design prototypes

This is the production implementation branch. `npm run dev` opens normal third-person play; old `variant`, `study` and `production` query parameters do not select experiments.

The throwaway comparisons remain on `codex/third-person-camera-prototype`, `codex/strategic-map-prototype` and `codex/occlusion-prototype`. The final production-fade fixture snapshot is preserved on `codex/third-person-prototype-archive-41ab0d5` at `41ab0d5`. Check out an archive in a separate worktree to run its documented prototype commands. Their source, styles, routes and tests are absent from this implementation branch.

The [accepted design](docs/third-person-design.md) records camera B, atlas A and fading B. Close-play controls, shared exploration and the active strategic atlas are implemented. Sustained human playtesting and rendering-cost measurement remain for the final increment.
