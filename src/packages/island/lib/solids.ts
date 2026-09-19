import type { BlockPart } from "./blocks.ts";
import type { IslandDefinition, Point } from "./world.ts";
import { resourceParts } from "./resources.ts";
import { ventParts } from "./world-visuals.ts";
import { SHIP_PARTS } from "./ship.ts";
export interface Obstacle {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}
export function boxCollider(
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  depth: number
): Obstacle {
  return {
    minX: x - width / 2,
    maxX: x + width / 2,
    minY: y,
    maxY: y + height,
    minZ: z - depth / 2,
    maxZ: z + depth / 2,
  };
}

export function makeSolids(island: IslandDefinition): readonly Obstacle[] {
  function place(origin: Point, parts: readonly BlockPart[]) {
    const floor = island.heightAt(origin.x, origin.z);
    return parts.map((part) => {
      const [x, y, z] = part.position;
      const [width, height, depth] = part.size;
      return boxCollider(
        origin.x + x,
        floor + y - height / 2,
        origin.z + z,
        width,
        height,
        depth
      );
    });
  }
  return [
    ...island.vents.flatMap((vent) => place(vent, ventParts(vent.height))),
    ...place(island.ship, SHIP_PARTS),
    ...island.resources.flatMap((resource) =>
      place(resource, resourceParts(resource))
    ),
  ];
}
