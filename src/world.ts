export interface Point {
  x: number;
  z: number;
}
export interface Landmark extends Point {
  id: string;
  name: string;
  note: string;
}
export interface Tree extends Point {
  height: number;
  radius?: number;
}
export type HeightSampler = (x: number, z: number) => number;
export type Vertex = readonly [number, number, number];
export interface Quad extends Point {
  top: boolean;
  points: readonly [Vertex, Vertex, Vertex, Vertex];
}
export const SEED = 731;
export const SIZE = 96;
export const WATER = 1.2;
export const SPAWN = { x: 0.5, z: 16.5 };
export const LANDMARKS: readonly Landmark[] = [
  {
    id: "beacon",
    name: "The amber beacon",
    x: 0.5,
    z: 5.5,
    note: "A warm light for those who wander.",
  },
  {
    id: "arch",
    name: "The old stone gate",
    x: -17.5,
    z: -7.5,
    note: "A doorway with no walls. Where did it lead?",
  },
  {
    id: "grove",
    name: "The quiet grove",
    x: 19.5,
    z: -13.5,
    note: "The island keeps its own kind of time.",
  },
];
export function hash(x: number, z: number, seed = SEED) {
  let n = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
export function heightAt(x: number, z: number) {
  x = Math.floor(x);
  z = Math.floor(z);
  if (x < -SIZE / 2 || x >= SIZE / 2 || z < -SIZE / 2 || z >= SIZE / 2) {
    return 0;
  }
  const radius = Math.hypot(x / 1.08, z);
  const coast = 33 + Math.sin(x * 0.15) * 3 + Math.cos(z * 0.18) * 3;
  const hills = 2 + Math.sin(x * 0.095) * 1.6 + Math.cos(z * 0.11) * 1.7;
  return Math.max(0, Math.floor(Math.min((coast - radius) * 0.7, hills + 2)));
}
export function biomeAt(x: number, z: number) {
  return heightAt(x, z) <= 2 ? "shore" : x > 10 && z < 0 ? "grove" : "meadow";
}
export function makeTrees() {
  const trees: Tree[] = [];
  for (let x = -33; x < 34; x += 3) {
    for (let z = -33; z < 34; z += 3) {
      if (heightAt(x, z) < 3 || hash(x, z) < 0.57) {
        continue;
      }
      if (
        Math.abs(x) < 4 ||
        LANDMARKS.some((p) => Math.hypot(p.x - x, p.z - z) < 5)
      ) {
        continue;
      }
      trees.push({ x: x + 0.5, z: z + 0.5, height: 3 + hash(z, x) * 2 });
    }
  }
  return trees;
}
// Exposed quads only; the caller can request adjacent chunks without seams.
export function terrainQuads(
  sample: HeightSampler,
  minX: number,
  minZ: number,
  size: number,
) {
  const quads: Quad[] = [];
  for (let x = minX; x < minX + size; x++) {
    for (let z = minZ; z < minZ + size; z++) {
      const y = sample(x, z);
      if (y <= 0) {
        continue;
      }
      quads.push({
        x,
        z,
        top: true,
        points: [
          [x, y, z],
          [x, y, z + 1],
          [x + 1, y, z + 1],
          [x + 1, y, z],
        ],
      });
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const low = sample(x + dx, z + dz);
        if (low >= y) {
          continue;
        }
        const points: Quad["points"] =
          dx === 1
            ? [
                [x + 1, low, z],
                [x + 1, y, z],
                [x + 1, y, z + 1],
                [x + 1, low, z + 1],
              ]
            : dx === -1
              ? [
                  [x, low, z + 1],
                  [x, y, z + 1],
                  [x, y, z],
                  [x, low, z],
                ]
              : dz === 1
                ? [
                    [x + 1, low, z + 1],
                    [x + 1, y, z + 1],
                    [x, y, z + 1],
                    [x, low, z + 1],
                  ]
                : [
                    [x, low, z],
                    [x, y, z],
                    [x + 1, y, z],
                    [x + 1, low, z],
                  ];
        quads.push({ x, z, top: false, points });
      }
    }
  }
  return quads;
}
