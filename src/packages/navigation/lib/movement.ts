import type { HeightSampler, Point } from "../../island/index.ts";
import type { Obstacle } from "../../island/geometry.ts";
import { CELL_SIZE } from "../../island/geometry.ts";
import {
  fits,
  onIsland,
  overlaps,
  support,
  terrainHeights,
  EPSILON,
} from "./collision.ts";

export interface MovementCapabilities {
  readonly radius: number;
  readonly height: number;
  readonly speed: number;
  readonly canJump: boolean;
  readonly elevationLimit: number;
  readonly preparationSeconds: number;
  readonly recoverySeconds: number;
}
export const HUMANOID_CAPABILITIES: MovementCapabilities = Object.freeze({
  radius: 0.3,
  height: 1.8,
  speed: 4.3,
  canJump: true,
  elevationLimit: 1,
  preparationSeconds: 0.12,
  recoverySeconds: 0.12,
});
export const MOVEMENT_STEP = 1 / 120;
const GRAVITY = 24;
export interface Position extends Point {
  readonly y: number;
}
interface Flight {
  readonly start: Position;
  readonly end: Position;
  readonly velocity: number;
  readonly duration: number;
  readonly moveStart: number;
  readonly moveEnd: number;
}
type Traversal =
  | { readonly phase: "walking" }
  | {
      readonly phase: "preparing";
      readonly elapsed: number;
      readonly direction: Point;
      readonly flight: Flight;
    }
  | {
      readonly phase: "airborne";
      readonly elapsed: number;
      readonly flight: Flight;
    }
  | { readonly phase: "recovering"; readonly elapsed: number };
export interface MovementState extends Position {
  readonly velocityY: number;
  readonly grounded: boolean;
  readonly traversal: Traversal;
}

