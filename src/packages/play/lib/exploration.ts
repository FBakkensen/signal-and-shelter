import type { Point, ResourceDeposit } from "../../island/index.ts";
import { SIZE, CELL_SIZE, resourceParts } from "../../island/geometry.ts";

export const EXPLORATION_RADIUS = 8;
export const EXPLORATION_CELL_SIZE = CELL_SIZE;
export const EXPLORATION_WIDTH = SIZE / EXPLORATION_CELL_SIZE;
export const EXPLORATION_ORIGIN = -SIZE / 2;
export interface Exploration {
  readonly rows: readonly (readonly number[])[];
}
export interface ExplorationBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}
const cell = (value: number) =>
  Math.floor((value - EXPLORATION_ORIGIN) / EXPLORATION_CELL_SIZE);
const edge = (index: number) =>
  EXPLORATION_ORIGIN + index * EXPLORATION_CELL_SIZE;
export function emptyExploration(): Exploration {
  const row: readonly number[] = Array.from(
    { length: EXPLORATION_WIDTH },
    () => 0
  );
  return { rows: Array.from({ length: EXPLORATION_WIDTH }, () => row) };
}
// Immutable rows preserve simulation snapshots; unchanged rows are shared.
// Coverage follows the half-metre voxel grid, sampled at cell centres.
export function reveal(exploration: Exploration, position: Point): Exploration {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.z)) {
    return exploration;
  }
  let rows: (readonly number[])[] | undefined;
  for (
    let z = Math.max(0, cell(position.z - EXPLORATION_RADIUS));
    z <= Math.min(EXPLORATION_WIDTH - 1, cell(position.z + EXPLORATION_RADIUS));
    z++
  ) {
    const old = exploration.rows[z];
    if (!old) {
      continue;
    }
    let row: number[] | undefined;
    for (
      let x = Math.max(0, cell(position.x - EXPLORATION_RADIUS));
      x <=
      Math.min(EXPLORATION_WIDTH - 1, cell(position.x + EXPLORATION_RADIUS));
      x++
    ) {
      if (
        old[x] === 0 &&
        Math.hypot(
          edge(x) + EXPLORATION_CELL_SIZE / 2 - position.x,
          edge(z) + EXPLORATION_CELL_SIZE / 2 - position.z
        ) <= EXPLORATION_RADIUS
      ) {
        row ??= [...old];
        row[x] = 1;
      }
    }
    if (row) {
      rows ??= [...exploration.rows];
      rows[z] = row;
    }
  }
  return rows ? { rows } : exploration;
}
export function exploredAt(exploration: Exploration, x: number, z: number) {
  return exploration.rows[cell(z)]?.[cell(x)] === 1;
}
// Clip real horizontal bounds to explored cells, merging adjacent spans.
// Both the atlas and deposit discovery use these exact pieces.
export function exploredBounds(
  exploration: Exploration,
  bounds: ExplorationBounds
): ExplorationBounds[] {
  const result: ExplorationBounds[] = [];
  for (
    let z = Math.max(0, cell(bounds.minZ));
    z <
    Math.min(
      EXPLORATION_WIDTH,
      Math.ceil((bounds.maxZ - EXPLORATION_ORIGIN) / EXPLORATION_CELL_SIZE)
    );
    z++
  ) {
    let start: number | undefined;
    const minX = Math.max(0, cell(bounds.minX));
    const maxX = Math.min(
      EXPLORATION_WIDTH,
      Math.ceil((bounds.maxX - EXPLORATION_ORIGIN) / EXPLORATION_CELL_SIZE)
    );
    for (let x = minX; x <= maxX; x++) {
      if (x < maxX && exploration.rows[z]?.[x] === 1) {
        start ??= x;
        continue;
      }
      if (start === undefined) {
        continue;
      }
      const piece = {
        minX: Math.max(bounds.minX, edge(start)),
        maxX: Math.min(bounds.maxX, edge(x)),
        minZ: Math.max(bounds.minZ, edge(z)),
        maxZ: Math.min(bounds.maxZ, edge(z + 1)),
      };
      const previous = result.find(
        (p) =>
          p.minX === piece.minX &&
          p.maxX === piece.maxX &&
          p.maxZ === piece.minZ
      );
      if (previous) {
        previous.maxZ = piece.maxZ;
      } else {
        result.push(piece);
      }
      start = undefined;
    }
  }
  return result;
}
export function discoveredDeposits(
  exploration: Exploration,
  resources: readonly ResourceDeposit[]
) {
  return resources
    .filter((resource) =>
      resourceParts(resource).some((part) => {
        const x = resource.x + part.position[0],
          z = resource.z + part.position[2];
        return (
          exploredBounds(exploration, {
            minX: x - part.size[0] / 2,
            maxX: x + part.size[0] / 2,
            minZ: z - part.size[2] / 2,
            maxZ: z + part.size[2] / 2,
          }).length > 0
        );
      })
    )
    .map((resource) => resource.id);
}
