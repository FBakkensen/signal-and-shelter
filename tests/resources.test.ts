import test from "node:test";
import assert from "node:assert/strict";
import { Box3, Mesh, MeshStandardMaterial } from "three";
import { createResourceGroup } from "../src/resources.ts";
import { resourceParts } from "../src/packages/island/geometry.ts";
import { createIsland } from "../src/packages/island/index.ts";
import { createMovement } from "../src/packages/navigation/index.ts";

await test("actual resource render meshes match collision and retain bounds and individual colors", () => {
  const island = createIsland("resource-bounds");
  const obstacles = island.solids;
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
      createMovement(island).canOccupy({ ...resource, y: floor }),
      false
    );
    assert.equal(
      createMovement(island).canOccupy({ ...resource, y: floor + 2 }),
      true
    );
  }
});
