import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  createOcclusionStudy,
  occlusionVariant,
} from "../src/occlusion-prototype-model.ts";

void test("occlusion treatments preserve camera, restore shared materials and detect inside obstacles", () => {
  const scene = new THREE.Scene();
  const avatar = new THREE.Group();
  avatar.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.5, 0.5)));
  scene.add(avatar);
  const material = new THREE.MeshBasicMaterial();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 2), material);
  wall.position.set(0, 0.7, 3);
  scene.add(wall);
  const camera = new THREE.PerspectiveCamera(55);
  camera.position.set(0, 0.7, 6);
  const study = createOcclusionStudy(scene, avatar);
  assert.equal(study.apply(camera, "A"), 1);
  const ghost = scene.children.find((o) => o !== avatar && o !== wall);
  assert.equal(ghost?.visible, true);
  assert.equal(study.apply(camera, "B"), 1);
  assert.notEqual(wall.material, material);
  assert.equal(material.opacity, 1);
  assert.deepEqual(camera.position.toArray(), [0, 0.7, 6]);
  assert.equal(camera.fov, 55);
  study.restore();
  assert.equal(wall.material, material);
  assert.equal(study.apply(camera, "C"), 1);
  assert.equal(ghost.visible, false);
  camera.position.z = 3;
  assert.equal(study.apply(camera, "B"), 1);
  study.restore();
  wall.position.x = 10;
  assert.equal(study.apply(camera, "B"), 0);
  assert.equal(wall.material, material);
  assert.equal(study.apply(camera, "A"), 0);
  assert.equal(ghost.visible, false);
  study.dispose();
  assert.equal(scene.children.length, 2);
  assert.equal(occlusionVariant("C"), "C");
  assert.equal(occlusionVariant("invalid"), "A");
});
