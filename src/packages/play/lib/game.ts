import { emptyExploration, reveal, discoveredDeposits } from "./exploration.ts";
import type { Exploration } from "./exploration.ts";
import type { Point, Island } from "../../island/index.ts";
import { DEFAULT_ISLAND } from "../../island/index.ts";
import { createMovement, MOVEMENT_STEP } from "../../navigation/index.ts";
import type { MovementState } from "../../navigation/index.ts";
const EPSILON = 1e-7;

export interface GameState extends MovementState {
  y: number;
  previousPosition: Point & { y: number };
  velocityY: number;
  grounded: boolean;
  accumulator: number;
  preservePreparation: boolean;
  yaw: number;
  pitch: number;
  distance: number;
  discovered: string[];
  exploration: Exploration;
  paused: boolean;
  linkChecked: boolean;
}
export interface Input {
  forward?: boolean;
  back?: boolean;
  left?: boolean;
  right?: boolean;
}
export const STEP = MOVEMENT_STEP;
export const MAX_PITCH = Math.PI / 2 - 0.01;
export function createGame(island: Island = DEFAULT_ISLAND): GameState {
  const { spawn: SPAWN, heightAt } = island;
  const exploration = reveal(emptyExploration(), SPAWN);
  return {
    ...SPAWN,
    y: heightAt(SPAWN.x, SPAWN.z),
    previousPosition: { ...SPAWN, y: heightAt(SPAWN.x, SPAWN.z) },
    velocityY: 0,
    grounded: true,
    traversal: { phase: "walking" },
    accumulator: 0,
    preservePreparation: false,
    yaw: 0,
    pitch: 0,
    distance: 0,
    exploration,
    discovered: discoveredDeposits(exploration, island.resources),
    paused: true,
    linkChecked: false,
  };
}
function simulate(
  state: GameState,
  input: Input,
  movement: ReturnType<typeof createMovement>
) {
  const forward = Number(Boolean(input.forward)) - Number(Boolean(input.back));
  const right = Number(Boolean(input.right)) - Number(Boolean(input.left));
  let direction = {
    x: right * Math.cos(state.yaw) - forward * Math.sin(state.yaw),
    z: -forward * Math.cos(state.yaw) - right * Math.sin(state.yaw),
  };
  if (
    state.preservePreparation &&
    !forward &&
    !right &&
    state.traversal.phase === "preparing"
  ) {
    direction = state.traversal.direction;
  }
  const next = movement.step(state, direction);
  return {
    ...state,
    ...next,
    preservePreparation:
      state.preservePreparation && next.traversal.phase === "preparing",
    previousPosition: { x: state.x, y: state.y, z: state.z },
    distance: state.distance + Math.hypot(next.x - state.x, next.z - state.z),
  };
}
export function advance(
  state: GameState,
  input: Input,
  seconds: number,
  island: Island = DEFAULT_ISLAND,
  movement = createMovement(island)
) {
  if (state.paused || !Number.isFinite(seconds) || seconds <= 0) {
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
    !movement.contains(state)
  ) {
    result = {
      ...createGame(island),
      paused: false,
      discovered: [...state.discovered],
      exploration: state.exploration,
      distance: state.distance,
      linkChecked: state.linkChecked,
    };
  }
  let remaining = result.accumulator + Math.min(seconds, 0.1);
  while (remaining + EPSILON >= STEP) {
    result = simulate(result, input, movement);
    remaining -= STEP;
  }
  result = { ...result, accumulator: Math.max(0, remaining) };
  result.exploration = reveal(result.exploration, result);
  result.discovered = [
    ...new Set([
      ...result.discovered,
      ...discoveredDeposits(result.exploration, island.resources),
    ]),
  ];
  return result;
}
export function look(state: GameState, yaw: number, pitch: number) {
  if (state.paused || !Number.isFinite(yaw) || !Number.isFinite(pitch)) {
    return state;
  }
  return {
    ...state,
    yaw: Math.atan2(Math.sin(state.yaw + yaw), Math.cos(state.yaw + yaw)),
    pitch: Math.max(-MAX_PITCH, Math.min(MAX_PITCH, state.pitch + pitch)),
  };
}
export type PlayEvent = "capture" | "pause" | "return";
export function transition(state: GameState, event: PlayEvent): GameState {
  return {
    ...state,
    previousPosition: { x: state.x, y: state.y, z: state.z },
    paused: event !== "capture",
    preservePreparation:
      state.preservePreparation || state.traversal.phase === "preparing",
    accumulator: 0,
  };
}
export function eyeHeight() {
  return 1.62;
}

export function renderPose(state: GameState) {
  const alpha = state.paused ? 1 : Math.min(1, state.accumulator / STEP);
  const ground = {
    x: state.previousPosition.x + (state.x - state.previousPosition.x) * alpha,
    y: state.previousPosition.y + (state.y - state.previousPosition.y) * alpha,
    z: state.previousPosition.z + (state.z - state.previousPosition.z) * alpha,
  };
  return { ground, eye: { ...ground, y: ground.y + eyeHeight() } };
}

export function viewPosition(state: GameState) {
  return renderPose(state).eye;
}

export function canUseTerminal(state: GameState, island: Island): boolean {
  return (
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
