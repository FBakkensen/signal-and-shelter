import type { HeightSampler, Point } from "../../island/index.ts";
import type { Obstacle } from "../../island/geometry.ts";
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

export interface JumpAssessment {
  jumpAvailable: boolean;
  takeoffSupported: boolean;
  landingSamples: number;
  samplesWithoutSupportedLanding: number;
  elevationRejected: number;
  gapOrInterveningHeightRejected: number;
  speedRejected: number;
  clearanceRejected: number;
  firstBlockedArcPosition: Position | null;
}
export interface BlockedMovementAttempt {
  readonly atSimulationSeconds: number;
  readonly position: Position;
  readonly direction: Point;
  readonly afterSliding: Position;
  readonly assessment: JumpAssessment;
  readonly repeatedFrames: number;
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
  let simulationSeconds = 0;
  const blockedAttempts: BlockedMovementAttempt[] = [];
  function recordBlocked(
    position: Position,
    direction: Point,
    afterSliding: Position,
    assessment: JumpAssessment
  ) {
    const previous = blockedAttempts.at(-1);
    const repeated =
      previous?.position.x === position.x &&
      previous.position.y === position.y &&
      previous.position.z === position.z &&
      previous.direction.x === direction.x &&
      previous.direction.z === direction.z;
    if (repeated) {
      blockedAttempts.pop();
    }
    blockedAttempts.push({
      atSimulationSeconds: simulationSeconds,
      position: { x: position.x, y: position.y, z: position.z },
      direction: { ...direction },
      afterSliding: { x: afterSliding.x, y: afterSliding.y, z: afterSliding.z },
      assessment,
      repeatedFrames: repeated ? previous.repeatedFrames + 1 : 1,
    });
    if (blockedAttempts.length > 8) {
      blockedAttempts.shift();
    }
  }
  const clear = (p: Position) =>
    fits(p, p.y, c.height, heightAt, solids, c.radius);
  // Body clearance and ground support are different constraints. The body may
  // overhang a tread while its centre remains supported; requiring the entire
  // 0.6 m collision footprint on one height makes 0.5 m stairs impossible.
  function supported(p: Position) {
    return (
      clear(p) &&
      (Math.abs(heightAt(p.x, p.z) - p.y) <= EPSILON ||
        solids.some(
          (o) =>
            p.x >= o.minX &&
            p.x <= o.maxX &&
            p.z >= o.minZ &&
            p.z <= o.maxZ &&
            Math.abs(o.maxY - p.y) <= EPSILON
        ))
    );
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
  function validFlight(f: Flight, from = 0, assessment?: JumpAssessment) {
    if (!supported(f.end)) {
      return false;
    }
    for (let t = from; t < f.duration; t += MOVEMENT_STEP / 2) {
      if (!clear(pose(f, t))) {
        if (assessment && !assessment.firstBlockedArcPosition) {
          assessment.firstBlockedArcPosition = pose(f, t);
        }
        return false;
      }
    }
    return true;
  }
  function plan(
    start: Position,
    direction: Point,
    assessment: JumpAssessment
  ): Flight | undefined {
    assessment.takeoffSupported = supported(start);
    if (!c.canJump || !assessment.takeoffSupported) {
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
      const landings = surfaces(point);
      assessment.landingSamples++;
      if (landings.length === 0) {
        assessment.samplesWithoutSupportedLanding++;
      }
      for (const end of landings) {
        if (Math.abs(end.y - start.y) > c.elevationLimit + EPSILON) {
          assessment.elevationRejected++;
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
          assessment.gapOrInterveningHeightRejected++;
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
          distance / (flight.moveEnd - flight.moveStart) >
          c.speed + EPSILON
        ) {
          assessment.speedRejected++;
          continue;
        }
        if (!validFlight(flight, 0, assessment)) {
          assessment.clearanceRejected++;
          continue;
        }
        return flight;
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
    const assessment: JumpAssessment = {
      jumpAvailable: c.canJump,
      takeoffSupported: false,
      landingSamples: 0,
      samplesWithoutSupportedLanding: 0,
      elevationRejected: 0,
      gapOrInterveningHeightRejected: 0,
      speedRejected: 0,
      clearanceRejected: 0,
      firstBlockedArcPosition: null,
    };
    const flight = plan(s, direction, assessment);
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
    recordBlocked(s, direction, result, assessment);
    return { ...result, traversal: { phase: "walking" } };
  }
  function step(state: MovementState, intent: Point): MovementState {
    simulationSeconds += MOVEMENT_STEP;
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
    createState: (position: Position): MovementState => {
      blockedAttempts.length = 0;
      simulationSeconds = 0;
      return {
        ...position,
        grounded: true,
        velocityY: 0,
        traversal: { phase: "walking" },
      };
    },
    diagnostics: () => ({
      capabilities: { ...c },
      simulationSeconds,
      blockedAttempts: blockedAttempts.map((attempt) => ({
        ...attempt,
        position: { ...attempt.position },
        direction: { ...attempt.direction },
        afterSliding: { ...attempt.afterSliding },
        assessment: {
          ...attempt.assessment,
          firstBlockedArcPosition: attempt.assessment.firstBlockedArcPosition
            ? { ...attempt.assessment.firstBlockedArcPosition }
            : null,
        },
      })),
    }),
    step,
    supported,
    canOccupy: clear,
    surfaces,
    contains: (position: Point) => onIsland(position, heightAt, c.radius),
  };
}
