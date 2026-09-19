import type { Input } from "./game.ts";

export const MOVEMENT_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ShiftLeft",
  "ShiftRight",
  "KeyQ",
  "KeyE",
]);

export function inputFromKeys(keys: ReadonlySet<string>): Input {
  return {
    forward: keys.has("KeyW") || keys.has("ArrowUp"),
    back: keys.has("KeyS") || keys.has("ArrowDown"),
    left: keys.has("KeyA") || keys.has("ArrowLeft"),
    right: keys.has("KeyD") || keys.has("ArrowRight"),
    run: keys.has("ShiftLeft") || keys.has("ShiftRight"),
  };
}

export function keyboardTurn(keys: ReadonlySet<string>, dt: number): number {
  return ((keys.has("KeyQ") ? 1 : 0) - (keys.has("KeyE") ? 1 : 0)) * dt * 1.8;
}

export function dragTurn(fromX: number, toX: number): number {
  return -(toX - fromX) * 0.006;
}
