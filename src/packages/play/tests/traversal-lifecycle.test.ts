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
    assert.ok(app.state.x >= 1 && app.state.x < 1.3);
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

void test("reported seeded terrace permits W, A and W+A through actual camera-relative input", () => {
  for (const keys of [["KeyW"], ["KeyA"], ["KeyW", "KeyA"]]) {
    const island = {
      ...createIsland("signal-and-shelter"),
      spawn: { x: 30.8, z: 13.8 },
    };
    const app = new GameApplication(island, true);
    app.start(island, true);
    for (const key of keys) {
      app.press(key);
    }
    for (let i = 0; i < 240; i++) {
      app.tick(1 / 120);
    }
    assert.ok(
      Math.hypot(app.state.x - 30.8, app.state.z - 13.8) > 0.6,
      `${keys.join("+")} did not traverse the reported terrace`
    );
  }
});

void test("movement reports preserve the failed attempt through pause and clear it on restart or new seed", () => {
  const island = {
    ...createIsland("report-seed"),
    spawn: { x: 0.5, z: 0.5 },
    heightAt: (x: number) => (x >= 1 ? 5 : 3),
    solids: [],
  };
  const app = new GameApplication(island, true);
  app.start(island, true);
  app.press("KeyD");
  for (let i = 0; i < 20; i++) {
    app.tick(1 / 60);
  }
  app.release("KeyD");
  app.pause();
  const report = app.movementReport;
  assert.equal(report.seed, "report-seed");
  assert.notEqual(report.position.x, Number(report.position.x.toFixed(1)));
  assert.ok(JSON.stringify(report).includes(String(report.position.x)));
  assert.equal(report.generatorVersion, 2);
  assert.equal(report.reportVersion, 1);
  assert.equal(report.paused, true);
  assert.deepEqual(report.position, {
    x: app.state.x,
    y: app.state.y,
    z: app.state.z,
  });
  assert.equal(report.blockedAttempts.at(-1)?.direction.x, 1);
  assert.equal(Math.abs(report.blockedAttempts.at(-1)?.direction.z ?? NaN), 0);
  assert.match(JSON.stringify(report), /elevationRejected/);
  app.tick(1);
  assert.deepEqual(app.movementReport, report);
  app.restart();
  assert.deepEqual(app.movementReport.blockedAttempts, []);
  app.start(createIsland("new-report-seed"), true);
  assert.equal(app.movementReport.seed, "new-report-seed");
  assert.deepEqual(app.movementReport.blockedAttempts, []);
});
