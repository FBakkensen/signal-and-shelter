import test from "node:test";
import assert from "node:assert/strict";
import {
  createMovement,
  HUMANOID_CAPABILITIES,
  MOVEMENT_STEP,
} from "../index.ts";
import type { MovementCapabilities, MovementState } from "../index.ts";
import type { HeightSampler } from "../../island/index.ts";
import { boxCollider } from "../../island/geometry.ts";
import type { Obstacle } from "../../island/geometry.ts";
const right = { x: 1, z: 0 },
  idle = { x: 0, z: 0 };
function scenario(
  heightAt: HeightSampler = () => 3,
  solids: readonly Obstacle[] = [],
  capabilities: MovementCapabilities = HUMANOID_CAPABILITIES
) {
  const movement = createMovement({ heightAt, solids }, capabilities);
  return {
    movement,
    state: movement.createState({ x: 0.5, y: heightAt(0.5, 0.5), z: 0.5 }),
  };
}
function steps(
  movement: ReturnType<typeof createMovement>,
  state: MovementState,
  n: number,
  direction = right
) {
  for (let i = 0; i < n; i++) {
    state = movement.step(state, direction);
  }
  return state;
}
function until(
  movement: ReturnType<typeof createMovement>,
  state: MovementState,
  phase: MovementState["traversal"]["phase"]
) {
  for (let i = 0; i < 240; i++) {
    if (state.traversal.phase === phase) {
      return state;
    }
    state = movement.step(state, right);
  }
  assert.fail(
    `Never reached ${phase}; at ${String(state.x)}, ${String(state.y)}`
  );
}
void test("continuous normalized walking turns and releases without a queued segment", () => {
  const { movement, state } = scenario();
  const diagonal = steps(movement, state, 120, { x: 1, z: 1 });
  assert.ok(
    Math.abs(Math.hypot(diagonal.x - state.x, diagonal.z - state.z) - 4.3) <
      1e-9
  );
  assert.deepEqual(movement.step(diagonal, idle), diagonal);
  const turned = movement.step(diagonal, { x: -1, z: 0 });
  assert.ok(turned.x < diagonal.x);
  assert.equal(turned.z, diagonal.z);
});
void test("automatic up/down limit is symmetric and excludes a non-jumping actor", () => {
  for (const change of [-1, -0.5, 0.5, 1, -1.5, 1.5]) {
    for (const canJump of [true, false]) {
      const { movement, state } = scenario(
        (x) => (x >= 1 ? 3 + change : 3),
        [],
        { ...HUMANOID_CAPABILITIES, canJump }
      );
      const end = steps(movement, state, 240);
      if (canJump && Math.abs(change) <= 1) {
        assert.ok(end.x > 2, `Failed ${String(change)}: ${String(end.x)}`);
        assert.equal(end.y, 3 + change);
      } else {
        assert.ok(end.x <= 0.7);
        assert.equal(end.y, 3);
      }
    }
  }
});
void test("setup takes 0.12 s, release cancels, direction change walks away", () => {
  const { movement, state } = scenario((x) => (x >= 1 ? 4 : 3));
  const prep = until(movement, state, "preparing");
  const waiting = steps(movement, prep, 14);
  assert.equal(waiting.traversal.phase, "preparing");
  assert.equal(waiting.x, prep.x);
  assert.equal(steps(movement, prep, 15).traversal.phase, "airborne");
  const cancelled = movement.step(waiting, idle);
  assert.equal(cancelled.traversal.phase, "walking");
  assert.equal(cancelled.y, 3);
  const away = movement.step(waiting, { x: -1, z: 0 });
  assert.equal(away.traversal.phase, "walking");
  assert.ok(away.x < waiting.x);
});
void test("flight completes after release, then recovery lasts 0.12 s", () => {
  const { movement, state } = scenario((x) => (x >= 1 ? 4 : 3));
  const flight = until(movement, state, "airborne");
  let landed = flight;
  for (let i = 0; i < 240 && landed.traversal.phase !== "recovering"; i++) {
    landed = movement.step(landed, idle);
  }
  assert.equal(landed.y, 4);
  assert.ok(movement.supported(landed));
  assert.equal(landed.traversal.phase, "recovering");
  const recovering = steps(movement, landed, 14);
  assert.equal(recovering.x, landed.x);
  assert.equal(recovering.traversal.phase, "recovering");
  const done = movement.step(recovering, right);
  assert.equal(done.traversal.phase, "walking");
  assert.ok(movement.step(done, right).x > done.x);
});
void test("airborne steering is limited and retains a clear, supported landing", () => {
  const { movement, state } = scenario((x) => (x >= 1 ? 4 : 3));
  const flight = until(movement, state, "airborne");
  const straight = steps(movement, flight, 100, idle);
  const steered = steps(movement, flight, 100, { x: 0, z: 1 });
  assert.ok(steered.z > straight.z);
  // Additional ground walking after landing is excluded from steering comparison.
  let airborne = flight;
  while (airborne.traversal.phase === "airborne") {
    airborne = movement.step(airborne, { x: 0, z: 1 });
  }
  assert.ok(airborne.z - flight.z < 0.25);
  assert.ok(movement.supported(airborne));
});
void test("clearance, unsupported strips, gaps, and tall solids reject traversal", () => {
  const ceiling = boxCollider(1, 5, 0.5, 4, 0.2, 4);
  const low = scenario((x) => (x >= 1 ? 4 : 3), [ceiling]);
  assert.ok(steps(low.movement, low.state, 240).x <= 0.7);
  const gap = scenario((x) => (x >= 1 && x < 1.5 ? 1 : 3));
  assert.ok(steps(gap.movement, gap.state, 240).x <= 0.7);
  const narrowGap = scenario((x) => (x >= 1 && x < 1.5 ? 2.5 : 3));
  assert.ok(steps(narrowGap.movement, narrowGap.state, 240).x <= 0.7);
  const wall = scenario(() => 3, [boxCollider(1.5, 3, 0.5, 0.5, 1.5, 4)]);
  assert.ok(steps(wall.movement, wall.state, 240).x < 1);
  const hole = createMovement(
    {
      heightAt: (x, z) => (x >= 0.5 && x < 1 && z >= 0.5 && z < 1 ? 2 : 3),
      solids: [],
    },
    { ...HUMANOID_CAPABILITIES, radius: 0.8 }
  );
  assert.equal(hole.supported({ x: 0.75, z: 0.75, y: 3 }), false);
});
void test("low narrow obstacles are crossed using the same collision geometry", () => {
  for (const obstacle of [
    boxCollider(1.25, 3, 0.5, 0.5, 0.5, 4),
    boxCollider(1.25, 3, 0.5, 0.5, 1, 4),
  ]) {
    const { movement, state } = scenario(() => 3, [obstacle]);
    const end = steps(movement, state, 240);
    assert.ok(end.x > 2, `Stopped at ${String(end.x)}`);
    assert.equal(end.y, 3);
  }
});
void test("capability dimensions, walking speed and layered surfaces are individual", () => {
  const roof = boxCollider(1.5, 4.6, 0.5, 4, 0.4, 4);
  const tall = scenario(() => 3, [roof]);
  const short = scenario(() => 3, [roof], {
    ...HUMANOID_CAPABILITIES,
    height: 1.5,
    speed: 2,
  });
  assert.equal(tall.movement.supported(tall.state), false);
  assert.equal(short.movement.supported(short.state), true);
  assert.ok(Math.abs(steps(short.movement, short.state, 60).x - 1.5) < 1e-9);
  const layered = createMovement({
    heightAt: () => 3,
    solids: [boxCollider(0.5, 5, 0.5, 4, 1, 4)],
  });
  assert.deepEqual(
    layered.surfaces({ x: 0.5, z: 0.5 }).map((p) => p.y),
    [3, 6]
  );
  assert.equal(layered.supported({ x: 0.5, z: 0.5, y: 3.1 }), false);
  const corridor = [
    boxCollider(0, 3, -0.1, 8, 4, 0.2),
    boxCollider(0, 3, 1.1, 8, 4, 0.2),
  ];
  const small = scenario(() => 3, corridor, {
    ...HUMANOID_CAPABILITIES,
    radius: 0.3,
  });
  const wide = scenario(() => 3, corridor, {
    ...HUMANOID_CAPABILITIES,
    radius: 0.6,
  });
  assert.equal(small.movement.supported(small.state), true);
  assert.equal(wide.movement.supported(wide.state), false);
});
void test("finite world edges, invalid intent and invalid capability profiles", () => {
  const { movement, state } = scenario();
  const edge = steps(movement, { ...state, x: 47.5 }, 120);
  assert.ok(edge.x <= 47.7);
  assert.deepEqual(movement.step(state, { x: NaN, z: Infinity }), state);
  for (const changes of [
    { radius: 0 },
    { height: NaN },
    { speed: -1 },
    { recoverySeconds: Infinity },
    { elevationLimit: -1 },
  ]) {
    assert.throws(
      () => scenario(() => 3, [], { ...HUMANOID_CAPABILITIES, ...changes }),
      RangeError
    );
  }
  assert.equal(MOVEMENT_STEP, 1 / 120);
});
