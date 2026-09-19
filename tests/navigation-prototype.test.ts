// Tests execute the same throwaway model used by the playable study.
import { test } from "node:test";
import assert from "node:assert/strict";
import { NavigationStudy, PRESETS } from "../src/navigation-prototype-model.ts";
import {
  createSimulation,
  inputFromKeys,
  movementDirection,
  WALK_SPEED,
  JUMP_SPEED,
  GRAVITY,
  STEP,
} from "../src/packages/play/simulation.ts";
function run(study: NavigationStudy, seconds: number) {
  for (let i = 0; i < seconds * 60; i++) {
    study.tick(1 / 60);
  }
}
function until(study: NavigationStudy, phase: string) {
  for (let i = 0; i < 1800 && study.phase !== phase; i++) {
    study.tick(1 / 60);
  }
  assert.equal(study.phase, phase);
}
await test("prototype time costs choose a brisk jump and a weighty walking detour", () => {
  const results: number[] = [];
  for (const name of ["brisk", "weighty"]) {
    const study = new NavigationStudy("detour"),
      tuning = PRESETS[name];
    assert.ok(tuning);
    study.configure(tuning);
    study.request({ x: 3.25, z: 0.25 });
    run(study, 12);
    assert.equal(study.destination, undefined);
    assert.equal(study.position.x, 3.25);
    results.push(study.completedJumps);
  }
  assert.ok((results[0] ?? 0) > 0);
  assert.equal(results[1], 0);
});
await test("prototype reveals and recalculates toward unknown targets, retaining unreachable ones", () => {
  const study = new NavigationStudy("frontier");
  assert.equal(study.known({ x: 8.25, z: 0.25 }), false);
  study.request({ x: 8.25, z: 0.25 });
  for (const p of study.plan?.points ?? []) {
    assert.equal(study.known(p), true);
  }
  run(study, 15);
  assert.equal(study.destination, undefined);
  assert.ok(study.recalculations > 2);
  study.request({ x: 16.25, z: 0.25 });
  run(study, 10);
  assert.deepEqual(study.destination, { x: 16.25, z: 0.25 });
  assert.ok(study.position.x < 11);
  const stopped = { ...study.position };
  run(study, 2);
  assert.deepEqual(study.position, stopped);
});
await test("prototype latest click wins even when unreachable; direct input cancels it", () => {
  const study = new NavigationStudy();
  study.request({ x: 2.75, z: 0.25 });
  study.request({ x: 90, z: 0.25 });
  assert.equal(study.destination?.x, 90);
  study.direct({ x: -1, z: 0 });
  assert.equal(study.destination, undefined);
});
await test("prototype pauses setup, flight and recovery exactly and resumes", () => {
  for (const phase of ["setup", "flight", "recovery"]) {
    const study = new NavigationStudy();
    study.request({ x: 2.75, z: 0.25 });
    until(study, phase);
    const position = { ...study.position },
      elapsed = study.elapsed,
      destination = study.destination;
    study.pause();
    run(study, 2);
    assert.deepEqual(study.position, position);
    assert.equal(study.elapsed, elapsed);
    assert.equal(study.phase, phase);
    assert.equal(study.destination, destination);
    study.resume();
    run(study, 5);
    assert.ok(study.elapsed > elapsed);
  }
});
await test("prototype keyboard release cancels preparation and airborne takeover retains recovery", () => {
  const study = new NavigationStudy();
  study.direct({ x: 1, z: 0 });
  until(study, "setup");
  study.direct(undefined);
  const position = { ...study.position };
  run(study, 1);
  assert.deepEqual(study.position, position);
  assert.equal(study.phase, "idle");
  study.request({ x: 2.75, z: 0.25 });
  until(study, "flight");
  const unsteered = new NavigationStudy();
  unsteered.direct({ x: 1, z: 0 });
  until(unsteered, "setup");
  unsteered.direct(undefined);
  run(unsteered, 1);
  unsteered.request({ x: 2.75, z: 0.25 });
  until(unsteered, "flight");
  study.direct({ x: 0, z: 1 });
  assert.equal(study.destination, undefined);
  study.tick(1 / 60);
  unsteered.tick(1 / 60);
  assert.ok(study.position.z > unsteered.position.z);
  until(study, "recovery");
  assert.ok(study.completedJumps > 0);
});
await test("prototype background and terminal keep running while terminal blocks gameplay input", () => {
  const study = new NavigationStudy();
  study.request({ x: -5.25, z: 0.25 });
  study.openTerminal();
  assert.equal(study.terminal, true);
  study.direct({ x: -1, z: 0 });
  study.request({ x: 90, z: 90 });
  study.blur();
  assert.deepEqual(study.destination, { x: -5.25, z: 0.25 });
  run(study, 2);
  assert.equal(study.position.x, -5.25);
  assert.equal(study.destination, undefined);
  assert.equal(study.paused, false);
  study.closeTerminal();
  assert.equal(study.terminal, false);
  const reset = new NavigationStudy();
  assert.equal(reset.destination, undefined);
  assert.equal(reset.completedJumps, 0);
});
await test("prototype traversal respects production body clearance and bounded drops", () => {
  const study = new NavigationStudy("clearance");
  study.request({ x: 5.25, z: 0.25 });
  for (let i = 0; i < 600; i++) {
    study.tick(1 / 60);
    assert.equal(
      study.simulation.canStandAt(study.position, study.position.y),
      true
    );
  }
  assert.equal(study.destination, undefined);
  assert.equal(study.completedJumps, 0);
  const terraces = new NavigationStudy();
  terraces.configure({ setup: 0.1, recovery: 0.1, climb: 0.5, drop: 0.5 });
  terraces.request({ x: 8.25, z: 0.25 });
  run(terraces, 15);
  assert.equal(terraces.destination, undefined);
});

