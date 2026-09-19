import { makeObstacles } from "../src/collision.ts";
import { DEFAULT_ISLAND } from "../src/world.ts";
import { createSolidMeshes } from "../src/solid-mesh.ts";
import { placeSolids } from "../src/solids.ts";
import { SHIP_PARTS } from "../src/ship.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Box3, Mesh, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

await test("Blender ship exports load through the actual Three.js loader at metre scale", async () => {
  const buffer = await readFile(
    new URL("../public/assets/ship.glb", import.meta.url),
  );
  const array = new Uint8Array(buffer).buffer;
  const asset = await new GLTFLoader().parseAsync(array, "");
  const solid = placeSolids(DEFAULT_ISLAND).find(
    (solid) => solid.kind === "ship",
  );
  assert.ok(solid);
  const placedShip = createSolidMeshes([solid], asset.scene).group;
  placedShip.updateMatrixWorld(true);
  const colliders = makeObstacles();
  let meshCount = 0;
  placedShip.traverse((object) => {
    if (object instanceof Mesh) {
      meshCount++;
      const box = new Box3().setFromObject(object);
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
  assert.equal(meshCount, SHIP_PARTS.length);
  assert.deepEqual(asset.scene.position.toArray(), [0, 0, 0]);
  const bounds = new Box3().setFromObject(asset.scene),
    size = bounds.getSize(new Vector3());
  assert.ok(Math.abs(size.y - 4.09) < 0.001);
  assert.ok(Math.abs(bounds.min.y) < 0.001);
  assert.ok(size.x > 8);
  assert.ok(size.z > 7);
  assert.ok(asset.scene.getObjectByName("Ship_Data_light"));
  const source = await readFile(
    new URL("../assets/ship.blend", import.meta.url),
  );
  assert.ok(source.length > 1000);
});
