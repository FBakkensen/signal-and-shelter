import test from "node:test";
import assert from "node:assert/strict";
import type { GameState, Input } from "../src/game.ts";
import type { HeightSampler } from "../src/world.ts";
import type { Obstacle } from "../src/collision.ts";
import {
  viewPosition,
  advance,
  createGame,
  discover,
  eyeHeight,
  look,
  transition,
  MAX_PITCH,
  RUN_SPEED,
  SNEAK_SPEED,
  STEP,
  WALK_SPEED,
} from "../src/game.ts";
import {
  boxCollider,
  fits,
  makeObstacles,
  RADIUS,
  STANDING_HEIGHT,
  terrainHeights,
} from "../src/collision.ts";
import { heightAt, LANDMARKS, SPAWN } from "../src/world.ts";
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
    `${String(actual)} != ${String(expected)}`,
  );
};
function move(
  s: GameState,
  input: Input,
  frames = 120,
  dt = STEP,
  sample: HeightSampler = flat,
  obstacles: readonly Obstacle[] = [],
) {
  for (let i = 0; i < frames; i++) {
    s = advance(s, input, dt, sample, obstacles);
  }
  return s;
}
await test("walk, forward sprint, sneak priority and backward sprint restriction", () => {
  near(move(active(), { forward: true }).distance, WALK_SPEED);
  near(move(active(), { forward: true, run: true }).distance, RUN_SPEED);
  near(
    move(active(), { forward: true, run: true, sneak: true }).distance,
    SNEAK_SPEED,
  );
  near(move(active(), { back: true, run: true }).distance, WALK_SPEED);
  near(move(active(), { right: true, run: true }).distance, WALK_SPEED);
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
  const overview = transition(active(), "overview");
  assert.equal(look(overview, 1, 1), overview);
  const s = active();
  assert.equal(look(s, NaN, 0), s);
});
await test("jump reaches 1.25 metres, lands, and cannot double jump", () => {
  let s = advance(active(), { jump: true }, STEP, flat);
  const airborne = s;
  near(move(airborne, { jump: true }, 10).y, move(airborne, {}, 10).y);
  let apex = s.y;
  for (let i = 0; i < 100; i++) {
    s = advance(s, {}, STEP, flat);
    apex = Math.max(apex, s.y);
  }
  near(apex, 4.25, 0.001);
  near(s.y, 3);
  assert.equal(s.grounded, true);
  near(s.velocityY, 0);
  near(s.distance, 0);
  const repeated = move(active(), { jump: true }, 100);
  assert.ok(repeated.y > 3);
  assert.equal(repeated.grounded, false);
});
await test("one-block terrace requires a jump; taller walls block and permit sliding", () => {
  const terrace = (x: number) => (x >= 1 ? 4 : 3);
  const stopped = move(active(), { right: true }, 120, STEP, terrace);
  assert.ok(stopped.x <= 1 - RADIUS);
  near(stopped.y, 3);
  let jumped = move(stopped, { right: true, jump: true }, 50, STEP, terrace);
  jumped = move(jumped, {}, 100, STEP, terrace);
  assert.ok(jumped.x > 1.3);
  near(jumped.y, 4);
  assert.equal(jumped.grounded, true);
  const wall = (x: number) => (x >= 1 ? 6 : 3);
  const slid = move(
    active(),
    { right: true, forward: true, jump: true, run: true },
    120,
    STEP,
    wall,
  );
  assert.ok(slid.x <= 0.7);
  assert.ok(slid.z < -3);
});
await test("walking off a cliff falls and lands; sneak protects edges and corners", () => {
  const cliff = (x: number, z: number) => (x < 1 && z < 1 ? 6 : 3);
  const start = { ...active(), y: 6 };
  const falling = move(start, { right: true }, 35, STEP, cliff);
  assert.ok(falling.y < 6 && falling.y > 3);
  assert.equal(falling.grounded, false);
  const landed = move(falling, {}, 120, STEP, cliff);
  near(landed.y, 3);
  const sneaking = move(
    start,
    { right: true, back: true, sneak: true },
    240,
    STEP,
    cliff,
  );
  assert.ok(sneaking.x <= 0.7 && sneaking.z <= 0.7);
  near(sneaking.y, 6);
  const leap = move(
    start,
    { right: true, sneak: true, jump: true },
    70,
    STEP,
    cliff,
  );
  assert.ok(leap.x > 1);
  assert.equal(leap.grounded, false);
});
await test("solid boxes stop sprinting, support landing and stop upward head motion", () => {
  const wall = boxCollider(1.5, 3, 0.5, 0.2, 4, 8);
  const s = move(
    active(),
    { right: true, forward: true, run: true },
    120,
    STEP,
    flat,
    [wall],
  );
  assert.ok(s.x < 1.11);
  assert.ok(s.z < -3);
  const platform = boxCollider(0.5, 3, 0.5, 2, 1, 2);
  const landed = move(
    { ...active(), y: 7, grounded: false, velocityY: -30 },
    {},
    60,
    STEP,
    flat,
    [platform],
  );
  near(landed.y, 4);
  assert.equal(landed.grounded, true);
  const ceiling = boxCollider(0.5, 5.1, 0.5, 4, 0.1, 4);
  let jumping = active();
  let highest = jumping.y;
  for (let i = 0; i < 100; i++) {
    jumping = advance(jumping, { jump: true }, STEP, flat, [ceiling]);
    highest = Math.max(highest, jumping.y);
  }
  assert.ok(highest <= 3.3 + 1e-8);
});
await test("crouch lowers eye height, prevents standing inside a ceiling and stands when clear", () => {
  const ceiling = boxCollider(0.5, 4.6, 0.5, 2, 0.2, 2);
  let s = advance(active(), { sneak: true }, STEP, flat, [ceiling]);
  assert.equal(s.crouching, true);
  near(eyeHeight(s), 1.27);
  s = advance(s, {}, STEP, flat, [ceiling]);
  assert.equal(s.crouching, true);
  s = move(s, { right: true }, 240, STEP, flat, [ceiling]);
  assert.equal(s.crouching, false);
  near(eyeHeight(s), 1.62);
});
await test("airborne movement cannot cross water or the finite world boundary", () => {
  const coast = (x: number) => (x >= 1 ? 0 : 3);
  const s = move(active(), { right: true, jump: true }, 240, STEP, coast);
  assert.ok(s.x <= 0.7);
  const edge = move({ ...active(), x: 47.5 }, { right: true, jump: true }, 240);
  assert.ok(edge.x <= 47.7);
});
await test("fixed-step physics agrees across frame rates; invalid times freeze and stalls are bounded", () => {
  const input = { forward: true, jump: true, run: true };
  const sixty = move(active(), input, 60, 1 / 60);
  for (const fps of [30, 144, 240]) {
    const s = move(active(), input, fps, 1 / fps);
    near(s.y, sixty.y);
    near(s.z, sixty.z);
    near(s.velocityY, sixty.velocityY);
  }
  near(
    advance(active(), { forward: true }, 100, flat).distance,
    WALK_SPEED * 0.1,
  );
  for (const dt of [0, -1, NaN, Infinity]) {
    const s = active();
    assert.equal(advance(s, input, dt, flat), s);
  }
});
await test("pause and overview freeze physics and look; capture resumes without catch-up", () => {
  const airborne = move(active(), { jump: true }, 15);
  for (const event of ["pause", "overview", "return"] as const) {
    const s = transition(airborne, event);
    assert.equal(advance(s, { jump: true, forward: true }, 50, flat), s);
    assert.equal(look(s, 1, 1), s);
    near(s.y, airborne.y);
    near(s.velocityY, airborne.velocityY);
    near(transition(s, "capture").accumulator, 0);
  }
  const s = transition(transition(airborne, "overview"), "return");
  assert.equal(s.overview, false);
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
      { ...active(), ...bad, discovered: ["beacon"] },
      {},
      STEP,
    );
    near(s.x, SPAWN.x);
    near(s.z, SPAWN.z);
    assert.ok(Number.isFinite(s.y));
    assert.deepEqual(s.discovered, ["beacon"]);
  }
  const fresh = createGame();
  near(fresh.velocityY, 0);
  near(fresh.pitch, 0);
  near(fresh.yaw, 0);
  near(fresh.accumulator, 0);
  assert.equal(fresh.crouching, false);
  assert.equal(fresh.grounded, true);
  assert.deepEqual(fresh.discovered, []);
});
await test("stationary discovery respects four-metre boundary, persists and never duplicates", () => {
  const p = LANDMARKS[0];
  assert.ok(p);
  const s = { ...active(), x: p.x, z: p.z + 4 };
  assert.deepEqual(discover(s, LANDMARKS), [p.id]);
  assert.deepEqual(discover({ ...s, z: p.z + 4.01 }, LANDMARKS), []);
  const found = advance(s, {}, STEP, flat);
  assert.deepEqual(found.discovered, [p.id]);
  assert.deepEqual(s.discovered, []);
  assert.deepEqual(discover({ ...found, x: 100 }, LANDMARKS), [p.id]);
});
await test("terrain footprint includes diagonal cells and box collision uses vertical bounds", () => {
  assert.deepEqual(
    terrainHeights({ x: 1, z: 1 }, (x, z) => Math.floor(x) * 2 + Math.floor(z)),
    [0, 1, 2, 3],
  );
  const box = boxCollider(0.5, 5, 0.5, 1, 1, 1);
  assert.equal(fits(active(), 3, STANDING_HEIGHT, flat, [box]), true);
  assert.equal(fits(active(), 4, STANDING_HEIGHT, flat, [box]), false);
  assert.equal(fits(active(), 6, STANDING_HEIGHT, flat, [box]), true);
});
await test("all real landmarks are reachable by executing the controller along terrain routes", () => {
  const obstacles = makeObstacles();
  // Search cardinal cell routes, then actually traverse every selected route with
  // production walking/jumping. Candidate routes alone do not establish reachability.
  for (const landmark of LANDMARKS) {
    const queue: { x: number; z: number; parent: number }[] = [
      { ...SPAWN, parent: -1 },
    ];
    const seen = new Set([`${String(SPAWN.x)},${String(SPAWN.z)}`]);
    let target = -1;
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i];
      assert.ok(p);
      if (Math.hypot(p.x - landmark.x, p.z - landmark.z) <= 3) {
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
    assert.ok(target >= 0, `No route to ${landmark.id}`);
    const route = [];
    while (target >= 0) {
      const p = queue[target];
      assert.ok(p);
      route.unshift(p);
      target = p.parent;
    }
    let s = transition(createGame(), "capture");
    for (const point of route.slice(1)) {
      for (
        let tick = 0;
        tick < 300 && Math.hypot(s.x - point.x, s.z - point.z) > 0.035;
        tick++
      ) {
        const yaw = Math.atan2(-(point.x - s.x), -(point.z - s.z));
        s = look(s, yaw - s.yaw, 0);
        s = advance(
          s,
          { forward: true, jump: heightAt(point.x, point.z) > s.y + 0.01 },
          STEP,
          heightAt,
          obstacles,
        );
      }
      assert.ok(
        Math.hypot(s.x - point.x, s.z - point.z) <= 0.035,
        `Stuck on route to ${landmark.id} at ${String(s.x)},${String(s.z)}`,
      );
      s = move(s, {}, 100, STEP, heightAt, obstacles);
    }
    assert.ok(s.discovered.includes(landmark.id));
  }
});

await test("camera interpolates fixed-step positions but pauses and resets without drift", () => {
  const s = advance(active(), { right: true, jump: true }, STEP * 1.5, flat);
  const view = viewPosition(s);
  near(view.x, (s.previousPosition.x + s.x) / 2);
  near(view.y, (s.previousPosition.y + s.y) / 2 + eyeHeight(s));
  const paused = transition(s, "pause");
  near(viewPosition(paused).x, s.x);
  near(viewPosition(transition(paused, "capture")).x, s.x);
  near(viewPosition(createGame()).x, SPAWN.x);
});
