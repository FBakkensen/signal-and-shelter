import type { BlockPart } from "./blocks.ts";
import { resourceParts } from "./resources.ts";
import { SHIP_PARTS } from "./ship.ts";
import { ventParts } from "./world-visuals.ts";
import type { Island, Point } from "./world.ts";

export interface PlacedSolid {
  readonly kind: "vent" | "ship" | "resource";
  readonly origin: readonly [number, number, number];
  readonly parts: readonly BlockPart[];
}

// All solid geometry is placed here. Both mesh and collision adapters consume
// world-space block centres; the authored ship also needs its root translation.
export function placeSolids(island: Island): readonly PlacedSolid[] {
  function place(
    kind: PlacedSolid["kind"],
    point: Point,
    parts: readonly BlockPart[],
  ): PlacedSolid {
    const origin = [
      point.x,
      island.heightAt(point.x, point.z),
      point.z,
    ] as const;
    return {
      kind,
      origin,
      parts: parts.map((part) => ({
        ...part,
        position: [
          origin[0] + part.position[0],
          origin[1] + part.position[1],
          origin[2] + part.position[2],
        ],
      })),
    };
  }
  return [
    ...island.vents.map((vent) => place("vent", vent, ventParts(vent.height))),
    place("ship", island.ship, SHIP_PARTS),
    ...island.resources.map((resource) =>
      place("resource", resource, resourceParts(resource)),
    ),
  ];
}
