import test from "node:test";
import assert from "node:assert/strict";
import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { makeObstacles } from "../src/collision.ts";
import { createSolidMeshes } from "../src/solid-mesh.ts";
import { placeSolids } from "../src/solids.ts";
import { SHIP_PARTS } from "../src/ship.ts";
import { createIsland } from "../src/world.ts";

await test("placement owns terrain height and negative coordinates without modifying source parts", () => {
  const island = {
    ...createIsland(),
    heightAt: (x: number) => (x < 0 ? 7 : 3),
    ship: { x: -10, z: -20 },
    vents: [{ x: 2, z: -3, height: 2 }],
    resources: [],
  };
  const before = structuredClone(SHIP_PARTS);
  const solids = placeSolids(island);
  assert.equal(solids.length, 2);
  const ship = solids.find((solid) => solid.kind === "ship");
  const vent = solids.find((solid) => solid.kind === "vent");
  assert.ok(ship);
  assert.ok(vent);
  assert.deepEqual(ship.origin, [-10, 7, -20]);
  assert.deepEqual(vent.origin, [2, 3, -3]);
  const first = SHIP_PARTS[0];
  const placed = ship.parts[0];
  assert.ok(first);
  assert.ok(placed);
  assert.deepEqual(placed.position, [
    first.position[0] - 10,
    first.position[1] + 7,
    first.position[2] - 20,
  ]);
  assert.deepEqual(SHIP_PARTS, before);
  assert.deepEqual(placeSolids(island), solids);
});

await test("production mesh adapter matches every procedural solid collider across seeds", () => {
  for (const seed of ["starter-island", "next-home", "negative-geometry"]) {
    const island = createIsland(seed);
    const solids = placeSolids(island);
    const obstacles = makeObstacles(island);
    assert.equal(
      obstacles.length,
      solids.reduce((total, solid) => total + solid.parts.length, 0),
    );
    let offset = 0;
    for (const solid of solids) {
      if (solid.kind !== "ship") {
        const meshes = createSolidMeshes([solid], new Group());
        const { group } = meshes;
        group.updateMatrixWorld(true);
        assert.equal(group.children.length, solid.parts.length);
        for (const [index, child] of group.children.entries()) {
          assert.ok(child instanceof Mesh);
          const bounds = new Box3().setFromObject(child);
          const collider = obstacles[offset + index];
          assert.ok(collider);
          const actual = [
            bounds.min.x,
            bounds.max.x,
            bounds.min.y,
            bounds.max.y,
            bounds.min.z,
            bounds.max.z,
          ];
          const expected = [
            collider.minX,
            collider.maxX,
            collider.minY,
            collider.maxY,
            collider.minZ,
            collider.maxZ,
          ];
          for (const [axis, value] of actual.entries()) {
            const target = expected[axis];
            assert.ok(target !== undefined);
            assert.ok(
              Math.abs(value - target) < 1e-6,
              `${seed}: ${child.name}`,
            );
          }
        }
        meshes.dispose();
      }
      offset += solid.parts.length;
    }
  }
});

await test("mesh adapter shares procedural resources and disposes them without disposing the authored ship", () => {
  const shipAsset = new Group();
  const shipGeometry = new BoxGeometry();
  const shipMaterial = new MeshStandardMaterial();
  shipAsset.add(new Mesh(shipGeometry, shipMaterial));
  let shipDisposals = 0;
  shipGeometry.addEventListener("dispose", () => {
    shipDisposals++;
  });
  shipMaterial.addEventListener("dispose", () => {
    shipDisposals++;
  });
  const solids = placeSolids(createIsland());
  const meshes = createSolidMeshes(solids, shipAsset);
  const procedural = meshes.group.children.filter(
    (child) => child instanceof Mesh,
  );
  assert.ok(procedural.length > 1);
  const geometries = new Set(
    procedural.map((mesh) => {
      assert.ok(mesh.geometry instanceof BoxGeometry);
      return mesh.geometry;
    }),
  );
  const materials = new Set(
    procedural.map((mesh) => {
      assert.ok(mesh.material instanceof MeshStandardMaterial);
      return mesh.material;
    }),
  );
  assert.equal(geometries.size, 1);
  let disposals = 0;
  for (const geometry of geometries) {
    assert.ok(geometry instanceof BoxGeometry);
    geometry.addEventListener("dispose", () => {
      disposals++;
    });
  }
  for (const material of materials) {
    assert.ok(material instanceof MeshStandardMaterial);
    material.addEventListener("dispose", () => {
      disposals++;
    });
  }
  meshes.dispose();
  assert.equal(disposals, geometries.size + materials.size);
  assert.equal(shipDisposals, 0);
  assert.deepEqual(shipAsset.position.toArray(), [0, 0, 0]);
  const replacement = createSolidMeshes(solids, shipAsset);
  const clonedShip = replacement.group.children.find(
    (child) => child instanceof Group,
  );
  assert.ok(clonedShip);
  assert.equal(clonedShip.children.length, 1);
  replacement.dispose();
  assert.equal(shipDisposals, 0);
  shipGeometry.dispose();
  shipMaterial.dispose();
});
