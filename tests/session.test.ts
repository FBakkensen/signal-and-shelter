import test from "node:test";
import assert from "node:assert/strict";
import { ControlSession } from "../src/session.ts";
import { advance, createGame, STEP, transition } from "../src/game.ts";

await test("capture gates input and loss clears held keys and queued jumps", () => {
  const session = new ControlSession();
  assert.equal(session.press("KeyW"), false);
  session.requestCapture();
  assert.equal(session.active, false);
  assert.equal(session.press("Space"), false);
  assert.equal(session.captureSucceeded(), true);
  assert.equal(session.active, true);
  assert.equal(session.press("KeyW"), true);
  session.press("ControlLeft");
  session.press("Space");
  const input = session.readInput();
  assert.equal(input.forward, true);
  assert.equal(input.run, true);
  assert.equal(input.jump, true);
  session.pause();
  session.pause();
  assert.equal(session.active, false);
  assert.ok(Object.values(session.readInput()).every((v) => v === false));
  assert.equal(session.captureSucceeded(), false);
  session.requestCapture();
  session.captureSucceeded();
  assert.ok(Object.values(session.readInput()).every((v) => v === false));
});
await test("failed and cancelled capture cannot activate play or cancel a newer request", () => {
  const session = new ControlSession();
  const failed = session.requestCapture();
  assert.equal(session.captureFailed(failed), true);
  assert.equal(session.active, false);
  const cancelled = session.requestCapture();
  session.pause();
  assert.equal(session.captureSucceeded(), false);
  const current = session.requestCapture();
  assert.equal(session.captureFailed(cancelled), false);
  assert.equal(session.mode, "capturing");
  session.captureSucceeded();
  assert.equal(session.captureFailed(current), false);
  assert.equal(session.active, true);
});
await test("a quick Space tap survives keyup and a render shorter than a physics step", () => {
  const session = new ControlSession();
  session.requestCapture();
  session.captureSucceeded();
  session.press("Space");
  session.release("Space");
  let s = transition(createGame(), "capture");
  const floor = s.y;
  s = advance(s, session.readInput(), STEP / 4);
  assert.equal(s.y, floor);
  s = advance(s, session.readInput(), STEP);
  assert.ok(s.y > floor);
  assert.equal(s.grounded, false);
  assert.equal(session.readInput().jump, false);
  session.press("Space");
  session.pause();
  assert.equal(session.readInput().jump, false);
});
await test("unmapped keys are ignored; keyup releases movement independently", () => {
  const session = new ControlSession();
  session.requestCapture();
  session.captureSucceeded();
  assert.equal(session.press("Tab"), false);
  session.press("KeyW");
  session.press("ShiftLeft");
  session.release("KeyW");
  assert.equal(session.readInput().forward, false);
  assert.equal(session.readInput().sneak, true);
  session.release("ShiftLeft");
  assert.equal(session.readInput().sneak, false);
});

await test("resume requests fresh capture, clears old inputs, and stays paused on rejection", () => {
  const session = new ControlSession();
  session.requestCapture();
  session.captureSucceeded();
  session.press("KeyW");
  session.pause();
  const request = session.requestCapture();
  assert.equal(session.mode, "capturing");
  assert.equal(session.active, false);
  assert.equal(session.readInput().forward, false);
  session.captureFailed(request);
  assert.equal(session.mode, "paused");
  session.requestCapture();
  assert.equal(session.captureSucceeded(), true);
  assert.equal(session.active, true);
});

await test("keyboard mode uses arrows exclusively for look and WASD for movement", () => {
  const session = new ControlSession();
  session.useKeyboard();
  session.press("ArrowLeft");
  session.press("ArrowUp");
  assert.equal(session.readInput().forward, false);
  assert.equal(session.readInput().left, false);
  assert.deepEqual(session.look(0.1), {
    yaw: 0.18000000000000002,
    pitch: 0.18000000000000002,
  });
  session.press("KeyW");
  session.press("KeyD");
  session.press("ControlLeft");
  assert.equal(session.readInput().forward, true);
  assert.equal(session.readInput().right, true);
  assert.equal(session.readInput().run, true);
  session.press("ArrowRight");
  session.press("ArrowDown");
  assert.deepEqual(session.look(0.1), { yaw: 0, pitch: 0 });
});
await test("keyboard resume needs no capture and clears held movement and look", () => {
  const session = new ControlSession();
  session.useKeyboard();
  session.press("ArrowUp");
  session.press("KeyW");
  session.pause();
  assert.deepEqual(session.look(0.1), { yaw: 0, pitch: 0 });
  assert.equal(session.resume(), null);
  assert.equal(session.active, true);
  assert.equal(session.mode, "keyboard");
  assert.equal(session.readInput().forward, false);
  assert.deepEqual(session.look(0.1), { yaw: 0, pitch: 0 });
  session.requestCapture();
  assert.equal(session.keyboardPreferred, false);
  assert.equal(session.active, false);
  session.captureSucceeded();
  session.press("ArrowUp");
  assert.equal(session.readInput().forward, false);
  assert.ok(session.look(0.1).pitch > 0);
  session.press("KeyW");
  assert.equal(session.readInput().forward, true);
});
