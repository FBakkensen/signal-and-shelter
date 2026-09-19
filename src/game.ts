import type { HeightSampler, ResourceDeposit, Point, Island } from "./world.ts";
import { DEFAULT_ISLAND } from "./world.ts";
import {
  CROUCH_HEIGHT,
  STANDING_HEIGHT,
  EPSILON,
  fits,
  ledgeSafe,
  onIsland,
  overlaps,
  support,
} from "./collision.ts";
import type { Obstacle } from "./collision.ts";

export interface GameState extends Point {
  y: number;
  previousPosition: Point & { y: number };
  velocityY: number;
  grounded: boolean;
  crouching: boolean;
  accumulator: number;
  jumpBuffer: number;
  yaw: number;
  pitch: number;
  distance: number;
  discovered: string[];
  paused: boolean;
  overview: boolean;
  linkChecked: boolean;
}
export interface Input {
  forward?: boolean;
  back?: boolean;
  left?: boolean;
  right?: boolean;
  run?: boolean;
  sneak?: boolean;
  jump?: boolean;
}
export const WALK_SPEED = 4.3;
export const RUN_SPEED = 5.6;
export const SNEAK_SPEED = 1.3;
export const STEP = 1 / 120;
export const GRAVITY = 24;
export const JUMP_SPEED = Math.sqrt(2 * GRAVITY * 1.25);
export const MAX_PITCH = Math.PI / 2 - 0.01;
export function createGame(island: Island = DEFAULT_ISLAND): GameState {
  const { spawn: SPAWN, heightAt } = island;
  return {
    ...SPAWN,
    y: heightAt(SPAWN.x, SPAWN.z),
    previousPosition: { ...SPAWN, y: heightAt(SPAWN.x, SPAWN.z) },
    velocityY: 0,
    grounded: true,
    crouching: false,
    accumulator: 0,
    jumpBuffer: 0,
    yaw: 0,
    pitch: 0,
    distance: 0,
    discovered: [],
    paused: true,
    overview: false,
    linkChecked: false,
  };
}
export function discover(
  state: GameState,
  landmarks: readonly ResourceDeposit[]
) {
  return [
    ...new Set([
      ...state.discovered,
      ...landmarks
        .filter((p) => Math.hypot(p.x - state.x, p.z - state.z) <= 4)
        .map((p) => p.id),
    ]),
  ];
}
function simulate(
  state: GameState,
  input: Input,
  sample: HeightSampler,
  obstacles: readonly Obstacle[]
) {
  const s = {
    ...state,
    previousPosition: { x: state.x, y: state.y, z: state.z },
  };
  s.crouching =
    Boolean(input.sneak) || !fits(s, s.y, STANDING_HEIGHT, sample, obstacles);
  const height = s.crouching ? CROUCH_HEIGHT : STANDING_HEIGHT;
  s.grounded =
    Math.abs(s.y - support(s, s.y, sample, obstacles)) < EPSILON &&
    s.velocityY <= 0;
  if ((input.jump || s.jumpBuffer > 0) && s.grounded) {
    s.jumpBuffer = 0;
    s.velocityY = JUMP_SPEED;
    s.grounded = false;
  }
  s.jumpBuffer = Math.max(0, s.jumpBuffer - STEP);
  // Integrate vertical motion before horizontal motion, allowing a jump onto a terrace.
  const nextY = s.y + s.velocityY * STEP - (GRAVITY * STEP * STEP) / 2;
  s.velocityY = Math.max(-35, s.velocityY - GRAVITY * STEP);
  if (nextY > s.y) {
    let ceiling = Infinity;
    for (const o of obstacles) {
      if (overlaps(s, o) && o.minY >= s.y + height - EPSILON) {
        ceiling = Math.min(ceiling, o.minY);
      }
    }
    s.y = Math.min(nextY, ceiling - height);
    if (s.y < nextY) {
      s.velocityY = 0;
    }
  } else {
    const floor = support(s, s.y, sample, obstacles);
    s.y = Math.max(nextY, floor);
    if (nextY <= floor) {
      s.velocityY = 0;
      s.grounded = true;
    }
  }
  const forward = Number(Boolean(input.forward)) - Number(Boolean(input.back));
  const right = Number(Boolean(input.right)) - Number(Boolean(input.left));
  const length = Math.hypot(forward, right) || 1;
  const speed = s.crouching
    ? SNEAK_SPEED
    : input.run && forward > 0
      ? RUN_SPEED
      : WALK_SPEED;
  const dx =
    ((right * Math.cos(s.yaw) - forward * Math.sin(s.yaw)) / length) *
    speed *
    STEP;
  const dz =
    ((-forward * Math.cos(s.yaw) - right * Math.sin(s.yaw)) / length) *
    speed *
    STEP;
  const protect = s.grounded && s.crouching;
  for (const [axis, delta] of [
    ["x", dx],
    ["z", dz],
  ] as const) {
    const target = { x: s.x, z: s.z, [axis]: s[axis] + delta };
    if (
      fits(target, s.y, height, sample, obstacles) &&
      (!protect || ledgeSafe(target, s.y, sample, obstacles))
    ) {
      s[axis] += delta;
    }
  }
  s.grounded =
    s.velocityY <= 0 &&
    Math.abs(s.y - support(s, s.y, sample, obstacles)) < EPSILON;
  s.distance += Math.hypot(s.x - state.x, s.z - state.z);
  return s;
}
export function advance(
  state: GameState,
  input: Input,
  seconds: number,
  sample: HeightSampler = DEFAULT_ISLAND.heightAt,
  obstacles: readonly Obstacle[] = [],
  island: Island = DEFAULT_ISLAND
) {
  if (
    state.paused ||
    state.overview ||
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return state;
  }
  let result = state;
  if (
    ![
      state.x,
      state.y,
      state.z,
      state.velocityY,
      state.yaw,
      state.pitch,
      state.accumulator,
    ].every(Number.isFinite) ||
    state.y < -20 ||
    !onIsland(state, sample)
  ) {
    result = {
      ...createGame(island),
      paused: false,
      discovered: [...state.discovered],
      distance: state.distance,
      linkChecked: state.linkChecked,
    };
  }
  if (input.jump) {
    result = { ...result, jumpBuffer: 0.12 };
  }
  let remaining = result.accumulator + Math.min(seconds, 0.1);
  while (remaining + EPSILON >= STEP) {
    result = simulate(result, input, sample, obstacles);
    remaining -= STEP;
  }
  result = { ...result, accumulator: Math.max(0, remaining) };
  result.discovered = discover(result, island.resources);
  return result;
}
export function look(state: GameState, yaw: number, pitch: number) {
  if (
    state.paused ||
    state.overview ||
    !Number.isFinite(yaw) ||
    !Number.isFinite(pitch)
  ) {
    return state;
  }
  return {
    ...state,
    yaw: Math.atan2(Math.sin(state.yaw + yaw), Math.cos(state.yaw + yaw)),
    pitch: Math.max(-MAX_PITCH, Math.min(MAX_PITCH, state.pitch + pitch)),
  };
}
export type PlayEvent = "capture" | "pause" | "overview" | "return";
export function transition(state: GameState, event: PlayEvent): GameState {
  return {
    ...state,
    previousPosition: { x: state.x, y: state.y, z: state.z },
    paused: event !== "capture",
    overview: event === "overview",
    jumpBuffer: 0,
    accumulator: 0,
  };
}
export function eyeHeight(state: GameState) {
  return state.crouching ? 1.27 : 1.62;
}

export function viewPosition(state: GameState) {
  const alpha =
    state.paused || state.overview ? 1 : Math.min(1, state.accumulator / STEP);
  return {
    x: state.previousPosition.x + (state.x - state.previousPosition.x) * alpha,
    y:
      state.previousPosition.y +
      (state.y - state.previousPosition.y) * alpha +
      eyeHeight(state),
    z: state.previousPosition.z + (state.z - state.previousPosition.z) * alpha,
  };
}

export function canUseTerminal(state: GameState, island: Island): boolean {
  return (
    !state.overview &&
    Math.hypot(state.x - island.terminal.x, state.z - island.terminal.z) <=
      3.2 &&
    Math.abs(state.y - island.heightAt(island.terminal.x, island.terminal.z)) <
      1
  );
}
export function checkDataLink(state: GameState, island: Island): GameState {
  if (!canUseTerminal(state, island)) {
    return state;
  }
  return { ...state, linkChecked: true };
}
