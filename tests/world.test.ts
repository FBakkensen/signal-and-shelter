import { Vector3 } from "three";
import {
  terrainQuads,
  HAZE_LEVEL,
  SIZE,
} from "../src/packages/island/geometry.ts";
import type { Quad } from "../src/packages/island/geometry.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {
  createIsland,
  chooseSeed,
  normalizeSeed,
  DEFAULT_ISLAND,
  DEFAULT_SEED,
} from "../src/packages/island/index.ts";
import { createSimulation } from "../src/packages/play/simulation.ts";

function snapshot(seed: string) {
  const world = createIsland(seed);
  return {
    seed: world.seed,
    version: world.version,
    heights: Array.from({ length: SIZE * SIZE }, (_, i) =>
      world.heightAt((i % SIZE) - SIZE / 2, Math.floor(i / SIZE) - SIZE / 2)
    ),
    ship: world.ship,
    terminal: world.terminal,
    spawn: world.spawn,
    resources: world.resources,
    vents: world.vents,
    state: createSimulation(world).createState(),
    obstacles: world.solids,
  };
}
await test("seeds reproduce the full starting world and different seeds vary terrain and placements", () => {
  for (const seed of [
    "731",
    "signal-and-shelter",
    "ø-hop 🌱",
    "0",
    "x".repeat(80),
  ]) {
    assert.deepEqual(snapshot(seed), snapshot(seed));
  }
  const a = snapshot("one"),
    b = snapshot("two");
  assert.notDeepEqual(a.heights, b.heights);
  assert.notDeepEqual(a.resources, b.resources);
  assert.notDeepEqual(a.ship, b.ship);
  assert.notDeepEqual(a.vents, b.vents);
});
await test("seed text is normalized, bounded, case-sensitive and blank input chooses a reusable seed", () => {
  assert.equal(DEFAULT_SEED, "signal-and-shelter");
  assert.equal(normalizeSeed("  robot  "), "robot");
  assert.equal(normalizeSeed("a".repeat(79) + "🌱"), "a".repeat(79) + "\uFFFD");
  assert.equal(normalizeSeed("a".repeat(81)), "a".repeat(80));
  assert.equal(
    chooseSeed("  ", () => "new-island"),
    "new-island"
  );
  assert.equal(
    chooseSeed("0", () => {
      throw new Error("Must not generate");
    }),
    "0"
  );
  assert.equal(
    chooseSeed("", () => "  "),
    DEFAULT_SEED
  );
  assert.deepEqual(snapshot(" seed "), snapshot("seed"));
  assert.notDeepEqual(snapshot("Seed").heights, snapshot("seed").heights);
  assert.equal(createIsland("").seed, DEFAULT_SEED);
});
await test("terrain is finite, grid-based and bounded; hash varies with seed", () => {
  const { heightAt } = DEFAULT_ISLAND;
  for (let x = -50; x < 50; x++) {
    for (let z = -50; z < 50; z++) {
      assert.ok(
        DEFAULT_ISLAND.hash(x, z) >= 0 && DEFAULT_ISLAND.hash(x, z) < 1
      );
      assert.ok(Number.isInteger(heightAt(x, z) / 0.5));
      assert.ok(heightAt(x, z) >= 0 && heightAt(x, z) <= 6);
    }
  }
  assert.notEqual(
    createIsland("731").hash(2, 3),
    createIsland("732").hash(2, 3)
  );
  assert.equal(heightAt(-SIZE, 0), 0);
  assert.equal(heightAt(SIZE, 0), 0);
  assert.equal(heightAt(NaN, 0), 0);
  assert.equal(heightAt(0.1, 0.4), heightAt(0.4, 0.1));
});
await test("200 seeded starts have a clear dry spawn, level ship site, and dry deposits", () => {
  for (let i = 0; i < 200; i++) {
    const world = createIsland(String(i));
    assert.ok(
      createSimulation(world).canStandAt(
        world.spawn,
        world.heightAt(world.spawn.x, world.spawn.z)
      ),
      world.seed
    );
    for (const p of world.resources) {
      assert.ok(world.heightAt(p.x, p.z) > HAZE_LEVEL);
    }
    for (let dx = -6; dx <= 5; dx++) {
      for (let dz = -4; dz <= 4; dz++) {
        assert.equal(world.heightAt(world.ship.x + dx, world.ship.z + dz), 4);
      }
    }
    for (const vent of world.vents) {
      assert.ok(world.heightAt(vent.x, vent.z) >= 3);
      assert.ok(Math.hypot(vent.x - world.ship.x, vent.z - world.ship.z) >= 9);
      assert.ok(vent.height >= 2 && vent.height <= 3.5);
      assert.ok(
        world.resources.every(
          (p) => Math.hypot(vent.x - p.x, vent.z - p.z) >= 4.5
        )
      );
    }
  }
});
await test("regions distinguish haze edge, vent fields and ceramic shelf", () => {
  assert.equal(DEFAULT_ISLAND.biomeAt(47, 47), "haze");
  assert.equal(DEFAULT_ISLAND.biomeAt(20, -12), "vents");
  assert.equal(DEFAULT_ISLAND.biomeAt(0, 0), "crust");
});
await test("meshing omits empty and internal faces", () => {
  assert.equal(terrainQuads(() => 0, 0, 0, 2).length, 0);
  const one = (x: number, z: number) => (x === 0 && z === 0 ? 1 : 0);
  assert.equal(terrainQuads(one, 0, 0, 1).length, 5);
  const two = (x: number, z: number) =>
    z === 0 && (x === 0 || x === 1) ? 1 : 0;
  assert.equal(terrainQuads(two, 0, 0, 2).length, 8);
});
await test("adjacent chunk meshes match whole-region geometry", () => {
  const sample = (x: number, z: number) =>
    x >= 0 && x < 2 && z >= 0 && z < 2 ? x + 1 : 0;
  const whole = terrainQuads(sample, 0, 0, 2);
  const split = [
    ...terrainQuads(sample, 0, 0, 1),
    ...terrainQuads(sample, 0, 1, 1),
    ...terrainQuads(sample, 1, 0, 1),
    ...terrainQuads(sample, 1, 1, 1),
  ];
  const normalize = (q: Quad[]) => q.map((x) => JSON.stringify(x)).sort();
  assert.deepEqual(normalize(split), normalize(whole));
  assert.ok(whole.every((q) => q.points.flat().every(Number.isFinite)));
});
await test("terrain face winding points outward", () => {
  const quads = terrainQuads(
    (x: number, z: number) => (x === 0 && z === 0 ? 1 : 0),
    0,
    0,
    1
  );
  for (const q of quads) {
    const [a, b, c] = q.points;
    const normal = new Vector3()
      .subVectors(new Vector3(...b), new Vector3(...a))
      .cross(new Vector3().subVectors(new Vector3(...c), new Vector3(...a)));
    const center = q.points
      .reduce((sum, p) => sum.add(new Vector3(...p)), new Vector3())
      .divideScalar(4)
      .subScalar(0.5);
    assert.ok(normal.dot(center) > 0);
  }
});

