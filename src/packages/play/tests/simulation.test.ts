import test from "node:test";
import assert from "node:assert/strict";
import {
  createSimulation,
  look,
  transition,
  viewPosition,
} from "../simulation.ts";
import type { GameState, Input } from "../simulation.ts";
import type { HeightSampler, Island, Point } from "../../island/index.ts";
import { DEFAULT_ISLAND, createIsland } from "../../island/index.ts";
import { boxCollider } from "../../island/geometry.ts";
import type { Obstacle } from "../../island/geometry.ts";
// Physical expectations are specifications, not imports of private implementation constants.
const WALK_SPEED = 4.3;
const STEP = 1 / 120,
  STANDING_HEIGHT = 1.8,
  MAX_PITCH = Math.PI / 2 - 0.01;
const createGame = (island = DEFAULT_ISLAND) =>
  createSimulation(island).createState();
const makeObstacles = (island = DEFAULT_ISLAND) => island.solids;
// Scenarios supply one coherent island through the same headless seam used by play.
function advance(
  state: GameState,
  input: Input,
  seconds: number,
  heightAt: HeightSampler = DEFAULT_ISLAND.heightAt,
  solids: readonly Obstacle[] = [],
  island = DEFAULT_ISLAND
) {
  return createSimulation({ ...island, heightAt, solids }).advance(
    state,
    input,
    seconds
  );
}
function fits(
  point: Point,
  y: number,
  _height: number,
  heightAt: HeightSampler,
  solids: readonly Obstacle[]
) {
  return createSimulation({ ...DEFAULT_ISLAND, heightAt, solids }).canStandAt(
    point,
    y
  );
}
const eyeHeight = (state: GameState) =>
  viewPosition({ ...state, paused: true }).y - state.y;
