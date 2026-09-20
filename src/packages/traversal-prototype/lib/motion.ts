import type { Box, Capabilities, Flight, Motion } from "./types.ts";
import { clear, supported } from "./geometry.ts";
import { direction, displacement, validMotion } from "./numeric.ts";
export function horizontal(p: Motion, heading: number, speed: number): Motion {
  const [x, z] = direction(heading),
    [dx, rx] = displacement(x, speed, p.rx),
    [dz, rz] = displacement(z, speed, p.rz);
  return { ...p, x: p.x + dx, z: p.z + dz, rx, rz };
}
export function flightStep(
  p: Motion,
  f: Pick<Flight, "heading" | "speed" | "delay" | "targetY">,
  c: Capabilities,
  boxes: readonly Box[],
  obstacles: readonly Box[] = []
): { motion: Motion; landed: boolean } | null {
  const next = f.delay > 0 ? { ...p } : horizontal(p, f.heading, f.speed);
  next.y = p.y + p.velocity;
  next.velocity = p.velocity - c.gravity;
  const landed = p.velocity <= 0 && p.y >= f.targetY && next.y <= f.targetY;
  if (landed) {
    next.y = f.targetY;
    next.velocity = 0;
  }
  if (
    !validMotion(next) ||
    !clear(p, next, c, [...boxes, ...obstacles]) ||
    (landed && !supported(next, c, boxes))
  ) {
    return null;
  }
  return { motion: next, landed };
}
export function trial(
  start: Motion,
  f: Flight,
  c: Capabilities,
  boxes: readonly Box[],
  obstacles: readonly Box[] = []
): Motion[] | null {
  let p = { ...start },
    delay = f.delay;
  const ticks: Motion[] = [];
  for (let n = 0; n < 160; n++) {
    const step = flightStep(p, { ...f, delay }, c, boxes, obstacles);
    if (!step) {
      return null;
    }
    p = step.motion;
    ticks.push(p);
    delay = Math.max(0, delay - 1);
    if (step.landed) {
      return ticks;
    }
    if (p.y < start.y - c.elevation - 2000) {
      return null;
    }
  }
  return null;
}
