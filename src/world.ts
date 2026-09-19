export interface Point {
  x: number;
  z: number;
}
export type ResourceKind = "copper" | "silica" | "iron";
export interface ResourceDeposit extends Point {
  id: ResourceKind;
  name: string;
  note: string;
  color: string;
}
export interface Tree extends Point {
  height: number;
}
export type HeightSampler = (x: number, z: number) => number;
export type Vertex = readonly [number, number, number];
export interface Quad extends Point {
  top: boolean;
  points: readonly [Vertex, Vertex, Vertex, Vertex];
}
export const GENERATOR_VERSION = 1;
export const DEFAULT_SEED = "stillwild";
export const SIZE = 96;
export const WATER = 1.2;
export const MAX_SEED_LENGTH = 80;
export const RESOURCE_CRYSTALS = [
  [-0.45, 0.3, 0.7],
  [0.35, -0.25, 1],
  [0.5, 0.5, 0.5],
] as const;

// Case-sensitive text seeds; surrounding whitespace is not part of the seed.
export function normalizeSeed(value: string): string {
  return value
    .trim()
    .slice(0, MAX_SEED_LENGTH)
    .replace(/[\uD800-\uDFFF]/gu, "\uFFFD");
}
export function chooseSeed(value: string, randomSeed: () => string): string {
  return normalizeSeed(value) || normalizeSeed(randomSeed()) || DEFAULT_SEED;
}
function seedNumber(value: string): number {
  let result = 2166136261;
  for (const character of value) {
    result = Math.imul(result ^ (character.codePointAt(0) ?? 0), 16777619);
  }
  return result >>> 0;
}
export function hash(x: number, z: number, seed = 731) {
  let n = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
export interface Island {
  readonly seed: string;
  readonly version: number;
  readonly spawn: Point;
  readonly ship: Point;
  readonly terminal: Point;
  readonly resources: readonly ResourceDeposit[];
  readonly trees: readonly Tree[];
  readonly heightAt: HeightSampler;
  readonly hash: (x: number, z: number) => number;
  readonly biomeAt: (x: number, z: number) => "shore" | "grove" | "meadow";
}
export function createIsland(input = DEFAULT_SEED): Island {
  const seed = normalizeSeed(input) || DEFAULT_SEED;
  const numeric = seedNumber(seed);
  const random = (x: number, z: number) => hash(x, z, numeric);
  const phase = random(1, 0) * Math.PI * 2;
  const width = 1 + random(2, 0) * 0.13;
  const coastSize = 30 + random(3, 0) * 4;
  const ship = {
    x: Math.floor(random(4, 0) * 9) - 4 + 0.5,
    z: Math.floor(random(5, 0) * 5) + 3.5,
  };
  const terminal = { x: ship.x + 3.5, z: ship.z + 2 };
  const spawn = { x: terminal.x, z: terminal.z + 2.8 };
  const resources: ResourceDeposit[] = [
    {
      id: "copper",
      name: "Copper outcrop",
      note: "Copper-bearing rock. A promising material for future wiring.",
      color: "#c27a4d",
      x: -14.5 + Math.floor(random(6, 0) * 5),
      z: -7.5 + Math.floor(random(7, 0) * 5),
    },
    {
      id: "silica",
      name: "Silica crystals",
      note: "Pale silica crystals. Something to remember when we can manufacture parts.",
      color: "#a8dbd6",
      x: 10.5 + Math.floor(random(8, 0) * 5),
      z: -11.5 + Math.floor(random(9, 0) * 5),
    },
    {
      id: "iron",
      name: "Iron outcrop",
      note: "Iron-bearing stone. A possible source for future robot frames.",
      color: "#7d8794",
      x: -10.5 + Math.floor(random(10, 0) * 4),
      z: 14.5 + Math.floor(random(11, 0) * 4),
    },
  ];
  const heightAt: HeightSampler = (px, pz) => {
    const x = Math.floor(px),
      z = Math.floor(pz);
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(z) ||
      x < -SIZE / 2 ||
      x >= SIZE / 2 ||
      z < -SIZE / 2 ||
      z >= SIZE / 2
    ) {
      return 0;
    }
    const radius = Math.hypot(x / width, z);
    const coast =
      coastSize +
      Math.sin(x * 0.15 + phase) * 2 +
      Math.cos(z * 0.18 - phase) * 2;
    // A connected low meadow guarantees room for arrival and all starter deposits.
    const hills =
      Math.min(1, Math.max(0, (radius - 22) / 5)) *
      (1 + Math.sin(x * 0.13 + phase));
    return Math.max(0, Math.floor(Math.min((coast - radius) * 0.7, 4 + hills)));
  };
  const trees: Tree[] = [];
  for (let x = -33.5; x < 34; x += 3) {
    for (let z = -33.5; z < 34; z += 3) {
      if (heightAt(x, z) < 3 || random(x * 2, z * 2) < 0.68) {
        continue;
      }
      if (
        Math.hypot(x - ship.x, z - ship.z) < 9 ||
        resources.some((p) => Math.hypot(x - p.x, z - p.z) < 4.5)
      ) {
        continue;
      }
      trees.push({ x, z, height: 3 + random(z * 2, x * 2) * 2 });
    }
  }
  return {
    seed,
    version: GENERATOR_VERSION,
    spawn,
    ship,
    terminal,
    resources,
    trees,
    heightAt,
    hash: random,
    biomeAt: (x, z) =>
      heightAt(x, z) <= 2 ? "shore" : x > 10 && z < 0 ? "grove" : "meadow",
  };
}
export const DEFAULT_ISLAND = createIsland();
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
