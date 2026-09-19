import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cameraFrame,
  CameraStudy,
  readVariant,
  scrollZoom,
} from "../src/camera-prototype-model.ts";
import { createIsland } from "../src/packages/island/index.ts";
import type { Island } from "../src/packages/island/index.ts";

const anchor = { x: 0, y: 5.62, z: 0 };
const flat = () => 4;
const island: Island = {
  ...createIsland("camera-study"),
  heightAt: flat,
  solids: [],
  spawn: { x: 0, z: 0 },
  terminal: { x: 0, z: 0 },
};

void test("scroll accepts pixels, lines and pages, clamps both ends, and ignores nonfinite input", () => {
  assert.equal(scrollZoom(0.5, 1, 1), scrollZoom(0.5, 16));
  assert.equal(scrollZoom(0.5, 1, 2), scrollZoom(0.5, 600));
  assert.equal(scrollZoom(0.5, 100000), 1);
  assert.equal(scrollZoom(0.5, -100000), 0);
  assert.equal(scrollZoom(0.5, NaN), 0.5);
  assert.equal(readVariant("B"), "B");
  assert.equal(readVariant("invalid"), "A");
});
void test("raised and shoulder framing differ nearby and converge overhead continuously", () => {
  const a = cameraFrame("A", 0, 0, 0, anchor);
  const b = cameraFrame("B", 0, 0, 0, anchor);
  assert.ok(a.position.y > b.position.y + 1);
  assert.equal(a.target.x, 0);
  assert.equal(b.target.x, 0.65);
  assert.equal(a.requestedDistance, 3.5);
  const farA = cameraFrame("A", 1, 0, 0, anchor);
  const farB = cameraFrame("B", 1, 0, 0, anchor);
  assert.deepEqual(farA, farB);
  assert.equal(farA.distance, 70);
  const nearFar = cameraFrame("B", 0.9999, 0, 0, anchor);
  assert.ok(
    Math.hypot(
      farB.position.y - nearFar.position.y,
      farB.position.z - nearFar.position.z
    ) < 0.05
  );
});
void test("orbit rotates the boom and shoulder offset around the same player anchor", () => {
  const frame = cameraFrame("B", 0, Math.PI / 2, 1, anchor);
  assert.ok(frame.position.x > 3);
  assert.ok(Math.abs(frame.position.z + 0.65) < 0.00001);
  assert.equal(frame.facing, 1);
});
void test("terrain and objects never change camera distance, framing or FOV", () => {
  const wall = { minX: -2, maxX: 2, minY: 0, maxY: 20, minZ: 2, maxZ: 2.5 };
  for (const variant of ["A", "B"] as const) {
    const clear = new CameraStudy(island, variant);
    const blocked = new CameraStudy(
      { ...island, solids: [wall], heightAt: (_x, z) => (z >= 2 ? 20 : 4) },
      variant
    );
    for (const zoom of [0, 0.35, 1]) {
      clear.zoom = zoom;
      blocked.zoom = zoom;
      assert.deepEqual(blocked.frame(), clear.frame());
      assert.equal(blocked.frame().distance, blocked.frame().requestedDistance);
      assert.equal(blocked.frame().fov, 55);
      blocked.key("KeyQ", true);
      clear.key("KeyQ", true);
      for (let i = 0; i < 10; i++) {
        blocked.tick(0.1);
        clear.tick(0.1);
      }
      blocked.key("KeyQ", false);
      clear.key("KeyQ", false);
      assert.deepEqual(blocked.frame(), clear.frame());
      assert.equal(blocked.zoom, zoom);
    }
  }
});
void test("actual controller moves screen-relative, faces travel, clears held input on pause and retains play through zoom/switch", () => {
  const study = new CameraStudy(island, "A");
  study.key("KeyD", true);
  study.tick(0.1);
  study.key("KeyD", false);
  assert.ok(study.app.state.x > 0.4);
  assert.ok(Math.abs(study.app.state.z) < 0.001);
  assert.ok(Math.abs(study.facing + Math.PI / 2) < 0.001);
  study.key("KeyQ", true);
  for (let i = 0; i < 5; i++) {
    study.tick(0.1);
  }
  study.key("KeyQ", false);
  const before = study.app.state;
  study.key("KeyW", true);
  study.tick(0.1);
  const moved = study.app.state;
  assert.ok(moved.x < before.x && moved.z < before.z);
  const location = { x: moved.x, z: moved.z };
  study.switchVariant();
  study.scroll(100000);
  assert.equal(study.variant, "B");
  assert.equal(study.zoom, 1);
  assert.deepEqual({ x: study.app.state.x, z: study.app.state.z }, location);
  assert.equal(study.app.state.paused, false);
  study.app.pause();
  study.tick(0.1);
  study.app.resume();
  study.tick(0.1);
  assert.deepEqual({ x: study.app.state.x, z: study.app.state.z }, location);
});
void test("terminal interaction works at both zoom limits and stays paused behind its panel", () => {
  for (const zoom of [0, 1]) {
    const study = new CameraStudy(island, "B");
    study.zoom = zoom;
    assert.equal(study.app.canUseTerminal, true);
    assert.equal(study.app.openTerminal(), true);
    study.app.checkLink();
    assert.equal(study.app.state.linkChecked, true);
    study.app.resume("canvas");
    study.key("Space", true);
    study.tick(0.1);
    assert.equal(study.app.state.paused, true);
    assert.equal(study.app.state.y, 4);
    study.app.resume("terminal");
    study.restart();
    assert.equal(study.app.state.linkChecked, false);
    assert.equal(study.zoom, zoom);
  }
  const distant = new CameraStudy(
    { ...island, terminal: { x: 50, z: 50 } },
    "B"
  );
  distant.zoom = 1;
  assert.equal(distant.app.openTerminal(), false);
});

void test("narrow shoulder framing keeps the avatar footprint inside the camera width", () => {
  const aspect = 390 / 844;
  const frame = cameraFrame("B", 0, 0, 0, anchor, aspect);
  const halfWidth =
    frame.distance * Math.tan((frame.fov * Math.PI) / 360) * aspect;
  assert.ok(frame.target.x + 0.3 < halfWidth);
  const study = new CameraStudy(island, "B");
  study.zoom = 0;
  assert.deepEqual(study.frame(aspect).position, frame.position);
});
