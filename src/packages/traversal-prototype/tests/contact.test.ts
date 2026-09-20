import assert from "node:assert/strict";
import { test } from "node:test";
import { createTraversal, HUMANOID, groundPath } from "../index.ts";
import type { Box, Capabilities, Setup, State } from "../index.ts";
const floor: Box = {
  minX: -5000,
  maxX: 5000,
  minY: -500,
  maxY: 0,
  minZ: -5000,
  maxZ: 5000,
};
const walker: Capabilities = { ...HUMANOID, jump: false };
const wall = (x: number): Box => ({
  minX: x,
  maxX: x + 100,
  minY: 0,
  maxY: 3000,
  minZ: -2000,
  maxZ: 2000,
});
const actor = (id: string, x: number, z = 0, capabilities = walker) => ({
  id,
  position: { x, y: 0, z },
  capabilities,
});
function position(s: State, id: string) {
  const a = s.actors.find((a) => a.id === id);
  assert.ok(a);
  assert.equal(s.fault, null);
  return a.motion;
}
await test("600 mm passage admits exact-fit motion; 599 mm opening blocks entry", () => {
  for (const width of [600, 599]) {
    const setup: Setup = {
      boxes: [
        floor,
        { minX: 0, maxX: 2000, minY: 0, maxY: 3000, minZ: -1000, maxZ: -300 },
        {
          minX: 0,
          maxX: 2000,
          minY: 0,
          maxY: 3000,
          minZ: width - 300,
          maxZ: 1000,
        },
      ],
      actors: [actor("player", -300)],
    };
    const sim = createTraversal(setup);
    const s = sim.step(sim.initial(), [{ actor: "player", heading: 0 }]);
    assert.equal(position(s, "player").x, width === 600 ? -230 : -300);
  }
});
await test("partial contact advances 45 mm, drops blocked residue, and allows departure", () => {
  const sim = createTraversal({
    boxes: [floor, wall(345)],
    actors: [actor("player", 0)],
  });
  let s = sim.step(sim.initial(), [{ actor: "player", heading: 0 }]);
  assert.equal(position(s, "player").x, 45);
  assert.equal(position(s, "player").rx, 0);
  for (let i = 0; i < 20; i++) {
    s = sim.step(s);
  }
  assert.equal(position(s, "player").x, 45);
  s = sim.step(s, [{ actor: "player", heading: 32768 }]);
  assert.equal(position(s, "player").x, -25);
});
await test("clipped diagonal keeps tangential travel without boosting it", () => {
  const sim = createTraversal({
    boxes: [floor, wall(320)],
    actors: [actor("player", 0)],
  });
  const s = sim.step(sim.initial(), [{ actor: "player", heading: 8192 }]);
  assert.equal(position(s, "player").x, 20);
  assert.equal(position(s, "player").z, 49);
  assert.equal(position(s, "player").rx, 0);
  assert.notEqual(position(s, "player").rz, 0);
});
await test("touching followers advance together independently of setup order", () => {
  for (const reverse of [false, true]) {
    const actors = [actor("player", 0), actor("robot", 600)];
    const sim = createTraversal({
      boxes: [floor],
      actors: reverse ? actors.reverse() : actors,
    });
    let s = sim.initial();
    for (let n = 1; n <= 10; n++) {
      s = sim.step(s, [
        { actor: "player", heading: 0 },
        { actor: "robot", heading: 0 },
      ]);
      assert.equal(position(s, "player").x, n * 70);
      assert.equal(position(s, "robot").x, 600 + n * 70);
    }
  }
});
await test("leader clipping propagates to a touching follower in the same tick", () => {
  const sim = createTraversal({
    boxes: [floor, wall(945)],
    actors: [actor("player", 0), actor("robot", 600)],
  });
  let s = sim.step(sim.initial(), [
    { actor: "player", heading: 0 },
    { actor: "robot", heading: 0 },
  ]);
  assert.equal(position(s, "robot").x, 645);
  assert.equal(position(s, "player").x, 45);
  s = sim.step(s);
  assert.equal(position(s, "player").x, 45);
  assert.equal(position(s, "robot").x, 645);
});
await test("head-on motion cannot swap actors despite clear proposed endpoints", () => {
  const small = { ...walker, width: 20, support: 20, height: 20, speed: 100 };
  const sim = createTraversal({
    boxes: [floor],
    actors: [actor("player", -50, 0, small), actor("robot", 50, 0, small)],
  });
  const s = sim.step(sim.initial(), [
    { actor: "player", heading: 0 },
    { actor: "robot", heading: 32768 },
  ]);
  assert.ok(position(s, "player").x + 20 <= position(s, "robot").x);
});
await test("right-angle crossings are checked between tick endpoints", () => {
  const small = { ...walker, width: 20, support: 20, height: 20, speed: 100 };
  const sim = createTraversal({
    boxes: [floor],
    actors: [actor("player", -50, 0, small), actor("robot", 0, -50, small)],
  });
  const s = sim.step(sim.initial(), [
    { actor: "player", heading: 0 },
    { actor: "robot", heading: 16384 },
  ]);
  const a = position(s, "player"),
    b = position(s, "robot");
  assert.ok(a.x !== 50 || b.z !== 50);
  // Independent interior samples detect crossing rather than reusing the solver.
  for (let i = 0; i <= 1000; i++) {
    const t = i / 1000;
    assert.ok(
      Math.abs(-50 + (a.x + 50) * t - b.x * t) >= 20 ||
        Math.abs(a.z * t - (-50 + (b.z + 50) * t)) >= 20
    );
  }
});
await test("partial edge advance stops with the complete support square on the floor", () => {
  const sim = createTraversal({
    boxes: [{ ...floor, maxX: 245 }],
    actors: [actor("player", 0)],
  });
  const s = sim.step(sim.initial(), [{ actor: "player", heading: 0 }]);
  assert.equal(position(s, "player").x, 25);
  assert.ok(
    groundPath(
      { x: 0, y: 0, z: 0 },
      position(s, "player"),
      walker,
      sim.geometry()
    )
  );
});
await test("joint preview and actual ticks agree and do not modify the initial state", () => {
  const sim = createTraversal({
    boxes: [floor, wall(945)],
    actors: [actor("player", 0), actor("robot", 600)],
  });
  const initial = sim.initial(),
    copy = structuredClone(initial);
  const commands = [
    { actor: "player", heading: 0 },
    { actor: "robot", heading: 0 },
  ];
  const expected = sim.preview(initial, commands, 6);
  let s = initial;
  for (let n = 0; n < expected.length; n++) {
    s = sim.step(s, n === 0 ? commands : []);
    assert.deepEqual(s, expected[n]);
  }
  assert.deepEqual(initial, copy);
});