// A world-bound movement module shared by direct input and future route execution.
// Each step is exactly 1/120 s. Callers freeze by not stepping; capabilities are
// immutable for the lifetime of this actor's movement module.
export function createMovement(
  world: {
    readonly heightAt: HeightSampler;
    readonly solids: readonly Obstacle[];
  },
  capabilities: MovementCapabilities = HUMANOID_CAPABILITIES
) {
  const c = { ...capabilities };
  if (
    ![c.radius, c.height, c.speed].every((v) => Number.isFinite(v) && v > 0) ||
    ![c.elevationLimit, c.preparationSeconds, c.recoverySeconds].every(
      (v) => Number.isFinite(v) && v >= 0
    )
  ) {
    throw new RangeError(
      "Movement capabilities require finite positive dimensions/speed and nonnegative limits/timings"
    );
  }
  const { heightAt, solids } = world;
  const clear = (p: Position) =>
    fits(p, p.y, c.height, heightAt, solids, c.radius);
  // Partition the entire footprint at terrain and box edges, checking every
  // rectangle. Corner-only checks miss holes and narrow unsupported strips.
  function supported(p: Position) {
    if (!clear(p)) {
      return false;
    }
    const nearby = solids.filter((o) => overlaps(p, o, c.radius));
    const xs = [p.x - c.radius, p.x + c.radius];
    const zs = [p.z - c.radius, p.z + c.radius];
    for (const [axis, values] of [
      ["x", xs],
      ["z", zs],
    ] as const) {
      const low = p[axis] - c.radius,
        high = p[axis] + c.radius;
      for (
        let v = Math.ceil(low / CELL_SIZE) * CELL_SIZE;
        v < high;
        v += CELL_SIZE
      ) {
        if (v > low) {
          values.push(v);
        }
      }
      for (const box of nearby) {
        for (const v of axis === "x"
          ? [box.minX, box.maxX]
          : [box.minZ, box.maxZ]) {
          if (v > low && v < high) {
            values.push(v);
          }
        }
      }
      values.sort((a, b) => a - b);
    }
    for (let i = 1; i < xs.length; i++) {
      for (let j = 1; j < zs.length; j++) {
        const x = ((xs[i - 1] ?? 0) + (xs[i] ?? 0)) / 2;
        const z = ((zs[j - 1] ?? 0) + (zs[j] ?? 0)) / 2;
        if (Math.abs(heightAt(x, z) - p.y) <= EPSILON) {
          continue;
        }
        if (
          !nearby.some(
            (o) =>
              x > o.minX - EPSILON &&
              x < o.maxX + EPSILON &&
              z > o.minZ - EPSILON &&
              z < o.maxZ + EPSILON &&
              Math.abs(o.maxY - p.y) <= EPSILON
          )
        ) {
          return false;
        }
      }
    }
    return true;
  }
  function surfaces(p: Point): Position[] {
    const heights = new Set(terrainHeights(p, heightAt, c.radius));
    for (const box of solids) {
      if (overlaps(p, box, c.radius)) {
        heights.add(box.maxY);
      }
    }
    return [...heights]
      .sort((a, b) => a - b)
      .map((y) => ({ ...p, y }))
      .filter(supported);
  }
  function pose(f: Flight, t: number): Position {
    const alpha = Math.max(
      0,
      Math.min(1, (t - f.moveStart) / (f.moveEnd - f.moveStart))
    );
    return {
      x: f.start.x + (f.end.x - f.start.x) * alpha,
      z: f.start.z + (f.end.z - f.start.z) * alpha,
      y:
        t >= f.duration
          ? f.end.y
          : f.start.y + f.velocity * t - (GRAVITY * t * t) / 2,
    };
  }
  function validFlight(f: Flight, from = 0) {
    if (!supported(f.end)) {
      return false;
    }
    for (let t = from; t < f.duration; t += MOVEMENT_STEP / 2) {
      if (!clear(pose(f, t))) {
        return false;
      }
    }
    return true;
  }
  function plan(start: Position, direction: Point): Flight | undefined {
    if (!c.canJump || !supported(start)) {
      return undefined;
    }
    // Search only a short local transition. A future route planner composes these
    // same executable transitions, rather than inventing separate jump rules.
    for (
      let distance = 0.05;
      distance <= c.radius * 2 + 1.05;
      distance += 0.05
    ) {
      const point = {
        x: start.x + direction.x * distance,
        z: start.z + direction.z * distance,
      };
      for (const end of surfaces(point)) {
        if (Math.abs(end.y - start.y) > c.elevationLimit + EPSILON) {
          continue;
        }
        let high = Math.max(start.y, end.y);
        let continuous = true;
        for (let d = 0; d <= distance + EPSILON; d += 0.025) {
          const p = {
            x: start.x + direction.x * d,
            z: start.z + direction.z * d,
          };
          // No gaps: every point under the centre has ground/solid within the
          // transition's elevation range, even when its landing is supported.
          let floor = heightAt(p.x, p.z);
          for (const o of solids) {
            if (
              p.x >= o.minX &&
              p.x <= o.maxX &&
              p.z >= o.minZ &&
              p.z <= o.maxZ &&
              o.minY <= high + EPSILON
            ) {
              floor = Math.max(floor, o.maxY);
            }
          }
          if (
            floor < Math.min(start.y, end.y) - EPSILON ||
            floor > start.y + c.elevationLimit + EPSILON
          ) {
            continuous = false;
            break;
          }
          high = Math.max(high, floor);
        }
        if (!continuous) {
          continue;
        }
        const apex = high + 0.25;
        const velocity = Math.sqrt(2 * GRAVITY * (apex - start.y));
        const topTime = velocity / GRAVITY;
        const window = Math.sqrt((2 * (apex - high)) / GRAVITY);
        const duration = topTime + Math.sqrt((2 * (apex - end.y)) / GRAVITY);
        const flight: Flight = {
          start: { x: start.x, y: start.y, z: start.z },
          end,
          velocity,
          duration,
          moveStart: topTime - window,
          moveEnd: topTime + window,
        };
        if (
          distance / (flight.moveEnd - flight.moveStart) <= c.speed + EPSILON &&
          validFlight(flight)
        ) {
          return flight;
        }
      }
    }
    return undefined;
  }
  function walk(s: MovementState, direction: Point): MovementState {
    const target = {
      x: s.x + direction.x * c.speed * MOVEMENT_STEP,
      y: s.y,
      z: s.z + direction.z * c.speed * MOVEMENT_STEP,
    };
    if (supported(target)) {
      return {
        ...s,
        ...target,
        grounded: true,
        velocityY: 0,
        traversal: { phase: "walking" },
      };
    }
    const flight = plan(s, direction);
    if (flight) {
      return {
        ...s,
        traversal: { phase: "preparing", elapsed: 0, direction, flight },
      };
    }
    // Slide along walls without cutting a diagonal corner or walking off a ledge.
    let result = s;
    for (const axis of ["x", "z"] as const) {
      const next = { ...result, [axis]: target[axis] };
      if (supported(next)) {
        result = next;
      }
    }
    return { ...result, traversal: { phase: "walking" } };
  }
  function step(state: MovementState, intent: Point): MovementState {
    const length = Math.hypot(intent.x, intent.z);
    const direction =
      Number.isFinite(length) && length > 0
        ? { x: intent.x / length, z: intent.z / length }
        : { x: 0, z: 0 };
    const active = direction.x !== 0 || direction.z !== 0;
    const phase = state.traversal;
    if (phase.phase === "recovering") {
      const elapsed = phase.elapsed + MOVEMENT_STEP;
      return {
        ...state,
        traversal:
          elapsed + EPSILON >= c.recoverySeconds
            ? { phase: "walking" }
            : { phase: "recovering", elapsed },
      };
    }
    if (phase.phase === "preparing") {
      if (
        !active ||
        direction.x * phase.direction.x + direction.z * phase.direction.z <
          0.999
      ) {
        const cancelled = {
          ...state,
          traversal: { phase: "walking" } as const,
        };
        return active ? walk(cancelled, direction) : cancelled;
      }
      const elapsed = phase.elapsed + MOVEMENT_STEP;
      if (elapsed + EPSILON < c.preparationSeconds) {
        return { ...state, traversal: { ...phase, elapsed } };
      }
      if (!validFlight(phase.flight)) {
        return { ...state, traversal: { phase: "walking" } };
      }
      return {
        ...state,
        grounded: false,
        velocityY: phase.flight.velocity,
        traversal: { phase: "airborne", elapsed: 0, flight: phase.flight },
      };
    }
    if (phase.phase === "airborne") {
      const elapsed = Math.min(
        phase.flight.duration,
        phase.elapsed + MOVEMENT_STEP
      );
      let flight = phase.flight;
      // Limited lateral steering shifts the remaining landing smoothly, only if
      // the complete remaining arc and supported landing remain feasible.
      if (active && elapsed > flight.moveStart && elapsed < flight.moveEnd) {
        const dx = flight.end.x - flight.start.x,
          dz = flight.end.z - flight.start.z;
        const distance = Math.hypot(dx, dz);
        const lateral =
          (direction.x * -dz + direction.z * dx) / (distance || 1);
        const shift = lateral * c.speed * 0.15 * MOVEMENT_STEP;
        const offset = {
          x: (-dz / (distance || 1)) * shift,
          z: (dx / (distance || 1)) * shift,
        };
        const steered = {
          ...flight,
          end: {
            ...flight.end,
            x: flight.end.x + offset.x,
            z: flight.end.z + offset.z,
          },
        };
        if (validFlight(steered, elapsed)) {
          flight = steered;
        }
      }
      const position = pose(flight, elapsed);
      if (!clear(position)) {
        return { ...state, velocityY: 0, traversal: { phase: "walking" } };
      }
      const landed = elapsed >= flight.duration;
      return {
        ...state,
        ...position,
        grounded: landed,
        velocityY: landed ? 0 : flight.velocity - GRAVITY * elapsed,
        traversal: landed
          ? { phase: "recovering", elapsed: 0 }
          : { phase: "airborne", elapsed, flight },
      };
    }
    // Recovery for externally displaced actors uses the same collision geometry.
    const floor = support(state, state.y, heightAt, solids, c.radius);
    if (state.y > floor + EPSILON) {
      const y = Math.max(
        floor,
        state.y +
          state.velocityY * MOVEMENT_STEP -
          (GRAVITY * MOVEMENT_STEP * MOVEMENT_STEP) / 2
      );
      return {
        ...state,
        y,
        grounded: y === floor,
        velocityY:
          y === floor
            ? 0
            : Math.max(-35, state.velocityY - GRAVITY * MOVEMENT_STEP),
      };
    }
    return active ? walk(state, direction) : state;
  }
  return {
    createState: (position: Position): MovementState => ({
      ...position,
      grounded: true,
      velocityY: 0,
      traversal: { phase: "walking" },
    }),
    step,
    supported,
    canOccupy: clear,
    surfaces,
    contains: (position: Point) => onIsland(position, heightAt, c.radius),
  };
}
