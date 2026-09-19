import test from "node:test";
import assert from "node:assert/strict";
import { createSimulationClock } from "../src/simulation-clock.ts";
import { GameApplication } from "../src/packages/play/index.ts";
import { createIsland } from "../src/packages/island/index.ts";
void test("one clock handles throttled callbacks without double-ticking or giant physics steps", () => {
  const calls: number[] = [];
  const clock = createSimulationClock((seconds) => calls.push(seconds));
  clock(100);
  clock(1100);
  clock(1100);
  clock(1000);
  clock(NaN);
  assert.ok(Math.abs(calls.reduce((a, b) => a + b, 0) - 1) < 1e-9);
  assert.ok(calls.every((dt) => dt <= 0.05));
  calls.length = 0;
  clock(100000);
  assert.ok(Math.abs(calls.reduce((a, b) => a + b, 0) - 2) < 1e-9);
});
void test("delayed callbacks advance real play but explicit pause freezes it", () => {
  const island = {
    ...createIsland(),
    spawn: { x: 0, z: 0 },
    heightAt: () => 3,
    solids: [],
  };
  const app = new GameApplication(island, true);
  app.start(island, true);
  app.press("KeyD");
  const clock = createSimulationClock((dt) => {
    app.tick(dt);
  });
  clock(0);
  clock(1000);
  assert.ok(Math.abs(app.state.x - 4.3) < 1e-8);
  app.pause();
  clock(2000);
  assert.ok(Math.abs(app.state.x - 4.3) < 1e-8);
  app.resume();
  clock(3000);
  assert.ok(Math.abs(app.state.x - 4.3) < 1e-8);
});
