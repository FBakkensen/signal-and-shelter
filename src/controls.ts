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
  "ControlLeft",
  "ControlRight",
  "ShiftLeft",
  "ShiftRight",
  "Space",
]);
export function inputFromKeys(keys: ReadonlySet<string>): Input {
  return {
    forward: keys.has("KeyW"),
    back: keys.has("KeyS"),
    left: keys.has("KeyA"),
    right: keys.has("KeyD"),
    run: keys.has("ControlLeft") || keys.has("ControlRight"),
    sneak: keys.has("ShiftLeft") || keys.has("ShiftRight"),
    jump: keys.has("Space"),
  };
}
export function mouseLook(
  dx: number,
  dy: number,
  sensitivity: number,
  invertY: boolean,
) {
  const scale =
    (Number.isFinite(sensitivity)
      ? Math.max(0.2, Math.min(3, sensitivity))
      : 1) * 0.002;
  return {
    yaw: Number.isFinite(dx) ? -dx * scale : 0,
    pitch: Number.isFinite(dy) ? dy * scale * (invertY ? 1 : -1) : 0,
  };
}

export function keyboardLook(keys: ReadonlySet<string>, seconds: number) {
  const amount = Number.isFinite(seconds)
    ? Math.max(0, Math.min(seconds, 0.1)) * 1.8
    : 0;
  return {
    yaw:
      (Number(keys.has("ArrowLeft")) - Number(keys.has("ArrowRight"))) * amount,
    pitch:
      (Number(keys.has("ArrowUp")) - Number(keys.has("ArrowDown"))) * amount,
  };
}
