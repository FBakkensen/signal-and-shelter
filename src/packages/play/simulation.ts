import type { Island, Point } from "../island/index.ts";
import { DEFAULT_ISLAND } from "../island/index.ts";
import { advance, createGame } from "./lib/game.ts";
import type { GameState, Input } from "./lib/game.ts";
import { createMovement, HUMANOID_CAPABILITIES } from "../navigation/index.ts";
import type { MovementCapabilities } from "../navigation/index.ts";
export type { GameState, Input } from "./lib/game.ts";
export { look, transition, viewPosition } from "./lib/game.ts";

// Headless movement and traversal seam: terrain, solids and recovery belong to one island.
export function createSimulation(
  island: Island = DEFAULT_ISLAND,
  capabilities: MovementCapabilities = HUMANOID_CAPABILITIES
) {
  const movement = createMovement(island, capabilities);
  return {
    createState: () => {
      const state = createGame(island);
      movement.createState(state);
      return state;
    },
    movementDiagnostics: movement.diagnostics,
    advance: (state: GameState, input: Input, seconds: number) =>
      advance(state, input, seconds, island, movement),
    canStandAt: (point: Point, y: number) =>
      movement.supported({ ...point, y }),
  };
}
