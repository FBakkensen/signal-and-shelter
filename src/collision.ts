import { heightAt, LANDMARKS, makeTrees, SIZE, WATER } from "./world.ts";
import type { HeightSampler, Point } from "./world.ts";

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
export function makeObstacles(): Obstacle[] {
  const result = makeTrees().map((t) =>
    boxCollider(t.x, heightAt(t.x, t.z), t.z, 0.48, t.height * 0.9, 0.48),
  );
  for (const p of LANDMARKS) {
    const y = heightAt(p.x, p.z);
    if (p.id === "arch") {
      result.push(
        boxCollider(p.x - 1.8, y, p.z, 1.2, 4, 1.5),
        boxCollider(p.x + 1.8, y, p.z, 1.2, 4, 1.5),
        boxCollider(p.x, y + 3.5, p.z, 4.8, 1.2, 1.7),
      );
    } else if (p.id === "grove") {
      result.push(boxCollider(p.x, y, p.z, 0.85, 5, 0.85));
    } else if (p.id === "beacon") {
      // Match the authored GLB's individual blocks; keep the gaps around its column.
      for (const [bottom, width, height] of [
        [0, 2, 0.4],
        [0.4, 1.3, 0.5],
        [0.9, 0.65, 1.6],
        [2.475, 1.4, 0.25],
        [2.7, 0.8, 0.8],
        [3.575, 1.65, 0.25],
        [3.825, 1, 0.25],
      ] as const) {
        result.push(boxCollider(p.x, y + bottom, p.z, width, height, width));
      }
      for (const dx of [-0.55, 0.55]) {
        for (const dz of [-0.55, 0.55]) {
          result.push(boxCollider(p.x + dx, y + 2.6, p.z + dz, 0.12, 1, 0.12));
        }
      }
    }
  }
  return result;
}
