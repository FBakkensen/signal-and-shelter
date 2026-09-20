import { integer, LOCAL_LIMIT, Q24, roundRatio } from "./integer.ts";
import { QUARTER_SINE } from "./directions-table.ts";
export const HEADING_COUNT = 65_536;
export interface Horizontal {
  readonly x: number;
  readonly z: number;
}
function sine(heading: number): number {
  const quadrant = Math.floor(heading / 16_384);
  const offset = heading % 16_384;
  const value = QUARTER_SINE[quadrant % 2 === 0 ? offset : 16_384 - offset];
  if (value === undefined) {
    throw new RangeError("Invalid table index");
  }
  return quadrant < 2 || value === 0 ? value : -value;
}
/** Heading zero is +x, increasing toward +z. */
export function direction(heading: number): Horizontal {
  integer(heading, 0, HEADING_COUNT - 1);
  return { x: sine((heading + 16_384) % HEADING_COUNT), z: sine(heading) };
}
/** Maximum table-vector dot product; equal scores select the lowest index. */
export function targetHeading(x: number, z: number): number | null {
  integer(x, -LOCAL_LIMIT, LOCAL_LIMIT);
  integer(z, -LOCAL_LIMIT, LOCAL_LIMIT);
  if (x === 0 && z === 0) {
    return null;
  }
  let best = -Infinity;
  let result = 0;
  for (let heading = 0; heading < HEADING_COUNT; heading++) {
    const vector = direction(heading);
    const score = x * vector.x + z * vector.z;
    if (score > best) {
      best = score;
      result = heading;
    }
  }
  return result;
}
export interface MotionStep {
  readonly displacement: Horizontal;
  readonly residue: Horizontal;
}
/** Retains world-axis residue through turns/stops; contact projection is separate. */
export function stepMotion(
  heading: number | null,
  speed: number,
  residue: Horizontal
): MotionStep {
  integer(speed, 0, LOCAL_LIMIT);
  integer(residue.x, -Q24 / 2, Q24 / 2 - 1);
  integer(residue.z, -Q24 / 2, Q24 / 2 - 1);
  const vector = heading === null ? { x: 0, z: 0 } : direction(heading);
  const x = vector.x * speed + residue.x;
  const z = vector.z * speed + residue.z;
  const dx = roundRatio(x, Q24);
  const dz = roundRatio(z, Q24);
  return {
    displacement: { x: dx, z: dz },
    residue: { x: x - dx * Q24, z: z - dz * Q24 },
  };
}
/** Physics supplies genuine blocked axes; tangential residue is unchanged. */
export function projectResidue(
  residue: Horizontal,
  blocked: { readonly x: boolean; readonly z: boolean }
): Horizontal {
  integer(residue.x, -Q24 / 2, Q24 / 2 - 1);
  integer(residue.z, -Q24 / 2, Q24 / 2 - 1);
  return { x: blocked.x ? 0 : residue.x, z: blocked.z ? 0 : residue.z };
}
