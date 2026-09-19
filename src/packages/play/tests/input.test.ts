import test from "node:test";
import assert from "node:assert/strict";
import { GameApplication } from "../index.ts";
import { createIsland } from "../../island/index.ts";
import type { Island } from "../../island/index.ts";
import { boxCollider } from "../../island/geometry.ts";

function scenario(): Island {
  return {
    ...createIsland("input-scenario"),
    spawn: { x: 0, z: 0 },
    heightAt: () => 4,
    solids: [],
  };
}
function playing(keyboard = true) {
  const island = scenario();
  const app = new GameApplication(island);
  app.start(island, keyboard);
  if (!keyboard) {
    assert.equal(app.captureSucceeded(), true);
  }
  return app;
}
function near(actual: number, expected: number) {
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    `${String(actual)} != ${String(expected)}`
  );
}

await test("WASD, ignored modifiers and arrow look execute through play in both control modes", () => {
  for (const keyboard of [true, false]) {
    for (const side of ["Left", "Right"]) {
      const app = playing(keyboard);
      app.press("KeyW");
      app.press(`Control${side}`);
      app.tick(0.1);
      near(app.state.distance, 0.43);
      app.press(`Shift${side}`);
      app.tick(0.1);
      near(app.state.distance, 0.86);
      assert.equal(app.state.grounded, true);
      app.release("KeyW");
      app.release(`Control${side}`);
      app.release(`Shift${side}`);
      app.press("ArrowLeft");
      app.press("ArrowUp");
      app.tick(0.1);
      near(app.state.distance, 0.86);
      near(app.state.yaw, 0.18);
      near(app.state.pitch, 0.18);
      app.press("ArrowRight");
      app.press("ArrowDown");
      app.tick(0.1);
      near(app.state.yaw, 0.18);
      near(app.state.pitch, 0.18);
    }
    for (const [key, x, z] of [
      ["KeyW", 0, -0.43],
      ["KeyS", 0, 0.43],
      ["KeyA", -0.43, 0],
      ["KeyD", 0.43, 0],
    ] as const) {
      const app = playing(keyboard);
      app.press(key);
      app.tick(0.1);
      near(app.state.x, x);
      near(app.state.z, z);
      app.release(key);
      app.tick(0.1);
      near(app.state.distance, 0.43);
      for (const ignored of ["Tab", "KeyQ", "KeyE", "Escape"]) {
        assert.equal(app.press(ignored), false);
      }
    }
  }
});

await test("Space is ignored across substep frames; pause clears held input", () => {
  for (const keyboard of [true, false]) {
    const app = playing(keyboard);
    app.press("Space");
    app.release("Space");
    app.tick(1 / 480);
    near(app.state.y, 4);
    app.tick(1 / 120);
    near(app.state.y, 4);
    app.restart();
    if (!keyboard) {
      app.captureSucceeded();
    }
    app.press("Space");
    app.release("Space");
    app.press("KeyW");
    app.press("ArrowRight");
    app.pause();
    assert.equal(app.press("Space"), false);
    app.resume();
    if (!keyboard) {
      app.captureSucceeded();
    }
    app.tick(0.1);
    near(app.state.y, 4);
    near(app.state.distance, 0);
    near(app.state.yaw, 0);
  }
});

await test("mouse sensitivity, inversion and finite bounds are applied only during captured play", () => {
  for (const [dx, dy, sensitivity, inverted, yaw, pitch] of [
    [100, 50, 1, false, -0.2, -0.1],
    [-100, 50, 2, true, 0.4, 0.2],
    [100, 50, NaN, false, -0.2, -0.1],
    [100, 50, 100, false, -0.6, -0.3],
    [100, 50, -1, false, -0.04, -0.02],
    [NaN, Infinity, 1, false, 0, 0],
  ] as const) {
    const app = playing(false);
    app.mouseMoved(dx, dy, sensitivity, inverted);
    near(app.state.yaw, yaw);
    near(app.state.pitch, pitch);
    app.pause();
    const state = app.state;
    app.mouseMoved(100, 50, 1, false);
    assert.equal(app.state, state);
  }
  const keyboard = playing();
  keyboard.mouseMoved(100, 50, 1, false);
  near(keyboard.state.yaw, 0);
  near(keyboard.state.pitch, 0);
});

await test("keyboard look bounds elapsed time and ignores invalid frame lengths", () => {
  for (const seconds of [0, -1, NaN, Infinity]) {
    const app = playing();
    app.press("ArrowRight");
    app.press("ArrowDown");
    app.tick(seconds);
    near(app.state.yaw, 0);
    near(app.state.pitch, 0);
  }
  const app = playing();
  app.press("ArrowRight");
  app.tick(10);
  near(app.state.yaw, -0.18);
});

await test("seed replacement replaces the collision world; restart retains the current world's solids", () => {
  const clear = scenario();
  const blocked = {
    ...clear,
    seed: "blocked",
    solids: [boxCollider(0, 4, -0.8, 8, 4, 0.2)],
  };
  const app = new GameApplication(clear);
  app.start(clear, true);
  app.press("KeyW");
  for (let i = 0; i < 10; i++) {
    app.tick(0.1);
  }
  near(app.state.distance, 4.3);
  app.start(blocked, true);
  app.press("KeyW");
  for (let i = 0; i < 10; i++) {
    app.tick(0.1);
  }
  assert.ok(app.state.z >= -0.4);
  app.restart();
  app.press("KeyW");
  for (let i = 0; i < 10; i++) {
    app.tick(0.1);
  }
  assert.ok(app.state.z >= -0.4);
  app.start(clear, true);
  app.press("KeyW");
  for (let i = 0; i < 10; i++) {
    app.tick(0.1);
  }
  near(app.state.distance, 4.3);
});

await test("terminal availability and connection progress use the current island", () => {
  const island = createIsland("robot-home");
  const app = new GameApplication(island);
  assert.equal(app.canUseTerminal, false);
  app.start(island, true);
  assert.equal(app.canUseTerminal, true);
  app.openTerminal();
  assert.equal(app.canUseTerminal, false);
  app.checkLink();
  app.checkLink();
  assert.equal(app.state.linkChecked, true);
  app.resume("terminal");
  app.press("KeyS");
  for (let i = 0; i < 20; i++) {
    app.tick(0.1);
  }
  assert.equal(app.canUseTerminal, false);
  assert.equal(app.openTerminal(), false);
  app.restart();
  assert.equal(app.state.linkChecked, false);
  assert.equal(app.canUseTerminal, true);
});

await test("terminal interaction rejects an otherwise nearby console at a different height", () => {
  const island = {
    ...scenario(),
    terminal: { x: 0, z: 2 },
    heightAt: (_x: number, z: number) => (z < 1 ? 4 : 6),
  };
  const app = new GameApplication(island);
  app.start(island, true);
  assert.equal(app.canUseTerminal, false);
  assert.equal(app.openTerminal(), false);
  app.checkLink();
  assert.equal(app.state.linkChecked, false);
});
