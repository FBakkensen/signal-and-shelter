import { test } from "node:test";
import assert from "node:assert/strict";
import { ThirdPersonCamera } from "../src/camera.ts";
import * as THREE from "three";
import { createOcclusion, FadeEnvelope } from "../src/occlusion.ts";
import { GameApplication } from "../src/packages/play/index.ts";
import { createIsland } from "../src/packages/island/index.ts";

void test("camera scroll clamps, ignores invalid input and framing has no scenery dependency", () => {
  const camera = new ThirdPersonCamera();
  const anchor = { x: 1, y: 5, z: 3 };
  for (const zoom of [0, 0.35, 1]) {
    camera.zoom = zoom;
    const frame = camera.frame(anchor, 0.4, 0.7, 1);
    assert.ok(
      Math.abs(
        Math.hypot(
          frame.position.x - frame.target.x,
          frame.position.y - frame.target.y,
          frame.position.z - frame.target.z
        ) -
          3.5 * 20 ** zoom
      ) < 1e-8
    );
    assert.equal(frame.fov, 55);
    assert.equal(frame.facing, 0.7);
  }
  camera.scroll(-1e6);
  assert.equal(camera.zoom, 0);
  camera.scroll(1, 2);
  assert.equal(camera.zoom, 0.42);
  camera.scroll(NaN);
  assert.equal(camera.zoom, 0.42);
  camera.scroll(1e6, 1);
  assert.equal(camera.zoom, 1);
});
void test("third-person selection, input lifecycle and reset preserve camera heading", () => {
  const island = createIsland("map-check");
  const app = new GameApplication(island, true);
  assert.equal(app.start(island, false).kind, "keyboard");
  app.press("KeyQ");
  app.tick(0.05);
  app.release("KeyQ");
  const heading = app.state.yaw;
  assert.notEqual(heading, 0);
  app.press("ArrowUp");
  app.tick(0.05);
  assert.equal(app.state.pitch, 0);
  app.select(island.resources[0]?.id ?? "invalid");
  assert.equal(app.useSelection(), false);
  assert.equal(app.terminalOpen, false);
  app.select("ship");
  assert.equal(app.useSelection(), true);
  assert.equal(app.resume("canvas").kind, "ignored");
  app.resume("terminal");
  app.press("KeyW");
  app.pause();
  const position = app.state.z;
  app.resume();
  app.tick(0.05);
  assert.equal(app.state.z, position);
  app.restart();
  assert.equal(app.selection, null);
  assert.ok(Math.abs(app.state.yaw - heading) < 1e-10);
  app.chooseSeed();
  app.start(createIsland("next"), false);
  assert.ok(Math.abs(app.state.yaw - heading) < 1e-10);
  app.press("Home");
  assert.equal(app.state.yaw, 0);
  app.press("KeyD");
  app.tick(0.05);
  app.release("KeyD");
  assert.notEqual(app.facing, 0);
});
void test("localized fade eases in, holds briefly and fully restores", () => {
  const fade = new FadeEnvelope();
  assert.equal(fade.update(true, NaN), 0);
  assert.ok(fade.update(true, 0.05) > 0);
  for (let i = 0; i < 5; i++) {
    fade.update(true, 0.05);
  }
  assert.equal(fade.strength, 1);
  fade.update(false, 0.05);
  assert.equal(fade.strength, 1);
  for (let i = 0; i < 12; i++) {
    fade.update(false, 0.05);
  }
  assert.equal(fade.strength, 0);
  assert.equal(fade.update(false, -1), 0);
});

void test("production obstruction detects inside geometry and restores shared materials", () => {
  const scene = new THREE.Scene();
  const avatar = new THREE.Group();
  avatar.add(new THREE.Mesh(new THREE.BoxGeometry()));
  scene.add(avatar);
  const material = new THREE.MeshStandardMaterial();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 2), material);
  wall.position.set(0, 0.8, 3);
  scene.add(wall);
  const camera = new THREE.PerspectiveCamera(55);
  camera.position.set(0, 0.8, 6);
  const visibility = createOcclusion(scene, avatar);
  assert.notEqual(wall.material, material);
  assert.equal(material.side, THREE.FrontSide);
  assert.equal(visibility.update(camera, 0.05, true).blocked, true);
  camera.position.z = 3;
  assert.equal(visibility.update(camera, 0.05, true).blocked, true);
  assert.deepEqual(camera.position.toArray(), [0, 0.8, 3]);
  assert.equal(camera.fov, 55);
  wall.position.x = 10;
  assert.equal(visibility.update(camera, 0.05, true).blocked, false);
  assert.equal(visibility.update(camera, 0.05, false).strength, 0);
  visibility.dispose();
  assert.equal(wall.material, material);
});
void test("orbit aliases remain held independently and pause clears both", () => {
  const island = createIsland("map-check");
  const app = new GameApplication(island, true);
  app.start(island, true);
  app.press("KeyE");
  app.press("ArrowRight");
  app.release("KeyE");
  app.tick(0.05);
  assert.notEqual(app.state.yaw, 0);
  app.release("ArrowRight");
  const angle = app.state.yaw;
  app.tick(0.05);
  assert.ok(Math.abs(app.state.yaw - angle) < 1e-10);
  app.press("KeyQ");
  app.pause();
  app.resume();
  app.tick(0.05);
  assert.ok(Math.abs(app.state.yaw - angle) < 1e-10);
});

void test("avatar ground and camera eye share interpolation through fractional frames and lifecycle changes", () => {
  const island = createIsland("map-check");
  const app = new GameApplication(island, true);
  app.start(island, true);
  const start = app.renderPose.ground;
  app.press("KeyD");
  app.press("Space");
  app.tick(1.5 / 120);
  const halfway = app.renderPose;
  assert.ok(Math.abs(halfway.ground.x - (start.x + app.state.x) / 2) < 1e-9);
  assert.ok(Math.abs(halfway.ground.y - (start.y + app.state.y) / 2) < 1e-9);
  assert.notEqual(halfway.ground.x, app.state.x);
  assert.deepEqual(halfway.eye, app.viewPosition);
  assert.equal(halfway.eye.x, halfway.ground.x);
  assert.equal(halfway.eye.z, halfway.ground.z);
  assert.ok(Math.abs(halfway.eye.y - halfway.ground.y - 1.62) < 1e-9);
  app.tick(0.25 / 120);
  assert.ok(app.renderPose.ground.x > halfway.ground.x);
  app.pause();
  assert.deepEqual(app.renderPose.ground, {
    x: app.state.x,
    y: app.state.y,
    z: app.state.z,
  });
  app.resume();
  assert.deepEqual(app.renderPose.ground, {
    x: app.state.x,
    y: app.state.y,
    z: app.state.z,
  });
  app.restart();
  assert.deepEqual(app.renderPose.ground, start);
  app.press("ShiftLeft");
  app.tick(1.5 / 120);
  const crouched = app.renderPose;
  assert.equal(app.state.crouching, true);
  assert.ok(Math.abs(crouched.eye.y - crouched.ground.y - 1.27) < 1e-9);
});
