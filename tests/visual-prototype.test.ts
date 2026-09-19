import { Vector3 } from "three";
import { voxelGeometry } from "../src/visual-prototype-voxels.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  boundaryRadius,
  cycleVariant,
  parseVariant,
  studies,
  surfaceHeight,
  variantURL,
  variants,
} from "../src/visual-prototype-model.ts";
void test("study selection accepts supported variants and defaults safely", () => {
  assert.equal(parseVariant(null), "A");
  assert.equal(parseVariant("unknown"), "A");
  for (const variant of variants) {
    assert.equal(parseVariant(variant), variant);
    assert.ok(studies[variant].name);
  }
  assert.equal(cycleVariant("A", -1), "C");
  assert.equal(cycleVariant("C", 1), "A");
  assert.equal(cycleVariant("A", 1), "B");
  assert.equal(cycleVariant("C", -1), "B");
});
void test("shareable study URLs preserve the user's seed and other URL state", () => {
  const url = new URL(
    variantURL("http://localhost/?seed=hello&variant=A#notes", "B"),
  );
  assert.equal(url.searchParams.get("seed"), "hello");
  assert.equal(url.searchParams.get("variant"), "B");
  assert.equal(url.hash, "#notes");
});
void test("each study has stable finite relief with smaller rises than metre blocks", () => {
  for (const variant of variants) {
    for (let x = -20; x <= 20; x += 0.5) {
      for (let z = -20; z <= 20; z += 0.5) {
        const y = surfaceHeight(x, z, variant);
        assert.ok(Number.isFinite(y));
        assert.equal(y, surfaceHeight(x, z, variant));
        assert.ok(Math.abs(y - surfaceHeight(x + 0.5, z, variant)) < 0.6);
      }
    }
  }
  assert.notEqual(surfaceHeight(3, 5, "A"), surfaceHeight(3, 5, "B"));
  for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
    assert.ok(boundaryRadius(angle) > 13 && boundaryRadius(angle) < 21);
    assert.ok(
      Math.abs(boundaryRadius(angle) - boundaryRadius(angle + Math.PI * 2)) <
        1e-10,
    );
  }
});

void test("all visual studies retain half-metre voxel levels", () => {
  for (const variant of variants) {
    for (const [x, z] of [
      [3, 5],
      [-7, 2],
      [10, -4],
    ]) {
      const height = surfaceHeight(x ?? 0, z ?? 0, variant);
      assert.equal(height / 0.5, Math.round(height / 0.5));
    }
  }
});

void test("voxel surfaces expose six square faces and cull internal faces", () => {
  const single = voxelGeometry([0.5, 0.5, 0.5], 0.5, () => true);
  assert.equal(single.getAttribute("position").count, 36);
  const adjacent = voxelGeometry([1, 0.5, 0.5], 0.5, () => true);
  assert.equal(adjacent.getAttribute("position").count, 60);
  const empty = voxelGeometry([1, 1, 1], 0.5, () => false);
  assert.equal(empty.getAttribute("position").count, 0);
  single.dispose();
  adjacent.dispose();
  empty.dispose();
});
void test("curved voxel silhouettes still have only axis-aligned faces with outward winding", () => {
  const geometry = voxelGeometry(
    [4, 4, 4],
    0.5,
    (x, y, z) => Math.hypot(x, y, z) < 1.8,
  );
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  assert.ok(positions.count > 0);
  for (let i = 0; i < positions.count; i += 3) {
    const a = new Vector3().fromBufferAttribute(positions, i);
    const b = new Vector3().fromBufferAttribute(positions, i + 1);
    const c = new Vector3().fromBufferAttribute(positions, i + 2);
    const normal = new Vector3().fromBufferAttribute(normals, i);
    assert.equal(
      Math.abs(normal.x) + Math.abs(normal.y) + Math.abs(normal.z),
      1,
    );
    assert.ok(b.sub(a).cross(c.sub(a)).normalize().dot(normal) > 0.999);
    for (const value of a.toArray()) {
      assert.equal(value / 0.5, Math.round(value / 0.5));
    }
  }
  geometry.dispose();
  assert.throws(() => voxelGeometry([1, 1, 1], 0, () => true));
  assert.throws(() => voxelGeometry([-1, 1, 1], 0.5, () => true));
});
