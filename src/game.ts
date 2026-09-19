import type { HeightSampler, Landmark, Point } from "./world.ts";
import { SPAWN, WATER, LANDMARKS, heightAt } from "./world.ts";
export interface GameState extends Point {
  yaw: number;
  distance: number;
  discovered: string[];
  paused: boolean;
  overview: boolean;
}
export interface Input {
  forward?: boolean;
  back?: boolean;
  left?: boolean;
  right?: boolean;
  run?: boolean;
}
export interface Obstacle extends Point {
  radius?: number;
}
export const WALK_SPEED = 5;
export const RUN_SPEED = 9;
export function createGame(): GameState {
  return {
    x: SPAWN.x,
    z: SPAWN.z,
    yaw: 0,
    distance: 0,
    discovered: [],
    paused: true,
    overview: false,
  };
}
export function canStand(
  x: number,
  z: number,
  fromHeight: number,
  sample: HeightSampler = heightAt,
  obstacles: readonly Obstacle[] = [],
) {
  const radius = 0.24;
  for (const [dx, dz] of [
    [0, 0],
    [-radius, -radius],
    [radius, -radius],
    [-radius, radius],
    [radius, radius],
  ] as const) {
    const h = sample(x + dx, z + dz);
    if (h <= WATER || Math.abs(h - fromHeight) > 1) {
      return false;
    }
  }
  return !obstacles.some(
    (o) => Math.hypot(x - o.x, z - o.z) < (o.radius ?? 0.6) + radius,
  );
}
export function advance(
  state: GameState,
  input: Input,
  seconds: number,
  sample: HeightSampler = heightAt,
  obstacles: readonly Obstacle[] = [],
) {
  if (
    state.paused ||
    state.overview ||
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return state;
  }
  const forward = Number(Boolean(input.forward)) - Number(Boolean(input.back));
  const right = Number(Boolean(input.right)) - Number(Boolean(input.left));
  const length = Math.hypot(forward, right);
  if (!length) {
    return state;
  }
  const speed = input.run ? RUN_SPEED : WALK_SPEED;
  const dt = Math.min(seconds, 0.1);
  const dx =
    ((right * Math.cos(state.yaw) - forward * Math.sin(state.yaw)) / length) *
    speed *
    dt;
  const dz =
    ((-forward * Math.cos(state.yaw) - right * Math.sin(state.yaw)) / length) *
    speed *
    dt;
  const result = { ...state };
  // Substeps prevent tunnelling through narrow terrain and obstacles.
  const steps = Math.ceil(Math.hypot(dx, dz) / 0.1);
  for (let i = 0; i < steps; i++) {
    if (
      canStand(
        result.x + dx / steps,
        result.z,
        sample(result.x, result.z),
        sample,
        obstacles,
      )
    ) {
      result.x += dx / steps;
    }
    if (
      canStand(
        result.x,
        result.z + dz / steps,
        sample(result.x, result.z),
        sample,
        obstacles,
      )
    ) {
      result.z += dz / steps;
    }
  }
  result.distance += Math.hypot(result.x - state.x, result.z - state.z);
  result.discovered = discover(result, LANDMARKS);
  return result;
}
export function discover(state: GameState, landmarks: readonly Landmark[]) {
  return [
    ...new Set([
      ...state.discovered,
      ...landmarks
        .filter((p) => Math.hypot(p.x - state.x, p.z - state.z) <= 4)
        .map((p) => p.id),
    ]),
  ];
}
export function turn(state: GameState, amount: number) {
  return {
    ...state,
    yaw: Math.atan2(Math.sin(state.yaw + amount), Math.cos(state.yaw + amount)),
  };
}
export function setPaused(state: GameState, paused: boolean) {
  return { ...state, paused };
}
export function toggleOverview(state: GameState) {
  return { ...state, overview: !state.overview };
}