await test("empty keyboard polling does not cancel a routed jump setup", () => {
  const study = new NavigationStudy();
  study.request({ x: 2.75, z: 0.25 });
  for (let i = 0; i < 900; i++) {
    study.direct(undefined);
    study.tick(1 / 60);
  }
  assert.equal(study.destination, undefined);
  assert.ok(study.completedJumps > 0);
});

await test("landings have support beneath the whole humanoid, not beside it", () => {
  const study = new NavigationStudy("terraces");
  for (const p of study.nodes.values()) {
    for (const dx of [-0.29, 0.29]) {
      for (const dz of [-0.29, 0.29]) {
        assert.equal(
          study.island.heightAt(p.x + dx, p.z + dz),
          p.y,
          `unsupported landing at ${String(p.x)}, ${String(p.z)}`
        );
      }
    }
  }
});
await test("diagonal keyboard movement follows both axes at normal walking speed", () => {
  const study = new NavigationStudy();
  const start = { ...study.position };
  study.direct({ x: 1, z: 1 });
  run(study, 0.5);
  const dx = study.position.x - start.x,
    dz = study.position.z - start.z;
  assert.ok(
    dx > 1 && dz > 1,
    `diagonal displacement ${String(dx)}, ${String(dz)}`
  );
  assert.ok(Math.abs(dx - dz) < 0.001);
  assert.ok(Math.abs(Math.hypot(dx, dz) - 4.3 * 0.5) < 0.05);
});
await test("a diagonal clicked destination does not start with an axis-only detour", () => {
  const study = new NavigationStudy();
  const start = { ...study.position };
  study.request({ x: start.x + 2, z: start.z + 2 });
  study.tick(1 / 60);
  assert.ok(study.position.x > start.x && study.position.z > start.z);
});

