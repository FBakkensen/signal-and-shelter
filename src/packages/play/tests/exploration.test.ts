import test from "node:test";
import assert from "node:assert/strict";
import { GameApplication } from "../index.ts";
import { exploredAt, exploredBounds } from "../exploration.ts";
import { createIsland } from "../../island/index.ts";

function fixture() {
  const source = createIsland("atlas-tests");
  return {
    ...source,
    heightAt: () => 3,
    spawn: { x: 0, z: 0 },
    solids: [],
    resources: source.resources.map((r, i) => ({
      ...r,
      x: [6, 8.8, 12][i] ?? 20,
      z: 0,
    })),
  };
}
await test("menu and play share initial 8 m coverage; any revealed deposit part identifies it without a second radius", () => {
  const island = fixture(),
    app = new GameApplication(island, true);
  const [near, partial, distant] = island.resources;
  assert.ok(near && partial && distant);
  assert.deepEqual(app.state.discovered, [near.id, partial.id]);
  assert.ok(exploredAt(app.exploration, 7.99, 0));
  assert.ok(!exploredAt(app.exploration, 8.01, 0));
  assert.ok(!exploredAt(app.exploration, 7, 7));
  const initial = app.exploration;
  app.tick(1);
  assert.equal(app.exploration, initial);
  const slices = exploredBounds(initial, {
    minX: 7.9,
    maxX: 9.7,
    minZ: -0.9,
    maxZ: 0.9,
  });
  assert.ok(slices.length > 0);
  assert.ok(slices.every((p) => p.maxX <= 8));
  app.start(island, true);
  assert.deepEqual(app.exploration, initial);
  app.press("KeyD");
  for (let i = 0; i < 20; i++) {
    app.tick(0.05);
  }
  app.release("KeyD");
  assert.ok(app.state.discovered.includes(distant.id));
  assert.ok(!exploredAt(initial, 11, 0));
  assert.ok(exploredAt(app.exploration, 11, 0));
  app.press("KeyA");
  for (let i = 0; i < 60; i++) {
    app.tick(0.05);
  }
  app.release("KeyA");
  assert.ok(app.state.discovered.includes(distant.id));
  assert.ok(exploredAt(app.exploration, 11, 0));
});
await test("pause, orbit, jumping and invalid frame lengths do not reveal more ground; restart and replacement retain only initial knowledge", () => {
  const island = fixture(),
    app = new GameApplication(island, true);
  app.start(island, true);
  const initial = app.exploration;
  app.press("KeyE");
  app.press("Space");
  app.tick(0.05);
  app.release("KeyE");
  app.release("Space");
  assert.equal(app.exploration, initial);
  const yaw = app.state.yaw;
  app.press("KeyD");
  for (let i = 0; i < 20; i++) {
    app.tick(0.05);
  }
  app.release("KeyD");
  app.select("ship");
  const travelled = app.exploration;
  app.pause();
  app.press("KeyD");
  app.tick(1);
  assert.equal(app.exploration, travelled);
  app.resume();
  app.tick(Number.NaN);
  assert.equal(app.exploration, travelled);
  app.restart();
  assert.deepEqual(app.exploration, initial);
  assert.equal(app.selection, null);
  assert.ok(Math.abs(app.state.yaw - yaw) < 1e-12);
  app.chooseSeed();
  assert.deepEqual(app.exploration, initial);
  const next = { ...island, spawn: { x: 20, z: 20 } };
  app.start(next, true);
  assert.ok(!exploredAt(app.exploration, 0, 0));
  assert.ok(exploredAt(app.exploration, 20, 20));
  assert.ok(Math.abs(app.state.yaw - yaw) < 1e-12);
});
await test("exploration ignores obstacles and height, clips at island bounds, and preserves unvisited gaps", () => {
  const island = fixture();
  const app = new GameApplication(
    {
      ...island,
      solids: [{ minX: 2, maxX: 3, minY: 0, maxY: 100, minZ: -20, maxZ: 20 }],
    },
    true
  );
  assert.ok(exploredAt(app.exploration, 6, 0));
  const high = new GameApplication({ ...island, heightAt: () => 30 }, true);
  assert.deepEqual(high.exploration, app.exploration);
  const edge = new GameApplication(
    { ...island, spawn: { x: 47, z: 47 } },
    true
  );
  assert.ok(exploredAt(edge.exploration, 47.9, 47.9));
  assert.ok(!exploredAt(edge.exploration, 48, 48));
  const bounds = exploredBounds(edge.exploration, {
    minX: 40,
    maxX: 55,
    minZ: 40,
    maxZ: 55,
  });
  assert.ok(bounds.every((p) => p.maxX <= 48 && p.maxZ <= 48));
  assert.deepEqual(
    exploredBounds(app.exploration, { minX: 20, maxX: 21, minZ: 20, maxZ: 21 }),
    []
  );
});
