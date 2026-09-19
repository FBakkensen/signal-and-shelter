import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  ExplorationMask,
  createExplorationFog,
} from "../src/exploration-fog.ts";
import { GameApplication } from "../src/packages/play/index.ts";
import {
  EXPLORATION_WIDTH,
  EXPLORATION_ORIGIN,
  EXPLORATION_CELL_SIZE,
  exploredAt,
} from "../src/packages/play/exploration.ts";
import { createIsland } from "../src/packages/island/index.ts";
import { createOcclusion } from "../src/occlusion.ts";

await test("GPU fog mask exactly matches shared CPU coverage and resets old explored pixels", () => {
  const app = new GameApplication(createIsland("fog-mask"), true),
    mask = new ExplorationMask();
  mask.update(app.exploration);
  for (let z = 0; z < EXPLORATION_WIDTH; z++) {
    for (let x = 0; x < EXPLORATION_WIDTH; x++) {
      assert.equal(
        mask.pixels[z * EXPLORATION_WIDTH + x] === 255,
        exploredAt(
          app.exploration,
          EXPLORATION_ORIGIN + (x + 0.5) * EXPLORATION_CELL_SIZE,
          EXPLORATION_ORIGIN + (z + 0.5) * EXPLORATION_CELL_SIZE
        )
      );
    }
  }
  const version = mask.texture.version;
  mask.update(app.exploration);
  assert.equal(mask.texture.version, version);
  const initial = [...mask.pixels];
  app.start({ ...app.island, spawn: { x: 20, z: 20 } }, true);
  mask.update(app.exploration);
  assert.notDeepEqual([...mask.pixels], initial);
  app.start(createIsland("fog-mask"), true);
  mask.update(app.exploration);
  assert.deepEqual([...mask.pixels], initial);
  assert.equal(mask.texture.minFilter, THREE.NearestFilter);
  mask.dispose();
});
await test("fog composes with obstruction materials, masks shadows, preserves sky/avatar and restores shared assets", () => {
  const scene = new THREE.Scene(),
    avatar = new THREE.Group(),
    sky = new THREE.Group();
  const material = new THREE.MeshStandardMaterial();
  const object = new THREE.Mesh(new THREE.BoxGeometry(), material),
    person = new THREE.Mesh(new THREE.BoxGeometry(), material),
    sun = new THREE.Mesh(new THREE.BoxGeometry(), material);
  avatar.add(person);
  sky.add(sun);
  scene.add(object, avatar, sky);
  const occlusion = createOcclusion(scene, avatar);
  const occluded = object.material,
    skyMaterial = sun.material;
  const fog = createExplorationFog(scene, [avatar, sky]);
  assert.notEqual(object.material, occluded);
  assert.equal(person.material, material);
  assert.equal(sun.material, skyMaterial);
  assert.ok(
    object.material.customProgramCacheKey().includes("localized-occlusion-v1")
  );
  assert.ok(object.customDepthMaterial);
  assert.ok(object.customDistanceMaterial);
  fog.dispose();
  assert.equal(object.material, occluded);
  assert.equal(object.customDepthMaterial, undefined);
  assert.equal(object.customDistanceMaterial, undefined);
  occlusion.dispose();
  assert.equal(object.material, material);
});
