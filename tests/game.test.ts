import type { GameState, Input, Obstacle } from "../src/game.ts";
import type { HeightSampler } from "../src/world.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  advance,
  canStand,
  discover,
  turn,
  setPaused,
  toggleOverview,
} from "../src/game.ts";
import { LANDMARKS, SPAWN, heightAt, makeTrees } from "../src/world.ts";
const flat = () => 3;
const active = () => ({ ...createGame(), paused: false });
const move = (
  s: GameState,
  input: Input,
  frames = 10,
  dt = 0.1,
  sample: HeightSampler = flat,
  obstacles: Obstacle[] = [],
) => {
  for (let i = 0; i < frames; i++) {
    s = advance(s, input, dt, sample, obstacles);
  }
  return s;
};
const near = (a: number, b: number) => {
  assert.ok(Math.abs(a - b) < 1e-8, `${String(a)} != ${String(b)}`);
};
await test("walking covers five metres per second; running covers nine", () => {
  const s = active();
  near(s.z - move(s, { forward: true }).z, 5);
  near(s.z - move(s, { forward: true, run: true }).z, 9);
});
await test("diagonal movement is normalized; opposite inputs cancel", () => {
  const s = active();
  near(move(s, { forward: true, right: true }).distance, 5);
  assert.deepEqual(advance(s, { forward: true, back: true }, 0.1, flat), s);
});
await test("camera-relative movement, strafing and backward movement", () => {
  const s = turn(active(), Math.PI / 2);
  near(s.x - move(s, { forward: true }).x, 5);
  near(move(active(), { right: true }).x - SPAWN.x, 5);
  near(move(active(), { back: true }).z - SPAWN.z, 5);
});
await test("paused and overview states prevent walking, resume restores it", () => {
  const s = createGame();
  assert.equal(advance(s, { forward: true }, 0.1, flat), s);
  const overview = toggleOverview(active());
  assert.equal(advance(overview, { forward: true }, 0.1, flat), overview);
  assert.ok(
    advance(setPaused(s, false), { forward: true }, 0.1, flat).distance > 0,
  );
  assert.equal(toggleOverview(overview).overview, false);
});
await test("time is frame-rate independent and large or invalid deltas are safe", () => {
  near(
    move(active(), { forward: true }, 10, 0.1).z,
    move(active(), { forward: true }, 100, 0.01).z,
  );
  near(advance(active(), { forward: true }, 100, flat).distance, 0.5);
  for (const dt of [0, -1, NaN, Infinity]) {
    assert.equal(advance(active(), {}, dt, flat).distance, 0);
  }
});
await test("water, cliffs and circular obstacles stop the player with radius clearance", () => {
  assert.equal(
    canStand(0, 0, 3, () => 1),
    false,
  );
  assert.equal(
    canStand(0, 0, 3, () => 5),
    false,
  );
  assert.equal(
    canStand(0, 0, 3, () => 4),
    true,
  );
  assert.equal(canStand(0, 0, 3, flat, [{ x: 0.5, z: 0 }]), false);
  const shore = (_x: number, z: number) => (z < 15 ? 0 : 3);
  const s = move(active(), { forward: true, run: true }, 20, 0.1, shore);
  assert.ok(s.z >= 15.24);
  const obstacle = { x: SPAWN.x, z: 15, radius: 0.2 };
  const blocked = move(active(), { forward: true, run: true }, 20, 0.1, flat, [
    obstacle,
  ]);
  assert.ok(blocked.z >= 15.44);
});
await test("blocked axis permits sliding along walls", () => {
  const s = move(
    { ...active(), x: 0.7, z: 0 },
    { forward: true, right: true },
    10,
    0.1,
    (x) => (x >= 1 ? 6 : 3),
  );
  assert.ok(s.x < 0.77);
  assert.ok(s.z < -3);
});
await test("discovery uses proximity, is unique, persists and does not mutate state", () => {
  const p = LANDMARKS[0];
  assert.ok(p);
  const s = { ...active(), x: p.x, z: p.z + 4 };
  assert.deepEqual(discover(s, LANDMARKS), [p.id]);
  assert.deepEqual(s.discovered, []);
  const found = { ...s, discovered: [p.id] };
  assert.deepEqual(discover(found, LANDMARKS), [p.id]);
  assert.deepEqual(discover({ ...found, x: 100 }, LANDMARKS), [p.id]);
  assert.deepEqual(discover({ ...s, z: p.z + 4.01 }, LANDMARKS), []);
});
await test("real generated terrain allows a walk from spawn to the beacon", () => {
  const s = move(active(), { forward: true }, 20, 0.1, heightAt, makeTrees());
  assert.ok(s.discovered.includes("beacon"));
  assert.ok(s.distance > 7);
});
await test("fresh game resets position, discoveries and distance; turning wraps", () => {
  const s = createGame();
  assert.equal(s.x, SPAWN.x);
  assert.equal(s.z, SPAWN.z);
  assert.equal(s.distance, 0);
  assert.deepEqual(s.discovered, []);
  near(turn(s, Math.PI * 8 + 0.5).yaw, 0.5);
});

await test("each landmark is reachable from spawn over the actual terrain", () => {
  const obstacles = makeTrees();
  const queue = [{ ...SPAWN }];
  const seen = new Set([`${String(SPAWN.x)},${String(SPAWN.z)}`]);
  const found = new Set<string>();
  for (const p of queue) {
    for (const id of discover({ ...active(), ...p }, LANDMARKS)) {
      found.add(id);
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const x = p.x + dx,
        z = p.z + dz,
        key = `${String(x)},${String(z)}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      if (canStand(x, z, heightAt(p.x, p.z), heightAt, obstacles)) {
        queue.push({ x, z });
      }
    }
  }
  assert.deepEqual([...found].sort(), LANDMARKS.map((p) => p.id).sort());
});

await test("discovering every landmark completes the journal without duplicate entries", () => {
  let state = active();
  for (const landmark of LANDMARKS) {
    state = { ...state, x: landmark.x, z: landmark.z };
    state = { ...state, discovered: discover(state, LANDMARKS) };
  }
  assert.equal(state.discovered.length, 3);
  assert.equal(discover(state, LANDMARKS).length, 3);
});
