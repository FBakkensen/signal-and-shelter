import test from "node:test";
import assert from "node:assert/strict";
import {
  inputFromKeys,
  keyboardTurn,
  dragTurn,
  MOVEMENT_KEYS,
} from "../src/controls.ts";

await test("WASD and arrow keys map to the same movement intent", () => {
  assert.equal(inputFromKeys(new Set(["KeyW"])).forward, true);
  assert.equal(inputFromKeys(new Set(["KeyA"])).left, true);
  assert.deepEqual(
    inputFromKeys(new Set(["KeyW", "KeyA"])),
    inputFromKeys(new Set(["ArrowUp", "ArrowLeft"])),
  );
  assert.deepEqual(
    inputFromKeys(new Set(["KeyS", "KeyD"])),
    inputFromKeys(new Set(["ArrowDown", "ArrowRight"])),
  );
  assert.equal(inputFromKeys(new Set(["ShiftRight"])).run, true);
  assert.equal(inputFromKeys(new Set(["ShiftLeft"])).run, true);
  assert.equal(inputFromKeys(new Set(["Escape"])).forward, false);
});
await test("releasing or clearing keys removes movement and turning", () => {
  const keys = new Set(["KeyW", "ShiftLeft", "KeyQ"]);
  keys.delete("KeyW");
  assert.equal(inputFromKeys(keys).forward, false);
  keys.clear();
  assert.deepEqual(inputFromKeys(keys), {
    forward: false,
    back: false,
    left: false,
    right: false,
    run: false,
  });
  assert.equal(keyboardTurn(keys, 0.1), 0);
});
await test("rotation is directional, frame-scaled and opposite keys cancel", () => {
  assert.equal(keyboardTurn(new Set(["KeyQ"]), 1), 1.8);
  assert.equal(keyboardTurn(new Set(["KeyE"]), 1), -1.8);
  assert.equal(keyboardTurn(new Set(["KeyQ", "KeyE"]), 1), 0);
  assert.equal(keyboardTurn(new Set(["KeyQ"]), 0.5), 0.9);
  assert.equal(dragTurn(100, 200), -0.6);
  assert.equal(dragTurn(200, 100), 0.6);
  assert.ok(MOVEMENT_KEYS.has("ArrowUp"));
  assert.equal(MOVEMENT_KEYS.has("Tab"), false);
});
