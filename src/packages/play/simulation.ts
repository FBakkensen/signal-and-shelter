import type { Island, Point } from "../island/index.ts";
import { DEFAULT_ISLAND } from "../island/index.ts";
import { advance, createGame } from "./lib/game.ts";
import type { GameState, Input } from "./lib/game.ts";
import { fits, STANDING_HEIGHT } from "./lib/collision.ts";
export type { GameState, Input } from "./lib/game.ts";
export { look, transition, viewPosition } from "./lib/game.ts";

// Headless movement and traversal seam: terrain, solids and recovery belong to one island.
export function createSimulation(island: Island = DEFAULT_ISLAND) {
  return {
    createState: () => createGame(island),
    advance: (state: GameState, input: Input, seconds: number) =>
      advance(state, input, seconds, island.heightAt, island.solids, island),
    canStandAt: (point: Point, y: number) =>
      fits(point, y, STANDING_HEIGHT, island.heightAt, island.solids),
  };
}
