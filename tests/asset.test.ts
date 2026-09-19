import { makeObstacles } from "../src/collision.ts";
import { LANDMARKS, heightAt } from "../src/world.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Box3, Mesh, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

await test("Blender beacon exports load through the actual Three.js loader at metre scale", async () => {
  const buffer = await readFile(
    new URL("../public/assets/beacon.glb", import.meta.url),
  );
  const array = new Uint8Array(buffer).buffer;
  const asset = await new GLTFLoader().parseAsync(array, "");
  const beacon = LANDMARKS.find((p) => p.id === "beacon");
  assert.ok(beacon);
  const colliders = makeObstacles();
  let meshCount = 0;
  asset.scene.traverse((object) => {
    if (object instanceof Mesh) {
      meshCount++;
      const box = new Box3().setFromObject(object);
      box.translate(
        new Vector3(beacon.x, heightAt(beacon.x, beacon.z), beacon.z),
      );
      assert.ok(
        colliders.some(
          (c) =>
            Math.abs(c.minX - box.min.x) < 0.001 &&
            Math.abs(c.maxX - box.max.x) < 0.001 &&
            Math.abs(c.minY - box.min.y) < 0.001 &&
            Math.abs(c.maxY - box.max.y) < 0.001 &&
            Math.abs(c.minZ - box.min.z) < 0.001 &&
            Math.abs(c.maxZ - box.max.z) < 0.001,
        ),
        `Collider must match ${object.name}`,
      );
    }
  });
  assert.equal(meshCount, 11);
  const bounds = new Box3().setFromObject(asset.scene),
    size = bounds.getSize(new Vector3());
  assert.ok(Math.abs(size.y - 4.075) < 0.001);
  assert.ok(Math.abs(bounds.min.y) < 0.001);
  assert.equal(size.x, 2);
  assert.equal(size.z, 2);
  assert.ok(asset.scene.getObjectByName("Beacon_light"));
  const source = await readFile(
    new URL("../assets/beacon.blend", import.meta.url),
  );
  assert.ok(source.length > 1000);
});
