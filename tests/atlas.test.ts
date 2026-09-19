import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  atlasBlend,
  atlasLabelCandidates,
  containsPoint,
  atlasParts,
  projectAtlas,
  projectPoint,
  pickAtlas,
  placeAtlasLabels,
} from "../src/atlas.ts";
import { createIsland } from "../src/packages/island/index.ts";
import { GameApplication } from "../src/packages/play/index.ts";
import { ThirdPersonCamera } from "../src/camera.ts";

await test("atlas footprint bounds exactly match every production solid on multiple seeds", () => {
  for (const seed of ["signal-and-shelter", "atlas-bounds"]) {
    const island = createIsland(seed);
    const parts = atlasParts(island).filter((p) => p.kind !== "terrain");
    assert.equal(parts.length, island.solids.length);
    parts.forEach((p, i) => {
      const solid = island.solids[i];
      assert.ok(solid);
      assert.ok(Math.abs(p.x - p.width / 2 - solid.minX) < 1e-10);
      assert.ok(Math.abs(p.x + p.width / 2 - solid.maxX) < 1e-10);
      assert.ok(Math.abs(p.z - p.depth / 2 - solid.minZ) < 1e-10);
      assert.ok(Math.abs(p.z + p.depth / 2 - solid.maxZ) < 1e-10);
      assert.ok(Math.abs(p.y - solid.maxY) < 1e-10);
    });
  }
});
await test("blend is continuous and manual camera framing has no dependence on atlas knowledge", () => {
  assert.equal(atlasBlend(0), 0);
  assert.equal(atlasBlend(0.62), 0);
  assert.equal(atlasBlend(0.8), 1);
  assert.equal(atlasBlend(1), 1);
  assert.ok(Math.abs(atlasBlend(0.71) - 0.5) < 1e-10);
  const camera = new ThirdPersonCamera();
  const original = camera.frame({ x: 0, y: 3, z: 0 }, 1, 2, 1);
  for (const zoom of [0.62, 0.71, 0.8, 1, 0.35]) {
    camera.zoom = zoom;
    atlasBlend(zoom);
  }
  assert.deepEqual(camera.frame({ x: 0, y: 3, z: 0 }, 1, 2, 1), original);
});
await test("atlas clips every object and terrain to shared exploration and only picks revealed pieces", () => {
  const source = createIsland("atlas-picking");
  const island = {
    ...source,
    spawn: { x: 0, z: 0 },
    heightAt: () => 3,
    resources: source.resources.map((r, i) => ({
      ...r,
      x: 8.8 + i * 10,
      z: 0,
    })),
  };
  const app = new GameApplication(island, true),
    parts = atlasParts(island);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
  camera.position.set(0, 100, 0);
  camera.up.set(0, 0, -1);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const projected = projectAtlas(parts, app.exploration, camera, 800, 800);
  const resource = island.resources[0];
  assert.ok(resource);
  assert.ok(projected.some((p) => p.source.id === resource.id));
  assert.ok(!projected.some((p) => p.source.id === island.resources[1]?.id));
  const point = (x: number) =>
    projectPoint({ x, y: 4.1, z: 0.05 }, camera, 800, 800);
  assert.equal(pickAtlas(projected, point(7.95)), resource.id);
  assert.equal(pickAtlas(projected, point(8.1)), null);
  const candidates = atlasLabelCandidates(projected, island, resource.id);
  const label = candidates[0];
  assert.ok(label);
  assert.equal(label.text, resource.name);
  assert.ok(
    projected.some(
      (p) =>
        p.source.id === resource.id && containsPoint(p.points, label.anchor)
    )
  );
  assert.equal(
    containsPoint(
      [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ],
      { x: 50, y: 50 }
    ),
    false
  );
  assert.equal(pickAtlas(projected, { x: -100, y: -100 }), null);
  const hit = projected.find((p) => p.source.id === resource.id);
  assert.ok(hit);
  assert.equal(
    pickAtlas(
      [hit, { ...hit, source: { ...hit.source, id: null } }],
      point(7.95)
    ),
    null
  );
  const moved = new GameApplication({ ...island, spawn: resource }, true);
  const fullyRevealed = projectAtlas(
    parts,
    moved.exploration,
    camera,
    800,
    800
  );
  assert.equal(pickAtlas(fullyRevealed, point(9.6)), resource.id);
  assert.ok(
    fullyRevealed.some(
      (p) => p.source.id === resource.id && p.color === resource.color
    )
  );
});
await test("labels stay in narrow bounds and avoid player, selected footprints, panels and each other", () => {
  const obstacles = [
    { x: 170, y: 350, width: 50, height: 50 },
    { x: 0, y: 0, width: 390, height: 100 },
  ];
  const labels = placeAtlasLabels(
    [
      { text: "Stranded ship", anchor: { x: 180, y: 380 } },
      { text: "Unknown deposit", anchor: { x: 185, y: 380 } },
      { text: "Offscreen", anchor: { x: -500, y: 0 } },
    ],
    390,
    844,
    obstacles
  );
  assert.ok(labels.length >= 1);
  assert.ok(labels.length <= 2);
  labels.forEach((r, i) => {
    assert.ok(
      r.x >= 8 && r.x + r.width <= 382 && r.y >= 8 && r.y + r.height <= 836
    );
    for (const o of [...obstacles, ...labels.slice(0, i)]) {
      assert.ok(
        r.x >= o.x + o.width ||
          r.x + r.width <= o.x ||
          r.y >= o.y + o.height ||
          r.y + r.height <= o.y
      );
    }
  });
});