await test("open-ground routes follow arbitrary diagonals without staircase turns", () => {
  const study = new NavigationStudy();
  const start = { ...study.position };
  study.request({ x: start.x + 2, z: start.z + 1 });
  study.tick(0.1);
  const dx = study.position.x - start.x,
    dz = study.position.z - start.z;
  assert.ok(Math.abs(dx / dz - 2) < 0.01);
});
await test("manual turns and release do not finish an old grid stride", () => {
  const study = new NavigationStudy();
  study.direct({ x: 1, z: 0 });
  study.tick(0.05);
  const atTurn = { ...study.position };
  study.direct({ x: 0, z: 1 });
  study.tick(0.05);
  assert.equal(study.position.x, atTurn.x);
  assert.ok(study.position.z > atTurn.z);
  study.direct(undefined);
  const stopped = { ...study.position };
  study.tick(0.2);
  assert.deepEqual(study.position, stopped);
});
await test("jump setup and recovery stay on supported sides of the actual terrace", () => {
  const study = new NavigationStudy();
  study.direct({ x: 1, z: 0 });
  until(study, "setup");
  assert.ok(study.position.x < -2.3 && study.position.x > -2.8);
  until(study, "recovery");
  assert.ok(study.position.x > -1.7);
  assert.equal(study.position.y, 2.5);
  for (const dx of [-0.299, 0.299]) {
    assert.equal(
      study.island.heightAt(study.position.x + dx, study.position.z),
      2.5
    );
  }
});

await test("prototype keyboard locomotion matches the game simulation at every diagonal and camera heading", () => {
  for (const yaw of [0, 0.7, Math.PI / 2]) {
    for (const codes of [
      ["KeyW", "KeyD"],
      ["KeyW", "KeyA"],
      ["KeyS", "KeyD"],
      ["KeyS", "KeyA"],
    ]) {
      const study = new NavigationStudy();
      const simulation = createSimulation(study.island);
      let game = { ...simulation.createState(), paused: false, yaw };
      const input = inputFromKeys(new Set(codes));
      study.direct(movementDirection(input, yaw));
      for (let i = 0; i < 30; i++) {
        game = simulation.advance(game, input, 1 / 60);
        study.tick(1 / 60);
        assert.ok(
          Math.hypot(
            study.position.x - game.x,
            study.position.y - game.y,
            study.position.z - game.z
          ) < 1e-10
        );
      }
    }
  }
});
await test("world-space intent is bounded, supports slow movement, and rejects invalid values", () => {
  const study = new NavigationStudy();
  const simulation = createSimulation(study.island);
  const state = { ...simulation.createState(), paused: false };
  for (const direction of [
    { x: 20, z: 20 },
    { x: 0.2, z: 0 },
    { x: NaN, z: 1 },
    { x: 1, z: Infinity },
  ]) {
    const next = simulation.advance(state, { direction }, 0.1);
    const moved = Math.hypot(next.x - state.x, next.z - state.z);
    assert.ok(moved <= WALK_SPEED * 0.1 + 1e-10);
    if (!Number.isFinite(direction.x) || !Number.isFinite(direction.z)) {
      assert.equal(moved, 0);
    }
    if (direction.x === 0.2) {
      assert.ok(Math.abs(moved - WALK_SPEED * 0.02) < 1e-10);
    }
  }
});
await test("automatic jump follows game gravity and lands without teleporting", () => {
  const study = new NavigationStudy();
  study.direct({ x: 1, z: 0 });
  until(study, "setup");
  let previous = { ...study.position },
    airborne = false;
  for (let i = 0; i < 300 && study.phase !== "recovery"; i++) {
    study.tick(STEP);
    assert.ok(
      Math.hypot(
        study.position.x - previous.x,
        study.position.z - previous.z
      ) <=
        WALK_SPEED * STEP + 1e-8
    );
    assert.ok(study.simulation.canStandAt(study.position, study.position.y));
    if (study.position.y > previous.y && !airborne) {
      assert.ok(
        Math.abs(
          study.position.y -
            previous.y -
            (JUMP_SPEED * STEP - (GRAVITY * STEP * STEP) / 2)
        ) < 1e-8
      );
      airborne = true;
    }
    previous = { ...study.position };
  }
  assert.ok(airborne);
  assert.equal(study.phase, "recovery");
  assert.equal(study.position.y, 2.5);
});
