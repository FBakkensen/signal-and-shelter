import type { Box, Capabilities, Motion, Point } from "./types.ts";
import { body, groundPath, sweep } from "./geometry.ts";
import { validMotion } from "./numeric.ts";

/** The prototype declares straight motion between each pair of tick positions. */
export function movingOverlap(
  a0: Point,
  a1: Point,
  ac: Capabilities,
  b0: Point,
  b1: Point,
  bc: Capabilities
): boolean {
  return sweep(
    { x: a0.x - b0.x, y: a0.y - b0.y, z: a0.z - b0.z },
    { x: a1.x - b1.x, y: a1.y - b1.y, z: a1.z - b1.z },
    ac,
    body({ x: 0, y: 0, z: 0 }, bc)
  );
}

export function clipGround(
  start: Motion,
  intended: Motion,
  c: Capabilities,
  boxes: readonly Box[]
): Motion {
  const safe = (p: Motion) => validMotion(p) && groundPath(start, p, c, boxes);
  if (safe(intended)) {
    return intended;
  }
  const dx = intended.x - start.x,
    dz = intended.z - start.z;
  const steps = Math.max(Math.abs(dx), Math.abs(dz), 1);
  let accepted = { ...start };
  for (let n = steps - 1; n >= 0; n--) {
    const p = {
      ...start,
      x: start.x + Math.round((dx * n) / steps),
      z: start.z + Math.round((dz * n) / steps),
    };
    if (safe(p)) {
      accepted = p;
      break;
    }
  }
  // Extend unblocked components without crossing a corner or unsupported gap.
  for (const axis of ["x", "z"] as const) {
    const delta = intended[axis] - accepted[axis];
    for (let n = Math.abs(delta); n > 0; n--) {
      const p = { ...accepted, [axis]: accepted[axis] + Math.sign(delta) * n };
      if (safe(p)) {
        accepted = p;
        break;
      }
    }
  }
  return {
    ...accepted,
    rx: accepted.x === intended.x ? intended.rx : 0,
    rz: accepted.z === intended.z ? intended.rz : 0,
  };
}
