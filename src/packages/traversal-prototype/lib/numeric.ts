import type { Motion } from "./types.ts";
import { SIN } from "./directions-table.ts";
export const SCALE = 16777216;
export function direction(heading: number): readonly [number, number] {
  const h = ((heading % 65536) + 65536) % 65536,
    q = Math.floor(h / 16384),
    i = h % 16384;
  const s = SIN[i],
    c = SIN[16384 - i];
  if (s === undefined || c === undefined) {
    throw new Error("Invalid heading");
  }
  switch (q) {
    case 0:
      return [c, s];
    case 1:
      return [-s, c];
    case 2:
      return [-c, -s];
    default:
      return [s, -c];
  }
}
export function displacement(
  component: number,
  speed: number,
  residue: number
): readonly [number, number] {
  const n = component * speed + residue,
    q = Math.floor((n + SCALE / 2) / SCALE);
  return [q, n - q * SCALE];
}
export function headingTo(x: number, z: number): number {
  if (x === 0 && z === 0) {
    return 0;
  }
  let best = 0,
    score = -Infinity;
  // Bounded prototype target conversion, using the same table as motion.
  // Local targets are infrequent; no runtime trigonometry enters simulation.
  for (let h = 0; h < 65536; h++) {
    const [a, b] = direction(h),
      s = x * a + z * b;
    if (s > score) {
      score = s;
      best = h;
    }
  }
  return best;
}

// Shared by candidate motion and committed-state validation.
export function validMotion(p: Motion): boolean {
  return (
    Object.values(p).every(Number.isSafeInteger) &&
    Math.max(Math.abs(p.x), Math.abs(p.y), Math.abs(p.z)) <= 1000000 &&
    p.rx >= -SCALE / 2 &&
    p.rx < SCALE / 2 &&
    p.rz >= -SCALE / 2 &&
    p.rz < SCALE / 2
  );
}
