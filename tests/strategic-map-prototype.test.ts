import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ExplorationStudy,
  mapOpacity,
  mapMarkers,
  mapProjector,
  pickMapMarker,
} from "../src/strategic-map-prototype-model.ts";
import { CameraStudy } from "../src/camera-prototype-model.ts";
import { createIsland } from "../src/packages/island/index.ts";

void test("map transition is bounded, continuous, and changes no camera or play state", () => {
  assert.equal(mapOpacity(0), 0);
  assert.equal(mapOpacity(0.62), 0);
  assert.ok(Math.abs(mapOpacity(0.71) - 0.5) < 0.000001);
  assert.equal(mapOpacity(0.8), 1);
  assert.equal(mapOpacity(1), 1);
  const study = new CameraStudy(createIsland("map"), "B");
  const frame = study.frame();
  const state = study.app.state;
  for (const zoom of [0, 0.62, 0.71, 0.8, 1]) {
    mapOpacity(zoom);
  }
  assert.deepEqual(study.frame(), frame);
  assert.equal(study.app.state, state);
});
void test("exploration covers an eight-metre neighborhood, persists, freezes when paused and resets", () => {
  const exploration = new ExplorationStudy();
  exploration.visit({ x: 0, z: 0 }, false);
  assert.ok(exploration.knows({ x: 1, z: 1 }));
  assert.ok(exploration.knows({ x: -1, z: -1 }));
  assert.equal(exploration.knows({ x: 9, z: 1 }), false);
  const count = exploration.count;
  exploration.visit({ x: 0, z: 0 }, false);
  assert.equal(exploration.count, count);
  exploration.visit({ x: 20, z: 20 }, true);
  assert.equal(exploration.knows({ x: 20, z: 20 }), false);
  exploration.visit({ x: 20, z: 20 }, false);
  assert.ok(exploration.knows({ x: 20, z: 20 }));
  assert.ok(exploration.knows({ x: 0, z: 0 }));
  exploration.clear();
  assert.equal(exploration.count, 0);
});
void test("map distinguishes absent, located and surveyed deposits; sample preview never mutates gameplay", () => {
  const island = createIsland("map");
  const study = new CameraStudy(island, "B");
  const exploration = new ExplorationStudy();
  const resource = island.resources[0];
  assert.ok(resource);
  assert.equal(
    mapMarkers(island, study.app.state, exploration, false).find(
      (m) => m.id === resource.id
    ),
    undefined
  );
  exploration.visit(resource, false);
  assert.equal(
    mapMarkers(island, study.app.state, exploration, false).find(
      (m) => m.id === resource.id
    )?.symbol,
    "?"
  );
  assert.equal(study.app.state.discovered.length, 0);
  const preview = mapMarkers(island, study.app.state, exploration, true);
  assert.equal(preview.length, island.resources.length + 2);
  assert.equal(preview.find((m) => m.id === resource.id)?.label, resource.name);
  assert.equal(study.app.state.discovered.length, 0);
  const surveyed = { ...study.app.state, discovered: [resource.id] };
  exploration.clear();
  assert.equal(
    mapMarkers(island, surveyed, exploration, false).find(
      (m) => m.id === resource.id
    )?.label,
    resource.name
  );
});
void test("map projection shares the camera anchor, perspective and orbit", () => {
  const study = new CameraStudy(createIsland("map"), "B");
  study.zoom = 1;
  const frame = study.frame();
  const project = mapProjector(frame, 1200, 800);
  const target = project(frame.target.x, frame.target.y, frame.target.z);
  assert.ok(Math.abs(target.x - 600) < 0.00001);
  assert.ok(Math.abs(target.y - 400) < 0.00001);
  assert.equal(target.visible, true);
  assert.ok(
    project(frame.target.x + 1, frame.target.y, frame.target.z).x > 600
  );
});
void test("map hit testing picks the nearest symbol and rejects empty ground", () => {
  const markers = [
    { id: "ship", x: 30, y: 30 },
    { id: "copper", x: 40, y: 30 },
  ];
  assert.equal(pickMapMarker(markers, 39, 30), "copper");
  assert.equal(pickMapMarker(markers, 10, 30), "ship");
  assert.equal(pickMapMarker(markers, 100, 100), null);
});

void test("map object parts match every production collider footprint without collapsing gaps", async () => {
  const { mapFootprints, pickMapFootprint } =
    await import("../src/strategic-map-prototype-model.ts");
  for (const seed of ["signal-and-shelter", "map-check"]) {
    const island = createIsland(seed);
    const parts = mapFootprints(island);
    assert.equal(parts.length, island.solids.length);
    parts.forEach((part, i) => {
      const solid = island.solids[i];
      assert.ok(solid);
      assert.deepEqual(
        [part.minX, part.maxX, part.minZ, part.maxZ],
        [solid.minX, solid.maxX, solid.minZ, solid.maxZ]
      );
    });
    const ship = parts.filter((p) => p.id === "ship");
    assert.ok(
      Math.max(...ship.map((p) => p.maxZ)) -
        Math.min(...ship.map((p) => p.minZ)) >
        4
    );
  }
  const shapes = [
    {
      id: "ship",
      points: [
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        { x: 40, y: 20 },
        { x: 0, y: 20 },
      ],
    },
  ];
  assert.equal(pickMapFootprint(shapes, 35, 10), "ship");
  assert.equal(pickMapFootprint(shapes, 45, 10), null);
});