await test("half-metre terrain meshes preserve cubic faces and chunk seams", () => {
  const sample = (x: number, z: number) =>
    x >= 0 && x < 1 && z >= 0 && z < 1 ? (x < 0.5 ? 2 : 2.5) : 0;
  const whole = terrainQuads(sample, 0, 0, 1, 0.5);
  const split = [
    ...terrainQuads(sample, 0, 0, 0.5, 0.5),
    ...terrainQuads(sample, 0.5, 0, 0.5, 0.5),
    ...terrainQuads(sample, 0, 0.5, 0.5, 0.5),
    ...terrainQuads(sample, 0.5, 0.5, 0.5, 0.5),
  ];
  const normalize = (quads: Quad[]) =>
    quads.map((q) => JSON.stringify(q)).sort();
  assert.deepEqual(normalize(whole), normalize(split));
  for (const q of whole) {
    for (const p of q.points) {
      assert.ok(p.every((v) => Number.isInteger(v / 0.5)));
    }
    const [a, b, c] = q.points;
    const normal = new Vector3()
      .subVectors(new Vector3(...b), new Vector3(...a))
      .cross(new Vector3().subVectors(new Vector3(...c), new Vector3(...a)))
      .normalize();
    assert.equal(
      Math.abs(normal.x) + Math.abs(normal.y) + Math.abs(normal.z),
      1
    );
  }
});
