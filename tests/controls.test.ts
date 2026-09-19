import test from "node:test";
import assert from "node:assert/strict";
import { inputFromKeys, mouseLook, MOVEMENT_KEYS } from "../src/controls.ts";

await test("WASD moves while arrow keys are reserved for look", () => {
  const wasd = inputFromKeys(new Set(["KeyW", "KeyA", "KeyS", "KeyD"]));
  assert.equal(wasd.forward, true);
  assert.equal(wasd.back, true);
  assert.equal(wasd.left, true);
  assert.equal(wasd.right, true);
  const arrows = inputFromKeys(
    new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"])
  );
  assert.ok(Object.values(arrows).every((value) => value === false));
});
await test("Ctrl sprints, Shift sneaks, Space jumps; clearing releases all intents", () => {
  for (const side of ["Left", "Right"]) {
    const keys = new Set([`Control${side}`, `Shift${side}`, "Space", "KeyW"]);
    const input = inputFromKeys(keys);
    assert.equal(input.run, true);
    assert.equal(input.sneak, true);
    assert.equal(input.jump, true);
    keys.clear();
    assert.ok(
      Object.values(inputFromKeys(keys)).every((value) => value === false)
    );
  }
  assert.equal(inputFromKeys(new Set(["ShiftLeft"])).run, false);
  assert.equal(MOVEMENT_KEYS.has("Space"), true);
  for (const key of ["Tab", "KeyQ", "KeyE", "Escape"]) {
    assert.equal(MOVEMENT_KEYS.has(key), false);
  }
});
await test("relative mouse look uses sensitivity, pitch inversion and safe bounds", () => {
  assert.deepEqual(mouseLook(100, 50, 1, false), { yaw: -0.2, pitch: -0.1 });
  assert.deepEqual(mouseLook(-100, 50, 2, true), { yaw: 0.4, pitch: 0.2 });
  assert.deepEqual(
    mouseLook(100, 50, NaN, false),
    mouseLook(100, 50, 1, false)
  );
  assert.deepEqual(
    mouseLook(100, 50, 100, false),
    mouseLook(100, 50, 3, false)
  );
  assert.deepEqual(
    mouseLook(100, 50, -1, false),
    mouseLook(100, 50, 0.2, false)
  );
  assert.deepEqual(mouseLook(NaN, Infinity, 1, false), { yaw: 0, pitch: 0 });
});

await test("keyboard look scales with time, preserves direction and rejects invalid deltas", async () => {
  const { keyboardLook } = await import("../src/controls.ts");
  const keys = new Set(["ArrowRight", "ArrowDown"]);
  assert.ok(keyboardLook(keys, 0.1).yaw < 0);
  assert.ok(keyboardLook(keys, 0.1).pitch < 0);
  assert.equal(keyboardLook(keys, 0.05).yaw * 2, keyboardLook(keys, 0.1).yaw);
  assert.deepEqual(keyboardLook(keys, 10), keyboardLook(keys, 0.1));
  for (const seconds of [0, -1, NaN, Infinity]) {
    assert.equal(Math.abs(keyboardLook(keys, seconds).yaw), 0);
    assert.equal(Math.abs(keyboardLook(keys, seconds).pitch), 0);
  }
});
