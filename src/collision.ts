import { resourceParts } from "./resources.ts";
import { ventParts } from "./world-visuals.ts";
import { SHIP_PARTS } from "./ship.ts";
import { DEFAULT_ISLAND, SIZE, HAZE_LEVEL, CELL_SIZE } from "./world.ts";
import type { HeightSampler, Point, Island } from "./world.ts";

export interface Obstacle {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}
export const RADIUS = 0.3;
export const STANDING_HEIGHT = 1.8;
export const CROUCH_HEIGHT = 1.5;
export const EPSILON = 1e-7;
export function boxCollider(
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  depth: number,
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
export function overlaps(p: Point, box: Obstacle) {
  return (
    p.x + RADIUS > box.minX + EPSILON &&
    p.x - RADIUS < box.maxX - EPSILON &&
    p.z + RADIUS > box.minZ + EPSILON &&
    p.z - RADIUS < box.maxZ - EPSILON
  );
}
// Visit every grid cell touched by the square player footprint, including corners.
export function terrainHeights(p: Point, sample: HeightSampler): number[] {
  const heights: number[] = [];
  for (
    let x = Math.floor((p.x - RADIUS + EPSILON) / CELL_SIZE);
    x <= Math.floor((p.x + RADIUS - EPSILON) / CELL_SIZE);
    x++
  ) {
    for (
      let z = Math.floor((p.z - RADIUS + EPSILON) / CELL_SIZE);
      z <= Math.floor((p.z + RADIUS - EPSILON) / CELL_SIZE);
      z++
    ) {
      heights.push(sample((x + 0.5) * CELL_SIZE, (z + 0.5) * CELL_SIZE));
    }
  }
  return heights;
}
export function onIsland(p: Point, sample: HeightSampler) {
  return (
    Math.abs(p.x) + RADIUS <= SIZE / 2 &&
    Math.abs(p.z) + RADIUS <= SIZE / 2 &&
    terrainHeights(p, sample).every((h) => Number.isFinite(h) && h > HAZE_LEVEL)
  );
}
export function fits(
  p: Point,
  y: number,
  height: number,
  sample: HeightSampler,
  obstacles: readonly Obstacle[],
) {
  return (
    onIsland(p, sample) &&
    terrainHeights(p, sample).every((h) => h <= y + EPSILON) &&
    !obstacles.some(
      (o) =>
        overlaps(p, o) && y < o.maxY - EPSILON && y + height > o.minY + EPSILON,
    )
  );
}
export function support(
  p: Point,
  y: number,
  sample: HeightSampler,
  obstacles: readonly Obstacle[],
) {
  let floor = Math.max(...terrainHeights(p, sample));
  for (const o of obstacles) {
    if (overlaps(p, o) && o.maxY <= y + EPSILON) {
      floor = Math.max(floor, o.maxY);
    }
  }
  return floor;
}
export function ledgeSafe(
  p: Point,
  y: number,
  sample: HeightSampler,
  obstacles: readonly Obstacle[],
) {
  // Each corner must have support, so diagonal movement cannot slip off a corner.
  return [-RADIUS + EPSILON, RADIUS - EPSILON].every((dx) =>
    [-RADIUS + EPSILON, RADIUS - EPSILON].every((dz) => {
      const x = p.x + dx,
        z = p.z + dz;
      return (
        sample(x, z) >= y - 0.05 ||
        obstacles.some(
          (o) =>
            x >= o.minX &&
            x <= o.maxX &&
            z >= o.minZ &&
            z <= o.maxZ &&
            Math.abs(o.maxY - y) < 0.05,
        )
      );
    }),
  );
}
export function makeObstacles(island: Island = DEFAULT_ISLAND): Obstacle[] {
  const { heightAt, ship } = island;
  const result: Obstacle[] = [];
  for (const vent of island.vents) {
    for (const part of ventParts(vent.height)) {
      const [x, y, z] = part.position;
      const [width, height, depth] = part.size;
      result.push(
        boxCollider(
          vent.x + x,
          heightAt(vent.x, vent.z) + y - height / 2,
          vent.z + z,
          width,
          height,
          depth,
        ),
      );
    }
  }
  for (const part of SHIP_PARTS) {
    const [x, y, z] = part.position;
    const [width, height, depth] = part.size;
    result.push(
      boxCollider(
        ship.x + x,
        heightAt(ship.x, ship.z) + y - height / 2,
        ship.z + z,
        width,
        height,
        depth,
      ),
    );
  }
  for (const resource of island.resources) {
    for (const part of resourceParts(resource)) {
      const [x, y, z] = part.position;
      const [width, height, depth] = part.size;
      result.push(
        boxCollider(
          resource.x + x,
          heightAt(resource.x, resource.z) + y - height / 2,
          resource.z + z,
          width,
          height,
          depth,
        ),
      );
    }
  }
  return result;
}
