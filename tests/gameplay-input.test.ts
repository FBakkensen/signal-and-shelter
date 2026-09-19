import test from "node:test";
import assert from "node:assert/strict";
import { GameApplication } from "../src/application.ts";
import { STEP } from "../src/game.ts";
import { createIsland } from "../src/world.ts";

await test("quick jump taps survive keyup and frames shorter than a physics step in both control modes", () => {
  for (const keyboard of [true, false]) {
    const app = new GameApplication(createIsland());
    app.start(app.island, keyboard);
    if (!keyboard) {
      app.captureSucceeded();
    }
    const floor = app.state.y;
    app.press("Space");
    app.release("Space");
    app.tick(STEP / 4);
    assert.equal(app.state.y, floor);
    app.tick(STEP);
    assert.ok(app.state.y > floor);
    for (let frame = 0; frame < 180; frame++) {
      app.tick(STEP);
    }
    assert.equal(app.state.grounded, true);
    assert.equal(app.state.y, floor);
    app.press("Space");
    app.pause();
    app.resume();
    if (!keyboard) {
      app.captureSucceeded();
    }
    app.tick(STEP);
    assert.equal(app.state.y, floor);
  }
});

await test("arrow look and key release exercise the same gameplay interface in both modes", () => {
  for (const keyboard of [true, false]) {
    const app = new GameApplication(createIsland());
    assert.equal(app.press("KeyW"), false);
    app.start(app.island, keyboard);
    if (!keyboard) {
      assert.equal(app.press("Space"), false);
      app.captureSucceeded();
    }
    assert.equal(app.press("Tab"), false);
    app.press("ArrowLeft");
    app.press("ArrowUp");
    app.tick(0.1);
    assert.equal(app.state.distance, 0);
    assert.ok(app.state.yaw > 0);
    assert.ok(app.state.pitch > 0);
    app.press("ArrowRight");
    app.press("ArrowDown");
    const facing = app.state;
    app.press("KeyD");
    app.press("ShiftLeft");
    app.tick(0.1);
    assert.equal(app.state.yaw, facing.yaw);
    assert.equal(app.state.pitch, facing.pitch);
    assert.notEqual(app.state.distance, 0);
    assert.equal(app.state.crouching, true);
    app.release("KeyD");
    const stopped = app.state.distance;
    app.tick(0.1);
    assert.equal(app.state.distance, stopped);
    assert.equal(app.state.crouching, true);
    app.release("ShiftLeft");
    app.tick(0.1);
    assert.equal(app.state.crouching, false);
    app.pause();
    app.resume();
    if (!keyboard) {
      app.captureSucceeded();
    }
    app.tick(0.1);
    assert.equal(app.state.yaw, facing.yaw);
    assert.equal(app.state.distance, stopped);
  }
});

await test("collision belongs to the current island across start, restart and seed replacement", () => {
  const base = createIsland("collision-owner");
  const clear = {
    ...base,
    heightAt: () => 4,
    spawn: { x: 0, z: 0 },
    ship: { x: 25, z: 25 },
    vents: [],
    resources: [],
  };
  const blocked = {
    ...clear,
    seed: "blocked",
    vents: [{ x: 0, z: -2, height: 2 }],
  };
  const app = new GameApplication(clear);
  function walk() {
    app.press("KeyW");
    for (let i = 0; i < 20; i++) {
      app.tick(0.1);
    }
    app.release("KeyW");
  }
  app.start(clear, true);
  walk();
  assert.ok(app.state.z < -5);
  app.start(blocked, true);
  walk();
  assert.ok(app.state.z > -1);
  assert.ok(app.state.z < 0);
  app.restart();
  walk();
  assert.ok(app.state.z > -1);
  app.start(clear, true);
  walk();
  assert.ok(app.state.z < -5);
});
