import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createPicker } from "../src/picking.ts";

function fixture() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(90, 2, 0.1, 100);
  camera.position.z = 10;
  camera.updateMatrixWorld(true);
  const avatar = new THREE.Group();
  scene.add(avatar);
  const pick = createPicker(scene, camera, avatar);
  const viewport = { left: 120, top: 80, width: 800, height: 400 };
  return { scene, camera, avatar, pick, viewport };
}
function target(id: string, z = 0) {
  const group = new THREE.Group();
  group.name = `select:${id}`;
  group.position.z = z;
  const parts = new THREE.Group();
  parts.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)));
  group.add(parts);
  return group;
}

void test("picker finds selectable ship and resource ancestors using offset canvas coordinates", () => {
  const { scene, camera, pick, viewport } = fixture();
  const ship = target("ship");
  ship.position.set(-3, 2, 0);
  const resource = target("copper");
  resource.position.set(4, -2, 0);
  scene.add(ship, resource);
  scene.updateMatrixWorld(true);
  for (const object of [ship, resource]) {
    const screen = object.position.clone().project(camera);
    const x = viewport.left + ((screen.x + 1) * viewport.width) / 2;
    const y = viewport.top + ((1 - screen.y) * viewport.height) / 2;
    assert.equal(pick(x, y, viewport), object.name.slice(7));
  }
});

void test("picker ignores nested avatar meshes and chooses the nearest selectable hit", () => {
  const { scene, avatar, pick, viewport } = fixture();
  avatar.add(target("avatar-part", 8));
  scene.add(target("far-resource"), target("ship", 3));
  scene.updateMatrixWorld(true);
  assert.equal(pick(520, 280, viewport), "ship");
});

void test("foreground scenery blocks selection even when its material is faded", () => {
  const { scene, pick, viewport } = fixture();
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2, 1),
    new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.18 })
  );
  wall.position.z = 5;
  scene.add(target("ship"), wall);
  scene.updateMatrixWorld(true);
  assert.equal(pick(520, 280, viewport), null);
  wall.position.x = 5;
  scene.updateMatrixWorld(true);
  assert.equal(pick(520, 280, viewport), "ship");
});

void test("empty space, avatar-only hits and unselectable scenery return no selection", () => {
  const { scene, avatar, pick, viewport } = fixture();
  assert.equal(pick(520, 280, viewport), null);
  avatar.add(target("avatar-part", 5));
  scene.updateMatrixWorld(true);
  assert.equal(pick(520, 280, viewport), null);
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)));
  scene.updateMatrixWorld(true);
  assert.equal(pick(520, 280, viewport), null);
  assert.equal(pick(120, 80, viewport), null);
});

void test("picking cannot select a hidden portion of an otherwise known object", () => {
  const { scene, camera, avatar, viewport } = fixture();
  scene.add(target("ship"));
  scene.updateMatrixWorld(true);
  const pick = createPicker(scene, camera, avatar, (point) => point.x < 0);
  assert.equal(pick(518, 280, viewport), "ship");
  assert.equal(pick(522, 280, viewport), null);
});
