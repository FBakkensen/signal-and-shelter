import assert from "node:assert/strict";
import { test } from "node:test";
import { COUNTER_MAX } from "../index.ts";
import {
  createRandomStream,
  drawInteger,
  encodeRandomKey,
  normalizeSeed,
  randomWord,
} from "../random.ts";
const key = {
  seed: "signal-and-shelter",
  purpose: "terrain",
  entity: "cell:-1,0,2",
};

void test("seed normalization retains case, trims, bounds UTF-16 and repairs split/lone surrogates", () => {
  assert.equal(normalizeSeed("  Hi 🌍  "), "Hi 🌍");
  assert.equal(normalizeSeed("x".repeat(79) + "🌍"), "x".repeat(79) + "�");
  assert.equal(normalizeSeed("\ud800"), "�");
  assert.equal(normalizeSeed("  "), "");
  assert.throws(() => createRandomStream({ ...key, seed: "" }), RangeError);
  assert.throws(
    () => createRandomStream({ ...key, seed: " seed " }),
    RangeError
  );
  assert.throws(
    () => createRandomStream({ ...key, purpose: "\ud800" }),
    RangeError
  );
});

void test("encoding and hash golden vectors include UTF-8, little-endian lengths and wide counters", () => {
  const unicode = { seed: "é🌍", purpose: "p", entity: "" };
  assert.equal(
    Buffer.from(encodeRandomKey(unicode, 4294967297)).toString("hex"),
    "06000000c3a9f09f8c8d010000007000000000010000000100"
  );
  assert.equal(randomWord(unicode, 4294967297), 1496752612);
  for (const [counter, expected] of [
    [0, 4043637905],
    [1, 1652397872],
    [4294967296, 1208673779],
    [COUNTER_MAX, 3409356750],
  ] as const) {
    assert.equal(randomWord(key, counter), expected);
    // Independent wide-integer reference for the specified modular operations.
    let hash = 2166136261n;
    for (const byte of encodeRandomKey(key, counter)) {
      hash = ((hash ^ BigInt(byte)) * 16777619n) & 0xffffffffn;
    }
    hash = ((hash ^ (hash >> 13n)) * 1274126177n) & 0xffffffffn;
    assert.equal(randomWord(key, counter), Number(hash ^ (hash >> 16n)));
  }
  assert.notDeepEqual(
    encodeRandomKey({ ...key, purpose: "ab", entity: "c" }, 0),
    encodeRandomKey({ ...key, purpose: "a", entity: "bc" }, 0)
  );
  assert.throws(() => randomWord(key, COUNTER_MAX + 1), RangeError);
  assert.throws(() => randomWord(key, -1), RangeError);
});

void test("rejection sampling consumes rejected draws and produces immutable replayable state", () => {
  const initial = createRandomStream(key);
  assert.throws(
    () => drawInteger({ ...initial, version: 2 }, 0, 1),
    RangeError
  );
  const draw = drawInteger(initial, 0, 2147483648);
  assert.equal(draw.value, 1652397872);
  assert.equal(draw.state.counter, 2);
  assert.equal(initial.counter, 0);
  assert.deepEqual(drawInteger(initial, 0, 2147483648), draw);
  assert.equal(drawInteger(initial, 0, 4294967295).value, 4043637905);
  assert.equal(drawInteger(initial, -2147483648, 2147483647).value, 1896154257);
  assert.equal(drawInteger(initial, 7, 7).value, 7);
  assert.equal(drawInteger(initial, 7, 7).state.counter, 1);
  assert.throws(() => drawInteger(initial, 2, 1), RangeError);
  assert.throws(() => drawInteger(initial, -1, 4294967295), RangeError);
  assert.throws(() => drawInteger(initial, 0, 0.5), RangeError);
  assert.throws(
    () => drawInteger(createRandomStream(key, COUNTER_MAX), 0, 1),
    RangeError
  );
  const last = createRandomStream(key, COUNTER_MAX - 1);
  assert.equal(drawInteger(last, 0, 4294967295).state.counter, COUNTER_MAX);
  assert.equal(last.counter, COUNTER_MAX - 1);
  assert.throws(() => drawInteger(last, 0, 2147483648), RangeError);
  assert.equal(last.counter, COUNTER_MAX - 1);
});

void test("named entity streams and coordinate queries do not depend on unrelated consumption/order", () => {
  const state = createRandomStream(key);
  const other = createRandomStream({
    ...key,
    purpose: "visual",
    entity: "actor:2",
  });
  const expected = drawInteger(state, 0, 100);
  let consumed = other;
  for (let i = 0; i < 100; i++) {
    consumed = drawInteger(consumed, 0, 100).state;
  }
  assert.deepEqual(drawInteger(state, 0, 100), expected);
  assert.notEqual(
    randomWord(key, 0),
    randomWord({ ...key, entity: "actor:2" }, 0)
  );
  const entities = ["cell:-1,0,2", "cell:0,0,2", "cell:1,0,2"];
  const forward = entities.map((entity) => randomWord({ ...key, entity }, 0));
  const backward = entities
    .toReversed()
    .map((entity) => randomWord({ ...key, entity }, 0))
    .reverse();
  assert.deepEqual(forward, backward);
});