const { spawn: SPAWN } = DEFAULT_ISLAND;
const flat = () => 3;
const active = (): GameState => ({
  ...createGame(),
  x: 0.5,
  y: 3,
  z: 0.5,
  paused: false,
});
const near = (actual: number, expected: number, tolerance = 1e-8) => {
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `${String(actual)} != ${String(expected)}`
  );
};
function move(
  s: GameState,
  input: Input,
  frames = 120,
  dt = STEP,
  sample: HeightSampler = flat,
  obstacles: readonly Obstacle[] = [],
  island: Island = DEFAULT_ISLAND
) {
  for (let i = 0; i < frames; i++) {
    s = advance(s, input, dt, sample, obstacles, island);
  }
  return s;
}
await test("walking has one speed in every direction", () => {
  near(move(active(), { forward: true }).distance, WALK_SPEED);
  near(move(active(), { back: true }).distance, WALK_SPEED);
  near(move(active(), { right: true }).distance, WALK_SPEED);
});
await test("diagonals normalize, opposing keys cancel, strafing follows yaw not pitch", () => {
  near(move(active(), { forward: true, right: true }).distance, WALK_SPEED);
  near(move(active(), { forward: true, back: true }).distance, 0);
  const turned = look(active(), Math.PI / 2, 1.5);
  near(move(turned, { forward: true }).x, turned.x - WALK_SPEED);
  near(move(turned, { right: true }).z, turned.z - WALK_SPEED);
  near(move(active(), { back: true }).z, 0.5 + WALK_SPEED);
});
await test("mouse look wraps yaw, clamps pitch and ignores paused or invalid input", () => {
  near(look(active(), Math.PI * 8 + 0.5, 100).yaw, 0.5);
  near(look(active(), 0, 100).pitch, MAX_PITCH);
  near(look(active(), 0, -100).pitch, -MAX_PITCH);
  const paused = createGame();
  assert.equal(look(paused, 1, 1), paused);
  const afterPause = transition(active(), "pause");
  assert.equal(look(afterPause, 1, 1), afterPause);
  const s = active();
  assert.equal(look(s, NaN, 0), s);
});
await test("eligible terraces jump automatically while excessive rises and drops block", () => {
  const terrace = (x: number) => (x >= 1 ? 4 : 3);
  const climbed = move(active(), { right: true }, 240, STEP, terrace);
  assert.ok(climbed.x > 2);
  near(climbed.y, 4);
  const wall = (x: number) => (x >= 1 ? 6 : 3);
  const slid = move(active(), { right: true, forward: true }, 120, STEP, wall);
  assert.ok(slid.x <= 0.7);
  assert.ok(slid.z < -2);
  const cliff = (x: number) => (x < 1 ? 6 : 3);
  const stopped = move(
    { ...active(), y: 6 },
    { right: true },
    120,
    STEP,
    cliff
  );
  assert.ok(stopped.x <= 0.7);
  near(stopped.y, 6);
});
await test("airborne movement cannot cross the haze boundary or the finite world boundary", () => {
  const coast = (x: number) => (x >= 1 ? 0 : 3);
  const s = move(active(), { right: true }, 240, STEP, coast);
  assert.ok(s.x <= 0.7);
  const edge = move({ ...active(), x: 47.5 }, { right: true }, 240);
  assert.ok(edge.x <= 47.7);
});
await test("fixed-step physics agrees across frame rates; invalid times freeze and stalls are bounded", () => {
  const input = { forward: true };
  const sixty = move(active(), input, 60, 1 / 60);
  for (const fps of [30, 144, 240]) {
    const s = move(active(), input, fps, 1 / fps);
    near(s.y, sixty.y);
    near(s.z, sixty.z);
    near(s.velocityY, sixty.velocityY);
  }
  near(
    advance(active(), { forward: true }, 100, flat).distance,
    WALK_SPEED * 0.1
  );
  for (const dt of [0, -1, NaN, Infinity]) {
    const s = active();
    assert.equal(advance(s, input, dt, flat), s);
  }
});
await test("pause freezes physics and look; capture resumes without catch-up", () => {
  const airborne = move(active(), {}, 15);
  for (const event of ["pause", "return"] as const) {
    const s = transition(airborne, event);
    assert.equal(advance(s, { forward: true }, 50, flat), s);
    assert.equal(look(s, 1, 1), s);
    near(s.y, airborne.y);
    near(s.velocityY, airborne.velocityY);
    near(transition(s, "capture").accumulator, 0);
  }
  const s = transition(transition(airborne, "pause"), "return");
  assert.equal(s.paused, true);
  assert.equal(transition(transition(s, "pause"), "pause").paused, true);
  assert.equal(transition(s, "capture").paused, false);
});
await test("invalid positions recover to spawn preserving the journal; fresh reset clears everything", () => {
  for (const bad of [
    { x: NaN },
    { z: 100 },
    { y: -30 },
    { velocityY: Infinity },
  ]) {
    const s = advance(
      { ...active(), ...bad, discovered: ["copper"] },
      {},
      STEP
    );
    near(s.x, SPAWN.x);
    near(s.z, SPAWN.z);
    assert.ok(Number.isFinite(s.y));
    assert.deepEqual(s.discovered, ["copper"]);
  }
  const fresh = createGame();
  near(fresh.velocityY, 0);
  near(fresh.pitch, 0);
  near(fresh.yaw, 0);
  near(fresh.accumulator, 0);
  assert.equal(fresh.traversal.phase, "walking");
  assert.equal(fresh.grounded, true);
  assert.deepEqual(fresh.discovered, []);
});
await test("terrain footprint includes diagonal cells and box collision uses vertical bounds", () => {
  const diagonal = (x: number, z: number) => (x >= 1 && z >= 1 ? 4 : 3);
  const simulation = createSimulation({
    ...DEFAULT_ISLAND,
    heightAt: diagonal,
    solids: [],
  });
  assert.equal(simulation.canStandAt({ x: 0.75, z: 0.75 }, 3), false);
  assert.equal(simulation.canStandAt({ x: 0.65, z: 0.75 }, 3), true);
  const box = boxCollider(0.5, 5, 0.5, 1, 1, 1);
  assert.equal(fits(active(), 3, STANDING_HEIGHT, flat, [box]), true);
  assert.equal(fits(active(), 4, STANDING_HEIGHT, flat, [box]), false);
  assert.equal(fits(active(), 6, STANDING_HEIGHT, flat, [box]), true);
});
await test("all seeded resources are reachable by executing the controller along terrain routes", () => {
  // Search cardinal cell routes, then actually traverse every selected route with
  // production walking/jumping. Candidate routes alone do not establish reachability.
  for (const seed of [
    "signal-and-shelter",
    "731",
    "robots",
    "ø-hop",
    "a different coast",
  ]) {
    const island = createIsland(seed);
    const { spawn: SPAWN, heightAt, resources: RESOURCES } = island;
    const obstacles = makeObstacles(island);
    for (const resource of RESOURCES) {
      const queue: { x: number; z: number; parent: number }[] = [
        { ...SPAWN, parent: -1 },
      ];
      const seen = new Set([`${String(SPAWN.x)},${String(SPAWN.z)}`]);
      let target = -1;
      for (let i = 0; i < queue.length; i++) {
        const p = queue[i];
        assert.ok(p);
        if (Math.hypot(p.x - resource.x, p.z - resource.z) <= 3) {
          target = i;
          break;
        }
        for (const [dx, dz] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const next = { x: p.x + dx, z: p.z + dz, parent: i };
          const key = `${String(next.x)},${String(next.z)}`;
          if (seen.has(key)) {
            continue;
          }
          seen.add(key);
          const y = heightAt(next.x, next.z);
          if (
            Math.abs(y - heightAt(p.x, p.z)) <= 1 &&
            fits(next, y, STANDING_HEIGHT, heightAt, obstacles)
          ) {
            queue.push(next);
          }
        }
      }
      assert.ok(target >= 0, `No route to ${resource.id}`);
      const route = [];
      while (target >= 0) {
        const p = queue[target];
        assert.ok(p);
        route.unshift(p);
        target = p.parent;
      }
      let s = transition(createGame(island), "capture");
      for (const point of route.slice(1)) {
        for (
          let tick = 0;
          tick < 300 && Math.hypot(s.x - point.x, s.z - point.z) > 0.035;
          tick++
        ) {
          const yaw = Math.atan2(-(point.x - s.x), -(point.z - s.z));
          s = look(s, yaw - s.yaw, 0);
          s = advance(s, { forward: true }, STEP, heightAt, obstacles, island);
        }
        assert.ok(
          Math.hypot(s.x - point.x, s.z - point.z) <= 0.035,
          `Stuck on route to ${resource.id} at ${String(s.x)},${String(s.z)}`
        );
        s = move(s, {}, 100, STEP, heightAt, obstacles, island);
      }
      assert.ok(s.discovered.includes(resource.id));
    }
  }
});

