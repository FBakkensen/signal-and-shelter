import test from "node:test";
import assert from "node:assert/strict";
import {
  MovementStudy,
  bodyConflict,
  flight,
  fullySupported,
  studyIsland,
  STUDY_STEP,
} from "../src/packages/play/movement-prototype.ts";
import { createSimulation } from "../src/packages/play/simulation.ts";
function advance(study: MovementStudy, count: number, keys: string[] = []) {
  for (let i = 0; i < count; i++) {
    study.step(new Set(keys));
    assert.equal(bodyConflict(study.player.state, study.robot.state), false);
  }
}
void test("study planning samples execute the production simulation exactly", () => {
  const study = new MovementStudy("protected", "crossing");
  const plan = flight(study.robot.state, { right: true }, true);
  const sim = createSimulation(studyIsland);
  let state = study.robot.state;
  for (let i = 0; i < plan.length; i++) {
    state = sim.advance(state, { right: true, jump: i === 0 }, STUDY_STEP);
    assert.deepEqual(state, plan[i]);
  }
  assert.ok(state.grounded);
  assert.ok(fullySupported(state));
});
void test("robot yields a competing preparation to the player; immediate crossing halts before overlap", () => {
  const protectedStudy = new MovementStudy("protected", "crossing");
  protectedStudy.jump("robot");
  protectedStudy.jump("player");
  assert.equal(protectedStudy.player.phase, "preparing");
  assert.equal(protectedStudy.robot.phase, "idle");
  assert.ok(
    protectedStudy.history.some((message) => message.includes("yielded"))
  );
  advance(protectedStudy, 150);
  assert.equal(protectedStudy.robot.phase, "idle");
  assert.equal(protectedStudy.fault, "");
  const immediate = new MovementStudy("immediate", "crossing");
  immediate.jump("robot");
  immediate.jump("player");
  advance(immediate, 150);
  assert.match(immediate.fault, /cannot complete/);
});
void test("protected corridor blocks entry, then stationary landing occupancy persists", () => {
  const study = new MovementStudy("protected", "landing");
  study.jump("robot");
  advance(study, 120, ["KeyW"]);
  assert.equal(study.fault, "");
  assert.ok(
    study.history.some((message) => message.includes("temporarily blocked"))
  );
  assert.ok(study.player.state.z >= 0.6 - 1e-7);
  assert.equal(study.robot.phase, "idle");
  const x = study.robot.state.x;
  const z = study.player.state.z;
  advance(study, 100);
  assert.equal(study.player.state.z, z);
  assert.equal(study.robot.state.x, x);
  advance(study, 60, ["KeyW"]);
  assert.ok(study.player.state.z >= 0.6 - 1e-7);
});
void test("immediate landing entry stops the unsafe flight without silently moving either actor", () => {
  const study = new MovementStudy("immediate", "landing");
  study.jump("robot");
  advance(study, 35, ["KeyW"]);
  advance(study, 100);
  assert.match(study.fault, /cannot complete/);
  const snapshot = JSON.stringify([study.player.state, study.robot.state]);
  advance(study, 50, ["KeyD"]);
  assert.equal(
    JSON.stringify([study.player.state, study.robot.state]),
    snapshot
  );
});
void test("protected steering declines a route into stationary occupancy", () => {
  const study = new MovementStudy("protected", "steering");
  study.jump("player");
  advance(study, 20);
  advance(study, 90, ["KeyW", "KeyD"]);
  assert.equal(study.fault, "");
  assert.ok(
    study.history.some((message) => message.includes("steering declined"))
  );
  assert.ok(study.player.state.grounded);
});
void test("pause preserves preparation and resumes exactly; input release stops walking", () => {
  const study = new MovementStudy("protected", "landing");
  study.jump("robot");
  advance(study, 4);
  study.paused = true;
  const before = JSON.stringify(study);
  advance(study, 20, ["KeyW"]);
  assert.equal(JSON.stringify(study), before);
  study.paused = false;
  advance(study, 10);
  assert.equal(study.robot.phase, "airborne");
  advance(study, 2, ["KeyW"]);
  const z = study.player.state.z;
  advance(study, 2);
  assert.equal(study.player.state.z, z);
});
void test("full body support rejects a single 500 mm ledge and accepts a broad shelf", () => {
  const state = {
    ...createSimulation(studyIsland).createState(),
    x: 0.25,
    z: 0.25,
    y: 4,
  };
  const narrow = {
    ...studyIsland,
    heightAt: (x: number) => (x >= 0 && x < 0.5 ? 4 : 3),
  };
  assert.equal(fullySupported(state, narrow), false);
  assert.equal(
    fullySupported(state, { ...studyIsland, heightAt: () => 4 }),
    true
  );
});

void test("a committed robot flight retains priority over a later player jump", () => {
  const study = new MovementStudy("protected", "crossing");
  study.jump("robot");
  advance(study, 18);
  study.jump("player");
  assert.equal(study.player.phase, "idle");
  assert.equal(study.robot.phase, "airborne");
  advance(study, 120);
  assert.equal(study.fault, "");
  assert.equal(study.robot.phase, "idle");
});
void test("walking into a prepared landing cancels robot takeoff without blocking the player", () => {
  const study = new MovementStudy("protected", "yielding");
  study.jump("robot");
  advance(study, 20, ["KeyW"]);
  assert.equal(study.robot.phase, "idle");
  assert.equal(study.robot.state.x, -1.4);
  assert.ok(study.player.state.z < 0.3);
  assert.ok(study.history.some((message) => message.includes("yielded")));
  assert.equal(study.fault, "");
});
void test("landing releases flight protection while the body continues to occupy its position", () => {
  const study = new MovementStudy("protected", "landing");
  study.jump("robot");
  for (let i = 0; i < 150 && study.robot.phase !== "recovery"; i++) {
    study.step();
  }
  assert.equal(study.robot.phase, "recovery");
  assert.deepEqual(study.robot.path, []);
  advance(study, 50, ["KeyW"]);
  assert.ok(study.player.state.z >= 0.6 - 1e-7);
});
