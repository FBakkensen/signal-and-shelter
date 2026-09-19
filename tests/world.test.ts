import { Vector3 } from "three";
import type { Quad } from "../src/world.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {
  hash,
  heightAt,
  biomeAt,
  makeTrees,
  terrainQuads,
  LANDMARKS,
  SPAWN,
  WATER,
  SIZE,
} from "../src/world.ts";

await test("generation is repeatable, seed-sensitive and bounded", () => {
  for (let x = -50; x < 50; x++) {
    for (let z = -50; z < 50; z++) {
      assert.equal(hash(x, z), hash(x, z));
      assert.ok(hash(x, z) >= 0 && hash(x, z) < 1);
      assert.ok(Number.isInteger(heightAt(x, z)));
      assert.ok(heightAt(x, z) >= 0 && heightAt(x, z) <= 8);
    }
  }
  assert.notEqual(hash(2, 3, 731), hash(2, 3, 732));
  assert.equal(heightAt(-SIZE, 0), 0);
  assert.equal(heightAt(SIZE, 0), 0);
  assert.equal(heightAt(0.1, 0.9), heightAt(0.9, 0.1));
});
await test("spawn and all landmarks are on dry terrain", () => {
  for (const p of [SPAWN, ...LANDMARKS]) {
    assert.ok(heightAt(p.x, p.z) > WATER);
  }
});
await test("biomes distinguish shoreline, grove, and meadow", () => {
  assert.equal(biomeAt(47, 47), "shore");
  assert.equal(biomeAt(20, -12), "grove");
  assert.equal(biomeAt(0, 0), "meadow");
});
await test("tree placement is deterministic, on land and clear of landmarks and trail", () => {
  const trees = makeTrees();
  assert.ok(trees.length > 20);
  assert.deepEqual(trees, makeTrees());
  for (const t of trees) {
    assert.ok(heightAt(t.x, t.z) >= 3);
    assert.ok(Math.abs(t.x) >= 3.5);
    assert.ok(t.height >= 3 && t.height < 5);
    for (const p of LANDMARKS) {
      assert.ok(Math.hypot(t.x - p.x, t.z - p.z) > 4);
    }
  }
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
    1,
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