await test("camera interpolates fixed-step positions but pauses and resets without drift", () => {
  const s = advance(active(), { right: true }, STEP * 1.5, flat);
  const view = viewPosition(s);
  near(view.x, (s.previousPosition.x + s.x) / 2);
  near(view.y, (s.previousPosition.y + s.y) / 2 + eyeHeight(s));
  const paused = transition(s, "pause");
  near(viewPosition(paused).x, s.x);
  near(viewPosition(transition(paused, "capture")).x, s.x);
  near(viewPosition(createGame()).x, SPAWN.x);
});

await test("footprint catches a raised half-cell between old one-metre sample points", () => {
  const halfCell = (x: number) => (x >= 0.5 && x < 1 ? 3.5 : 3);
  assert.equal(
    fits({ x: 0.55, z: 0.25 }, 3, STANDING_HEIGHT, halfCell, []),
    false
  );
  const state = { ...active(), x: 0.1, z: 0.25 };
  const jumped = move(state, { right: true }, 240, STEP, halfCell);
  assert.ok(jumped.x > 1.5);
  near(jumped.y, 3);
});

await test("recovery uses the bound island spawn and preserves discoveries and connection progress", () => {
  const island = createIsland("robot-home");
  const simulation = createSimulation(island);
  const state = {
    ...simulation.createState(),
    paused: false,
    x: NaN,
    linkChecked: true,
    discovered: ["copper"],
  };
  const recovered = simulation.advance(state, {}, STEP);
  near(recovered.x, island.spawn.x);
  near(recovered.z, island.spawn.z);
  assert.equal(recovered.linkChecked, true);
  assert.deepEqual(recovered.discovered, ["copper"]);
});

await test("automatic jump timing and position agree across render frame rates", () => {
  const terrace = (x: number) => (x >= 1 ? 4 : 3);
  const reference = move(active(), { right: true }, 60, 1 / 60, terrace);
  for (const fps of [30, 120, 144, 240]) {
    const result = move(active(), { right: true }, fps, 1 / fps, terrace);
    near(result.x, reference.x);
    near(result.y, reference.y);
    near(result.velocityY, reference.velocityY);
    assert.deepEqual(result.traversal, reference.traversal);
  }
});
