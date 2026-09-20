import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createAvatar } from "../src/avatar.ts";
import {
  FEET_VARIANTS,
  supportFitsShelf,
  variantIndex,
} from "../src/feet-prototype-model.ts";

void test("study uses actual avatar meshes with baseline upper body and explicit foot alternatives", () => {
  const expectedWidths = [0.52, 0.44, 0.4];
  for (const [index, variant] of FEET_VARIANTS.entries()) {
    const model = createAvatar(variant.proportions);
    const feet = new THREE.Box3();
    for (const name of ["left-foot", "right-foot"]) {
      const foot = model.group.getObjectByName(name);
      assert.ok(foot);
      feet.union(new THREE.Box3().setFromObject(foot));
    }
    const expected = expectedWidths[index];
    assert.ok(expected);
    assert.ok(Math.abs(feet.getSize(new THREE.Vector3()).x - expected) < 1e-12);
    assert.ok(Math.abs(feet.getSize(new THREE.Vector3()).z - 0.22) < 1e-12);
    const torso = model.group.getObjectByName("torso");
    assert.ok(torso);
    assert.equal(
      new THREE.Box3().setFromObject(torso).getSize(new THREE.Vector3()).x,
      0.55
    );
    model.pose(Math.PI / 6);
    const left = model.group.getObjectByName("left-foot"),
      right = model.group.getObjectByName("right-foot");
    assert.ok(left && right);
    assert.equal(left.rotation.x, 0.4);
    assert.equal(right.rotation.x, -0.4);
    model.pose(0);
    assert.equal(left.rotation.x, 0);
    model.dispose();
  }
});
void test("proposed support is independent of rendered heading and gait, with inclusive exact shelf edges", () => {
  assert.equal(supportFitsShelf(600, 0, 500), false);
  assert.equal(supportFitsShelf(440, 30, 500), true);
  assert.equal(supportFitsShelf(440, -30, 500), true);
  assert.equal(supportFitsShelf(440, 31, 500), false);
  assert.equal(supportFitsShelf(400, 50, 500), true);
  assert.equal(supportFitsShelf(400, -51, 500), false);
  assert.equal(supportFitsShelf(600, 150, 1000), true);
  const model = createAvatar();
  model.group.rotation.y = Math.PI / 4;
  model.pose(Math.PI / 6);
  assert.equal(supportFitsShelf(440, 0, 500), true);
  model.dispose();
});
void test("variant URL values have a stable baseline fallback", () => {
  assert.equal(variantIndex(null), 0);
  assert.equal(variantIndex("A"), 0);
  assert.equal(variantIndex("B"), 1);
  assert.equal(variantIndex("C"), 2);
  assert.equal(variantIndex("bad"), 0);
});
