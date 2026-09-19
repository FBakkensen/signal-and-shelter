// Tests execute the same throwaway model used by the playable study.
import { test } from "node:test";
import assert from "node:assert/strict";
import { NavigationStudy, PRESETS } from "../src/navigation-prototype-model.ts";
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
  study.request({ x: 2.25, z: 0.25 });
  study.request({ x: 90, z: 0.25 });
  assert.equal(study.destination?.x, 90);
  study.direct({ x: -1, z: 0 });
  assert.equal(study.destination, undefined);
});
await test("prototype pauses setup, flight and recovery exactly and resumes", () => {
  for (const phase of ["setup", "flight", "recovery"]) {
    const study = new NavigationStudy();
    study.request({ x: 2.25, z: 0.25 });
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
  study.request({ x: 2.25, z: 0.25 });
  until(study, "flight");
  study.direct({ x: 0, z: 1 });
  assert.equal(study.destination, undefined);
  study.tick(1 / 60);
  assert.ok(study.position.z > 0.25);
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
  study.request({ x: 2.25, z: 0.25 });
  for (let i = 0; i < 900; i++) {
    study.direct(undefined);
    study.tick(1 / 60);
  }
  assert.equal(study.destination, undefined);
  assert.ok(study.completedJumps > 0);
});