await test("time-separated committed jumps share spatial regions without an untimed exclusion", () => {
  const c = {
    ...HUMANOID,
    width: 200,
    support: 100,
    height: 400,
    alignment: 0,
  };
  const sim = createTraversal({
    boxes: [
      floor,
      { minX: 0, maxX: 500, minY: 0, maxY: 500, minZ: -250, maxZ: 250 },
      { minX: -1250, maxX: -750, minY: 0, maxY: 500, minZ: 0, maxZ: 500 },
    ],
    actors: [actor("player", -1600, 0, c), actor("robot", -1000, -1600, c)],
  });
  let s = sim.initial();
  for (let i = 0; i < 17; i++) {
    s = sim.step(
      s,
      i === 0
        ? [{ actor: "player", heading: 0 }]
        : i === 8
          ? [{ actor: "robot", heading: 16384 }]
          : []
    );
    assert.equal(s.fault, null);
  }
  const a = s.actors.find((a) => a.id === "player"),
    b = s.actors.find((a) => a.id === "robot");
  assert.ok(a?.plan && b?.plan);
  assert.equal(a.phase, "flight");
  assert.equal(b.phase, "flight");
  const ap = a.plan.ticks.slice(a.plan.remaining),
    bp = b.plan.ticks.slice(b.plan.remaining);
  // Independent check: both paths occupy some common volume at DIFFERENT times.
  // A union of all future space would reject this legal pair.
  assert.ok(
    ap.some((p) =>
      bp.some(
        (q) =>
          Math.abs(p.x - q.x) < c.width &&
          Math.abs(p.z - q.z) < c.width &&
          Math.abs(p.y - q.y) < c.height
      )
    )
  );
  for (let i = 0; i < 45; i++) {
    s = sim.step(
      s,
      i === 0
        ? [
            { actor: "player", heading: null },
            { actor: "robot", heading: null },
          ]
        : []
    );
    assert.equal(s.fault, null);
  }
  assert.equal(position(s, "player").y, 500);
  assert.equal(position(s, "robot").y, 500);
  assert.equal(
    s.actors.every((a) => a.phase === "ground"),
    true
  );
});

await test("a three-actor contact chain is safe and independent of storage order", () => {
  const starts = [
    actor("player", 0),
    actor("middle", 600),
    actor("leader", 1200),
  ];
  const commands = starts.map((a) => ({ actor: a.id, heading: 0 }));
  const states = [
    starts,
    [...starts].reverse(),
    [starts[1], starts[2], starts[0]].filter((a) => a !== undefined),
  ].map((actors) => {
    const sim = createTraversal({ boxes: [floor, wall(1545)], actors });
    const s = sim.step(sim.initial(), commands);
    assert.equal(s.fault, null);
    return s.actors
      .map((a) => ({ id: a.id, motion: a.motion }))
      .sort((a, b) => (a.id < b.id ? -1 : 1));
  });
  assert.deepEqual(states[0], states[1]);
  assert.deepEqual(states[0], states[2]);
});
