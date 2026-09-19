import { SIZE, HAZE_LEVEL, CELL_SIZE } from "../../island/geometry.ts";
import type { Obstacle } from "../../island/geometry.ts";
import type { HeightSampler, Point } from "../../island/index.ts";
export const RADIUS = 0.3;
export const STANDING_HEIGHT = 1.8;
export const EPSILON = 1e-7;
export function overlaps(p: Point, box: Obstacle, radius = RADIUS) {
  return (
    p.x + radius > box.minX + EPSILON &&
    p.x - radius < box.maxX - EPSILON &&
    p.z + radius > box.minZ + EPSILON &&
    p.z - radius < box.maxZ - EPSILON
  );
}
// Visit every grid cell touched by the square player footprint, including corners.
export function terrainHeights(
  p: Point,
  sample: HeightSampler,
  radius = RADIUS
): number[] {
  const heights: number[] = [];
  for (
    let x = Math.floor((p.x - radius + EPSILON) / CELL_SIZE);
    x <= Math.floor((p.x + radius - EPSILON) / CELL_SIZE);
    x++
  ) {
    for (
      let z = Math.floor((p.z - radius + EPSILON) / CELL_SIZE);
      z <= Math.floor((p.z + radius - EPSILON) / CELL_SIZE);
      z++
    ) {
      heights.push(sample((x + 0.5) * CELL_SIZE, (z + 0.5) * CELL_SIZE));
    }
  }
  return heights;
}
export function onIsland(p: Point, sample: HeightSampler, radius = RADIUS) {
  return (
    Math.abs(p.x) + radius <= SIZE / 2 &&
    Math.abs(p.z) + radius <= SIZE / 2 &&
    terrainHeights(p, sample, radius).every(
      (h) => Number.isFinite(h) && h > HAZE_LEVEL
    )
  );
}
export function fits(
  p: Point,
  y: number,
  height: number,
  sample: HeightSampler,
  obstacles: readonly Obstacle[],
  radius = RADIUS
) {
  return (
    onIsland(p, sample, radius) &&
    terrainHeights(p, sample, radius).every((h) => h <= y + EPSILON) &&
    !obstacles.some(
      (o) =>
        overlaps(p, o, radius) &&
        y < o.maxY - EPSILON &&
        y + height > o.minY + EPSILON
    )
  );
}
export function support(
  p: Point,
  y: number,
  sample: HeightSampler,
  obstacles: readonly Obstacle[],
  radius = RADIUS
) {
  let floor = Math.max(...terrainHeights(p, sample, radius));
  for (const o of obstacles) {
    if (overlaps(p, o, radius) && o.maxY <= y + EPSILON) {
      floor = Math.max(floor, o.maxY);
    }
  }
  return floor;
}
