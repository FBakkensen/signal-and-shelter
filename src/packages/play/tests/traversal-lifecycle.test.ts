import test from "node:test";
import assert from "node:assert/strict";
import { GameApplication } from "../index.ts";
import { createIsland } from "../../island/index.ts";

function playing() {
  const island = {
    ...createIsland(),
    spawn: { x: 0.5, z: 0.5 },
    terminal: { x: 0.5, z: 0.5 },
    heightAt: (x: number) => (x >= 1 ? 4 : 3),
    solids: [],
  };
  const app = new GameApplication(island, true);
  app.start(island, true);
  app.press("KeyD");
  return app;
}
function reach(app: GameApplication, phase: typeof app.state.traversal.phase) {
  for (let i = 0; i < 240; i++) {
    if (app.state.traversal.phase === phase) {
      return;
    }
    app.tick(1 / 120);
  }
  assert.fail(`Did not reach ${phase}`);
}
void test("explicit pause freezes and resumes setup, flight and recovery without stale held walking", () => {
  for (const phase of ["preparing", "airborne", "recovering"] as const) {
    const app = playing();
    reach(app, phase);
    const traversal = app.state.traversal;
    app.pause();
    const paused = app.state;
    app.tick(1);
    assert.equal(app.state, paused);
    assert.deepEqual(app.state.traversal, traversal);
    app.resume();
    for (let i = 0; i < 200; i++) {
      app.tick(1 / 120);
    }
    assert.equal(app.state.traversal.phase, "walking");
    assert.equal(app.state.y, 4);
    assert.ok(app.state.x > 1.3 && app.state.x < 1.5);
    const x = app.state.x;
    app.tick(0.1);
    assert.equal(app.state.x, x);
  }
});
void test("release and redirect during preparation cancel the obsolete takeoff", () => {
  const app = playing();
  reach(app, "preparing");
  app.release("KeyD");
  app.tick(0.1);
  assert.equal(app.state.traversal.phase, "walking");
  assert.equal(app.state.y, 3);
  app.press("KeyD");
  reach(app, "preparing");
  app.release("KeyD");
  app.press("KeyA");
  app.tick(0.1);
  assert.equal(app.state.traversal.phase, "walking");
  assert.ok(app.state.x < 0.5);
});
void test("focus loss clears keyboard input without pausing an airborne traversal", () => {
  const app = playing();
  reach(app, "airborne");
  app.focusLost();
  assert.equal(app.state.paused, false);
  for (let i = 0; i < 200; i++) {
    app.tick(1 / 120);
  }
  assert.equal(app.state.traversal.phase, "walking");
  assert.equal(app.state.y, 4);
  const x = app.state.x;
  app.tick(0.1);
  assert.equal(app.state.x, x);
});
void test("terminal leaves flight running, blocks gameplay keys, and Escape-style pause closes it", () => {
  const app = playing();
  reach(app, "airborne");
  assert.equal(app.openTerminal(), true);
  assert.equal(app.state.paused, false);
  for (const key of [
    "KeyD",
    "KeyQ",
    "Home",
    "Space",
    "ControlLeft",
    "ShiftRight",
  ]) {
    assert.equal(app.press(key), false);
  }
  app.tick(0.1);
  assert.ok(app.state.y > 3);
  assert.equal(app.terminalOpen, true);
  app.pause();
  assert.equal(app.terminalOpen, false);
  const frozen = app.state;
  app.tick(1);
  assert.equal(app.state, frozen);
  app.resume();
  for (let i = 0; i < 200; i++) {
    app.tick(1 / 120);
  }
  assert.equal(app.state.y, 4);
});
void test("restart and seed replacement clear traversal and old intent", () => {
  for (const phase of ["preparing", "airborne", "recovering"] as const) {
    const app = playing();
    reach(app, phase);
    app.restart();
    app.tick(0.1);
    assert.equal(app.state.x, 0.5);
    assert.equal(app.state.y, 3);
    assert.equal(app.state.traversal.phase, "walking");
    app.press("KeyD");
    reach(app, phase);
    app.start({ ...app.island, spawn: { x: 2, z: 0.5 } }, true);
    app.tick(0.1);
    assert.equal(app.state.x, 2);
    assert.equal(app.state.y, 4);
    assert.equal(app.state.traversal.phase, "walking");
  }
});
