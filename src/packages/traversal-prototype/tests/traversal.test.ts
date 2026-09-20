import assert from "node:assert/strict";
import { test } from "node:test";
import {
  body,
  clear,
  createTraversal,
  direction,
  displacement,
  groundPath,
  HUMANOID,
  overlaps,
  SCALE,
  supported,
  sweep,
} from "../index.ts";
import type { Actor, Box, State } from "../index.ts";
import { COURSES, PROFILES, setupCourse } from "../courses.ts";
const floor: Box = {
  minX: -4000,
  maxX: 4000,
  minY: -500,
  maxY: 0,
  minZ: -4000,
  maxZ: 4000,
};
function course(id: string, profile = 0) {
  const c = COURSES.find((item) => item.id === id),
    p = PROFILES[profile];
  assert.ok(c && p);
  const sim = createTraversal(setupCourse(c, p.capabilities));
  return { c, sim };
}
function player(s: State): Actor {
  const a = s.actors[0];
  assert.ok(a);
  return a;
}
function reach(id: string, phase: Actor["phase"] = "recovery", profile = 0) {
  const { c, sim } = course(id, profile);
  let state = sim.initial();
  const history: State[] = [];
  for (let i = 0; i < 160; i++) {
    state = sim.step(
      state,
      i === 0 ? [{ actor: "player", heading: c.heading }] : []
    );
    assert.equal(state.fault, null);
    history.push(state);
    if (player(state).phase === phase) {
      return { state, sim, c, history };
    }
  }
  assert.fail(`${id} did not reach ${phase}`);
}
await test("full support uses rectangle union, including seams and interior holes", () => {
  const p = { x: 0, y: 0, z: 0 },
    c = { ...HUMANOID };
  const left = { ...floor, maxX: 0 },
    right = { ...floor, minX: 0 };
  assert.ok(supported(p, c, [left, right]));
  assert.equal(supported(p, c, [left, { ...right, minX: 1 }]), false);
  const hole = [
    { ...floor, maxX: -20 },
    { ...floor, minX: 20 },
    { ...floor, minX: -20, maxX: 20, maxZ: -20 },
    { ...floor, minX: -20, maxX: 20, minZ: 20 },
  ];
  assert.equal(supported(p, c, hole), false);
  assert.equal(supported(p, c, [left, { ...right, maxY: -1 }]), false);
  assert.ok(supported(p, c, [left, left, right]));
  assert.equal(
    groundPath({ x: -1000, y: 0, z: 0 }, { x: 1000, y: 0, z: 0 }, c, [
      { ...floor, maxX: -1 },
      { ...floor, minX: 1 },
    ]),
    false
  );
});
await test("sweeps allow touching and reject thin obstacles between clear endpoints", () => {
  const c = { ...HUMANOID },
    wall = { ...floor, minX: 0, maxX: 1, minY: 0, maxY: 3000 };
  const p = { x: -300, y: 0, z: 0 };
  assert.equal(sweep(p, { ...p, z: 100 }, c, wall), false);
  assert.equal(sweep(p, { ...p, x: -301 }, c, wall), false);
  assert.equal(sweep(p, { ...p, x: -299 }, c, wall), true);
  assert.equal(sweep({ x: -1000, y: 0, z: 0 }, p, c, wall), false);
  assert.equal(
    clear({ x: -1000, y: 0, z: 0 }, { x: 1000, y: 0, z: 0 }, c, [wall]),
    false
  );
  assert.equal(sweep(p, { ...p, x: -230 }, c, floor), false);
});
await test("all table headings are inward, symmetric and retain centered movement residues", () => {
  for (let h = 0; h < 65536; h++) {
    const [x, z] = direction(h);
    assert.ok(Number.isInteger(x) && Number.isInteger(z));
    assert.ok(x * x + z * z <= SCALE * SCALE);
    const [a, b] = direction(h + 32768);
    assert.equal(a === 0 ? 0 : a, x === 0 ? 0 : -x);
    assert.equal(b === 0 ? 0 : b, z === 0 ? 0 : -z);
  }
  assert.deepEqual(direction(8192), [11863283, 11863283]);
  let position = 0,
    residue = 0,
    total = 0n;
  for (let i = 0; i < 10000; i++) {
    const [component] = direction((i * 7919) % 65536),
      speed = i % 9 === 0 ? 0 : 70;
    const [d, r] = displacement(component, speed, residue);
    position += d;
    residue = r;
    total += BigInt(component) * BigInt(speed);
    assert.equal(BigInt(position) * BigInt(SCALE) + BigInt(residue), total);
    assert.ok(residue >= -SCALE / 2 && residue < SCALE / 2);
  }
  assert.deepEqual(displacement(0, 0, SCALE / 2), [1, -SCALE / 2]);
  assert.deepEqual(displacement(0, 0, -SCALE / 2), [0, -SCALE / 2]);
});
for (const id of [
  "rise-half",
  "rise-one",
  "close",
  "diagonal",
  "diagonal-half",
  "drop",
  "drop-half",
  "diagonal-drop",
  "diagonal-drop-half",
  "align",
  "ceiling",
]) {
  await test(`shared integer transition executes ${id} with full support and clearance`, () => {
    const { state, c, history } = reach(id);
    const a = player(state);
    assert.equal(a.motion.y, c.target.y);
    assert.ok(supported(a.motion, a.capabilities, c.boxes));
    for (const s of history) {
      const current = player(s);
      assert.ok(
        clear(current.motion, current.motion, current.capabilities, c.boxes)
      );
      assert.ok(current.motion.y - c.start.y <= current.capabilities.apex);
    }
    if (!id.includes("drop")) {
      assert.ok(Math.abs(a.motion.x - c.target.x) <= 25);
      assert.ok(Math.abs(a.motion.z - c.target.z) <= 25);
    }
  });
}
await test("early launch and vertical-first close launch use different safe trajectories", () => {
  const early = reach("rise-one", "flight"),
    close = reach("close", "flight");
  assert.equal(player(early.state).plan?.delay, 0);
  assert.ok((player(close.state).plan?.delay ?? 0) > 0);
  const next = close.sim.step(close.state);
  assert.equal(player(next).motion.x, player(close.state).motion.x);
  assert.ok(player(next).motion.y > player(close.state).motion.y);
});
await test("trial and actual complete tick states are identical without mutating input", () => {
  const { sim, c } = course("diagonal");
  const initial = sim.initial(),
    copy = structuredClone(initial),
    command = { actor: "player", heading: c.heading };
  const preview = sim.preview(initial, [command], 80);
  assert.deepEqual(initial, copy);
  let actual = initial;
  for (let i = 0; i < 80; i++) {
    actual = sim.step(actual, i === 0 ? [command] : []);
    assert.deepEqual(actual, preview[i]);
  }
});
await test("alignment is supported, bounded and finishes before full preparation", () => {
  const { state, history, c } = reach("align", "flight");
  const moving = history.filter((s) => player(s).phase === "alignment");
  assert.ok(moving.length > 0);
  for (const s of history) {
    if (player(s).phase !== "flight") {
      assert.ok(supported(player(s).motion, player(s).capabilities, c.boxes));
      assert.ok(Math.abs(player(s).motion.z) <= 250);
    }
  }
  assert.equal(
    history.filter((s) => player(s).phase === "preparation").length,
    7
  );
  assert.equal(player(state).motion.z, 200);
});
for (const phase of ["alignment", "preparation"] as const) {
  await test(`release and changed direction cancel ${phase}`, () => {
    const { sim, state } = reach(
      phase === "alignment" ? "align" : "rise-one",
      phase
    );
    const release = sim.step(state, [{ actor: "player", heading: null }]);
    assert.equal(player(release).phase, "ground");
    assert.equal(player(release).plan, null);
    const turn = sim.step(state, [{ actor: "player", heading: 32768 }]);
    assert.equal(player(turn).phase, "ground");
  });
}
for (const phase of [
  "alignment",
  "preparation",
  "flight",
  "recovery",
] as const) {
  await test(`explicit pause preserves ${phase} and rejects paused input`, () => {
    const { sim, state } = reach(
      phase === "alignment" ? "align" : "rise-one",
      phase
    );
    const paused = sim.pause(state, true);
    assert.deepEqual(
      sim.step(paused, [{ actor: "player", heading: null }]),
      paused
    );
    assert.deepEqual(sim.step(sim.pause(paused, false)), sim.step(state));
  });
}
await test("seven ticks after landing stay stationary; new input cannot shorten recovery", () => {
  const { sim, state } = reach("rise-one");
  let s = state;
  const p = player(s).motion;
  for (let i = 0; i < 7; i++) {
    s = sim.step(s, [{ actor: "player", heading: i % 2 === 0 ? 32768 : 0 }]);
    assert.deepEqual(player(s).motion, p);
    assert.equal(player(s).timer, 6 - i);
  }
  assert.equal(player(s).phase, "ground");
  assert.equal(s.tick, state.tick + 7);
});
await test("lower ceiling selects a lower arc; blocked ceiling and occupied landing do not take off", () => {
  const open = reach("rise-half"),
    ceiling = reach("ceiling");
  const max = (states: State[]) =>
    Math.max(...states.map((s) => player(s).motion.y));
  assert.ok(max(ceiling.history) < max(open.history));
  for (const id of ["blocked-ceiling", "occupied", "outside"]) {
    const { sim, c } = course(id);
    let s = sim.initial();
    for (let i = 0; i < 90; i++) {
      s = sim.step(s, i === 0 ? [{ actor: "player", heading: c.heading }] : []);
      assert.equal(s.fault, null);
      assert.equal(player(s).phase, "ground");
      assert.equal(player(s).motion.y, 0);
    }
  }
});
await test("independent capabilities change reach and non-jumpers stop safely", () => {
  const small = reach("rise-half", "recovery", 1);
  assert.equal(player(small.state).timer, 5);
  assert.equal(player(small.state).capabilities.speed, 45);
  for (const profile of [1, 2]) {
    const { sim, c } = course("rise-one", profile);
    let s = sim.initial();
    for (let i = 0; i < 60; i++) {
      s = sim.step(s, i === 0 ? [{ actor: "player", heading: c.heading }] : []);
    }
    assert.equal(s.fault, null);
    assert.equal(player(s).motion.y, 0);
  }
});
await test("wall sliding has no tangential boost and unsafe holes stop ground motion", () => {
  const { sim } = course("wall");
  let s = sim.initial();
  for (let i = 0; i < 10; i++) {
    s = sim.step(s, i === 0 ? [{ actor: "player", heading: 8192 }] : []);
  }
  assert.equal(player(s).motion.x, -300);
  assert.equal(player(s).motion.z, -505);
  assert.equal(player(s).motion.rx, 0);
  const seam = course("seam");
  s = seam.sim.initial();
  for (let i = 0; i < 80; i++) {
    s = seam.sim.step(s, i === 0 ? [{ actor: "player", heading: 0 }] : []);
  }
  assert.ok(player(s).motion.x + 220 <= 800);
  assert.equal(s.fault, null);
});
await test("committed flight blocks later entry and ends with persistent landing occupancy", () => {
  const { sim, state } = reach("conflict", "flight");
  let s = state;
  for (let i = 0; i < 65; i++) {
    s = sim.step(
      s,
      i === 0
        ? [
            { actor: "robot", heading: 49152 },
            { actor: "player", heading: null },
          ]
        : []
    );
    assert.equal(s.fault, null);
    const a = s.actors[0],
      b = s.actors[1];
    assert.ok(a && b);
    assert.equal(
      overlaps(body(a.motion, a.capabilities), body(b.motion, b.capabilities)),
      false
    );
  }
  assert.equal(player(s).motion.y, 1000);
  assert.equal(player(s).phase, "ground");
});
await test("bad state or command halts with last valid tick retained", () => {
  const { sim } = course("rise-half");
  const initial = sim.initial();
  const invalid = sim.step(initial, [{ actor: "player", heading: NaN }]);
  assert.ok(invalid.fault);
  assert.equal(invalid.tick, initial.tick);
  assert.deepEqual(invalid.actors, initial.actors);
  const broken = createTraversal({
    boxes: [floor],
    actors: [
      {
        id: "player",
        position: { x: 0, y: 1, z: 0 },
        capabilities: { ...HUMANOID },
      },
    ],
  }).initial();
  assert.match(broken.fault ?? "", /unsupported/);
  assert.throws(() =>
    createTraversal({ boxes: [{ ...floor, maxX: 1.5 }], actors: [] })
  );
});

