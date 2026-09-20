import type { Actor, Box, Flight, Motion, Point } from "./types.ts";
import { groundPath, supported } from "./geometry.ts";
import { direction, displacement, headingTo, SCALE } from "./numeric.ts";
import { horizontal, trial } from "./motion.ts";
export interface Plan {
  flight: Flight;
  alignment: Motion[];
  launch: Motion;
  trials: number;
}
function roundWide(n: bigint, d: bigint): number {
  const q = (n * 2n + d) / (2n * d);
  return Number(n * 2n + d < 0n && (n * 2n + d) % (2n * d) !== 0n ? q - 1n : q);
}
function align(
  actor: Actor,
  target: Point,
  heading: number,
  boxes: readonly Box[]
): Motion[] | null {
  const [ux, uz] = direction(heading),
    p = actor.motion;
  const cross =
    BigInt(target.z - p.z) * BigInt(ux) - BigInt(target.x - p.x) * BigInt(uz);
  const norm = BigInt(ux) * BigInt(ux) + BigInt(uz) * BigInt(uz);
  const dx = roundWide(-cross * BigInt(uz), norm),
    dz = roundWide(cross * BigInt(ux), norm);
  if (dx * dx + dz * dz > actor.capabilities.alignment ** 2) {
    return null;
  }
  if (dx * dx + dz * dz <= 4) {
    return [];
  }
  const goal = { x: p.x + dx, y: p.y, z: p.z + dz };
  let next = { ...p };
  const path: Motion[] = [];
  for (let i = 0; i < 16; i++) {
    const x = goal.x - next.x,
      z = goal.z - next.z,
      d2 = x * x + z * z;
    if (d2 <= 4) {
      return path;
    }
    let speed = actor.capabilities.speed;
    while (speed * speed > d2) {
      speed--;
    }
    if (speed === 0) {
      return path;
    }
    const move = horizontal(next, headingTo(x, z), speed);
    if (
      (move.x - p.x) ** 2 + (move.z - p.z) ** 2 >
        actor.capabilities.alignment ** 2 ||
      !groundPath(next, move, actor.capabilities, boxes)
    ) {
      return null;
    }
    path.push(move);
    next = move;
  }
  return null;
}
export function planJump(
  actor: Actor,
  heading: number,
  boxes: readonly Box[],
  obstacles: readonly Box[],
  allowDrop: boolean
): Plan | null {
  const c = actor.capabilities,
    p = actor.motion;
  if (!c.jump) {
    return null;
  }
  const [ux, uz] = direction(heading),
    targets: Point[] = [];
  for (const b of boxes) {
    const rise = b.maxY - p.y;
    if (
      rise === 0 ||
      Math.abs(rise) > c.elevation ||
      (rise < 0 && !allowDrop) ||
      b.maxX - b.minX < c.support ||
      b.maxZ - b.minZ < c.support
    ) {
      continue;
    }
    for (let distance = 500; distance <= 2600; distance += 300) {
      const x = Math.round(
        b.maxX - b.minX <= 1000
          ? (b.minX + b.maxX) / 2
          : Math.max(
              b.minX + c.support / 2 + 15,
              Math.min(
                b.maxX - c.support / 2 - 15,
                p.x + Math.floor((ux * distance) / SCALE)
              )
            )
      );
      const z = Math.round(
        b.maxZ - b.minZ <= 1000
          ? (b.minZ + b.maxZ) / 2
          : Math.max(
              b.minZ + c.support / 2 + 15,
              Math.min(
                b.maxZ - c.support / 2 - 15,
                p.z + Math.floor((uz * distance) / SCALE)
              )
            )
      );
      const dx = x - p.x,
        dz = z - p.z,
        forward = dx * ux + dz * uz;
      if (
        forward <= 0 ||
        forward > 2600 * SCALE ||
        !supported({ x, y: b.maxY, z }, c, boxes)
      ) {
        continue;
      }
      if (!targets.some((t) => t.x === x && t.y === b.maxY && t.z === z)) {
        targets.push({ x, y: b.maxY, z });
      }
    }
  }
  targets.sort(
    (a, b) =>
      (a.x - p.x) ** 2 +
        (a.z - p.z) ** 2 -
        ((b.x - p.x) ** 2 + (b.z - p.z) ** 2) ||
      a.y - b.y ||
      a.x - b.x ||
      a.z - b.z
  );
  let work = 0;
  for (const target of targets) {
    const alignment = align(actor, target, heading, boxes);
    if (!alignment) {
      continue;
    }
    const origin = alignment.at(-1) ?? p;
    // Exhaustive integer launch/speed search within the declared two delay families.
    for (let v = 0; v <= c.apex; v++) {
      let y = 0,
        velocity = v,
        apex = 0,
        ascending = 0,
        duration = 0;
      for (let n = 1; n <= 160; n++) {
        y += velocity;
        const down = velocity <= 0;
        velocity -= c.gravity;
        apex = Math.max(apex, y);
        if (ascending === 0 && y >= Math.max(0, target.y - p.y)) {
          ascending = n;
        }
        if (down && y <= target.y - p.y) {
          duration = n;
          break;
        }
      }
      if (apex > c.apex) {
        break;
      }
      if (duration === 0 || apex < target.y - p.y) {
        continue;
      }
      const delays = [0];
      if (target.y > p.y && ascending > 0) {
        delays.push(ascending);
      }
      for (let speed = c.speed; speed >= 1; speed--) {
        for (const delay of delays) {
          if (delay >= duration) {
            continue;
          }
          const launch = { ...origin, velocity: v };
          const f: Flight = {
            launchVelocity: v,
            heading,
            speed,
            delay,
            remaining: 0,
            targetY: target.y,
            originY: p.y,
            ticks: [],
          };
          const [dx] = displacement(ux, speed * (duration - delay), origin.rx),
            [dz] = displacement(uz, speed * (duration - delay), origin.rz);
          const end = { x: origin.x + dx, z: origin.z + dz };
          work++;
          // Narrow target neighbourhood enforces centred landings without snapping.
          if (
            Math.abs(end.x - target.x) > 25 ||
            Math.abs(end.z - target.z) > 25
          ) {
            continue;
          }
          const ticks = trial(launch, f, c, boxes, obstacles);
          if (!ticks) {
            continue;
          }
          f.ticks = ticks;
          return { flight: f, alignment, launch, trials: work };
        }
      }
    }
  }
  return null;
}
