import test from "node:test";
import assert from "node:assert/strict";
import { ventParts } from "../src/world-visuals.ts";
import { createIsland } from "../src/world.ts";
import { boxCollider, makeObstacles } from "../src/collision.ts";

await test("vent tiers retain block geometry, a square open rim and finite bounds", () => {
  for (const height of [2, 2.5, 3, 3.5]) {
    const parts = ventParts(height);
    const tiers = parts.filter((part) => part.name.startsWith("Vent_tier_"));
    assert.equal(tiers.length, height / 0.5);
    for (const part of parts) {
      assert.ok(part.position.every(Number.isFinite));
      assert.ok(
        part.size.every((value) => value > 0 && Number.isFinite(value)),
      );
    }
    for (const tier of tiers) {
      assert.equal(tier.size[1], 0.5);
      assert.equal(tier.size[0], tier.size[2]);
      assert.ok(tier.size[0] <= 1.5);
    }
    const rim = parts.filter((part) => part.name.startsWith("Vent_rim_"));
    assert.equal(rim.length, 4);
    assert.ok(
      rim.every(
        (part) =>
          Math.abs(part.position[0]) >= part.size[0] / 2 ||
          Math.abs(part.position[2]) >= part.size[2] / 2,
      ),
    );
  }
  for (const invalid of [NaN, Infinity, 0, -1, 8]) {
    assert.throws(() => ventParts(invalid), RangeError);
  }
});
await test("all rendered vent block definitions have matching production colliders", () => {
  const island = createIsland("vent-test-world");
  assert.ok(island.vents.length > 0);
  const expected = island.vents.flatMap((vent) =>
    ventParts(vent.height).map((part) => {
      const [x, y, z] = part.position;
      const [width, height, depth] = part.size;
      return boxCollider(
        vent.x + x,
        island.heightAt(vent.x, vent.z) + y - height / 2,
        vent.z + z,
        width,
        height,
        depth,
      );
    }),
  );
  assert.deepEqual(makeObstacles(island).slice(0, expected.length), expected);
});