await test("connected narrow terraces can be traversed successively", () => {
  const { sim, c } = course("terrace");
  let s = sim.initial();
  const landings: number[] = [];
  let previous = "ground";
  for (let i = 0; i < 200; i++) {
    s = sim.step(s, i === 0 ? [{ actor: "player", heading: c.heading }] : []);
    assert.equal(s.fault, null);
    const a = player(s);
    if (a.phase === "recovery" && previous !== "recovery") {
      landings.push(a.motion.y);
    }
    previous = a.phase;
    if (landings.length === 2) {
      break;
    }
  }
  assert.deepEqual(landings, [500, 1000]);
});
await test("reduced flight speed and exact phase durations are retained in execution", () => {
  const { sim, state } = reach("drop", "flight");
  const a = player(state),
    plan = a.plan;
  assert.ok(plan);
  assert.ok(plan.speed < a.capabilities.speed);
  let s = state;
  for (const expected of plan.ticks) {
    s = sim.step(s);
    assert.deepEqual(player(s).motion, expected);
  }
  assert.equal(player(s).phase, "recovery");
  assert.equal(s.tick - state.tick, plan.ticks.length);
});
await test("safe airborne steering replaces a continuation while unsafe steering keeps it", () => {
  const dropping = reach("drop", "flight");
  const before = player(dropping.state).plan;
  assert.ok(before);
  let airborne = dropping.state;
  for (let i = 0; i < 10; i++) {
    airborne = dropping.sim.step(airborne);
  }
  const turn = dropping.sim.step(airborne, [
    { actor: "player", heading: 1000 },
  ]);
  assert.equal(turn.fault, null);
  assert.equal(player(turn).plan?.heading, 1000);
  const narrow = reach("close", "flight");
  let s = narrow.state;
  for (let i = 0; i < 16; i++) {
    s = narrow.sim.step(s);
  }
  const prior = player(s).plan;
  assert.ok(prior);
  const rejected = narrow.sim.step(s, [{ actor: "player", heading: 32768 }]);
  assert.equal(rejected.fault, null);
  assert.equal(player(rejected).plan?.heading, prior.heading);
});
await test("command order is captured and a fault retains the failed input", () => {
  const { sim } = course("rise-one");
  const initial = sim.initial();
  const commands = [
    { actor: "player", heading: 0 },
    { actor: "player", heading: null },
  ];
  const next = sim.step(initial, commands);
  assert.equal(player(next).intent, null);
  assert.deepEqual(next.commands, [
    { tick: 1, order: 0, command: commands[0] },
    { tick: 1, order: 1, command: commands[1] },
  ]);
  const bad = sim.step(next, [{ actor: "missing", heading: 0 }]);
  assert.equal(bad.tick, 1);
  assert.equal(bad.diagnostic?.attemptedTick, 2);
  assert.deepEqual(bad.diagnostic.commands, [{ actor: "missing", heading: 0 }]);
});
await test("robot preparation yields when player preparation claims the crossing first", () => {
  const c = COURSES.find((item) => item.id === "rise-one");
  assert.ok(c);
  const sim = createTraversal({
    boxes: [
      ...c.boxes,
      { minX: -500, maxX: 500, minY: 0, maxY: 1000, minZ: -500, maxZ: 500 },
    ],
    actors: [
      {
        id: "robot",
        position: { x: 250, y: 0, z: -1600 },
        capabilities: { ...HUMANOID },
      },
      {
        id: "player",
        position: { x: -1600, y: 0, z: 0 },
        capabilities: { ...HUMANOID },
      },
    ],
  });
  let s = sim.initial();
  assert.equal(s.fault, null);
  s = sim.step(s, [{ actor: "robot", heading: 16384 }]);
  assert.equal(s.actors.find((a) => a.id === "robot")?.phase, "preparation");
  s = sim.step(s, [{ actor: "player", heading: 0 }]);
  assert.equal(s.fault, null);
  assert.equal(s.actors.find((a) => a.id === "player")?.phase, "preparation");
  assert.equal(s.actors.find((a) => a.id === "robot")?.phase, "ground");
});

await test("candidate bounds are checked before committing an otherwise clear arc", () => {
  const c = COURSES.find((item) => item.id === "rise-one");
  assert.ok(c);
  const sim = createTraversal({
    boxes: c.boxes.map((b) => ({
      ...b,
      minY: b.minY + 999000,
      maxY: b.maxY + 999000,
    })),
    actors: [
      {
        id: "player",
        position: { ...c.start, y: 999000 },
        capabilities: { ...HUMANOID },
      },
    ],
  });
  let s = sim.initial();
  assert.equal(s.fault, null);
  for (let i = 0; i < 90; i++) {
    s = sim.step(s, i === 0 ? [{ actor: "player", heading: 0 }] : []);
    assert.equal(s.fault, null);
    assert.equal(player(s).phase, "ground");
  }
});

await test("large unsupported ground sweep queries reject before wide products", () => {
  assert.equal(
    groundPath(
      { x: -1000000, y: 0, z: 0 },
      { x: 1000000, y: 0, z: 0 },
      { ...HUMANOID },
      [floor]
    ),
    false
  );
});
