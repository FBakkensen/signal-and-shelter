import { SHIP_PARTS } from "./ship.ts";
import { DEFAULT_ISLAND, SIZE, WATER, RESOURCE_CRYSTALS } from "./world.ts";
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
    let x = Math.floor(p.x - RADIUS + EPSILON);
    x <= Math.floor(p.x + RADIUS - EPSILON);
    x++
  ) {
    for (
      let z = Math.floor(p.z - RADIUS + EPSILON);
      z <= Math.floor(p.z + RADIUS - EPSILON);
      z++
    ) {
      heights.push(sample(x + 0.5, z + 0.5));
    }
  }
  return heights;
}
export function onIsland(p: Point, sample: HeightSampler) {
  return (
    Math.abs(p.x) + RADIUS <= SIZE / 2 &&
    Math.abs(p.z) + RADIUS <= SIZE / 2 &&
    terrainHeights(p, sample).every((h) => Number.isFinite(h) && h > WATER)
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
  const result = island.trees.map((t) =>
    boxCollider(t.x, heightAt(t.x, t.z), t.z, 0.48, t.height * 0.9, 0.48),
  );
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
    result.push(
      boxCollider(
        resource.x,
        heightAt(resource.x, resource.z),
        resource.z,
        1.8,
        1.1,
        1.8,
      ),
    );
    for (const [dx, dz, h] of RESOURCE_CRYSTALS) {
      result.push(
        boxCollider(
          resource.x + dx,
          heightAt(resource.x, resource.z) + 0.7,
          resource.z + dz,
          0.45,
          h,
          0.45,
        ),
      );
    }
  }
  return result;
}
