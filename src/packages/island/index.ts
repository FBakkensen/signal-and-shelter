import { createIsland as generateIsland } from "./lib/world.ts";
import type { IslandDefinition } from "./lib/world.ts";
import { makeSolids } from "./lib/solids.ts";
import type { Obstacle } from "./lib/solids.ts";

export {
  chooseSeed,
  normalizeSeed,
  DEFAULT_SEED,
  GENERATOR_VERSION,
} from "./lib/world.ts";
export type {
  Point,
  HeightSampler,
  ResourceDeposit,
  ResourceKind,
  Vent,
} from "./lib/world.ts";
export interface Island extends IslandDefinition {
  readonly solids: readonly Obstacle[];
}
// Generate placement and physical geometry together, so callers cannot mismatch seeds.
export function createIsland(seed?: string): Island {
  const definition = generateIsland(seed);
  return { ...definition, solids: makeSolids(definition) };
}
export const DEFAULT_ISLAND = createIsland();
