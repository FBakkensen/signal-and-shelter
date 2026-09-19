// Renderer and authored-asset tooling consume pure geometry through this seam.
export { terrainQuads, SIZE, HAZE_LEVEL, CELL_SIZE } from "./lib/world.ts";
export type { Quad } from "./lib/world.ts";
export { WORLD_PALETTE, ventParts } from "./lib/world-visuals.ts";
export { resourceParts } from "./lib/resources.ts";
export { SHIP_PARTS } from "./lib/ship.ts";
export type { BlockPart } from "./lib/blocks.ts";
export { boxCollider } from "./lib/solids.ts";
export type { Obstacle } from "./lib/solids.ts";
