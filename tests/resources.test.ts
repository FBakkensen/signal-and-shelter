import test from "node:test";
import assert from "node:assert/strict";
import { Box3, Mesh, MeshStandardMaterial } from "three";
import { createResourceGroup, resourceParts } from "../src/resources.ts";
import { createIsland } from "../src/world.ts";
import { fits, makeObstacles, STANDING_HEIGHT } from "../src/collision.ts";

await test("actual resource render meshes match collision and retain bounds and individual colors", () => {
  const island = createIsland("resource-bounds");
  const obstacles = makeObstacles(island);
  for (const resource of island.resources) {
    const parts = resourceParts(resource);
    assert.equal(parts.length, 4);
    assert.ok(parts.slice(1).every((part) => part.color === resource.color));
    const group = createResourceGroup(resource);
    const floor = island.heightAt(resource.x, resource.z);
    group.position.set(resource.x, floor, resource.z);
    group.updateMatrixWorld(true);
    assert.equal(group.children.length, 4);
    const bounds = new Box3().setFromObject(group);
    assert.ok(Math.abs(bounds.min.y - floor) < 1e-6);
    assert.ok(Math.abs(bounds.max.y - floor - 1.7) < 1e-6);
    assert.ok(Math.abs(bounds.max.x - bounds.min.x - 1.8) < 1e-6);
    for (const child of group.children) {
      assert.ok(child instanceof Mesh);
      const box = new Box3().setFromObject(child);
      assert.ok(
        obstacles.some(
          (o) =>
            Math.abs(o.minX - box.min.x) < 1e-6 &&
            Math.abs(o.maxX - box.max.x) < 1e-6 &&
            Math.abs(o.minY - box.min.y) < 1e-6 &&
            Math.abs(o.maxY - box.max.y) < 1e-6 &&
            Math.abs(o.minZ - box.min.z) < 1e-6 &&
            Math.abs(o.maxZ - box.max.z) < 1e-6
        ),
        child.name
      );
      assert.ok(child.material instanceof MeshStandardMaterial);
      if (child.name.startsWith("Crystal")) {
        assert.equal(`#${child.material.color.getHexString()}`, resource.color);
      }
    }
    assert.equal(
      fits(resource, floor, STANDING_HEIGHT, island.heightAt, obstacles),
      false
    );
    assert.equal(
      fits(resource, floor + 2, STANDING_HEIGHT, island.heightAt, obstacles),
      true
    );
  }
});
