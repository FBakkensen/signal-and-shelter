import { SIZE, HAZE_LEVEL, CELL_SIZE } from "../../island/geometry.ts";
import type { Obstacle } from "../../island/geometry.ts";
import type { HeightSampler, Point } from "../../island/index.ts";
export const RADIUS = 0.3;
export const STANDING_HEIGHT = 1.8;
export const CROUCH_HEIGHT = 1.5;
export const EPSILON = 1e-7;
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
  obstacles: readonly Obstacle[]
) {
  return (
    onIsland(p, sample) &&
    terrainHeights(p, sample).every((h) => h <= y + EPSILON) &&
    !obstacles.some(
      (o) =>
        overlaps(p, o) && y < o.maxY - EPSILON && y + height > o.minY + EPSILON
    )
  );
}
export function support(
  p: Point,
  y: number,
  sample: HeightSampler,
  obstacles: readonly Obstacle[]
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
  obstacles: readonly Obstacle[]
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
            Math.abs(o.maxY - y) < 0.05
        )
      );
    })
  );
}
