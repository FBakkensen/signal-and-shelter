import assert from "node:assert/strict";
import { test } from "node:test";
import {
  advanceCounter,
  COUNTER_MAX,
  direction,
  divide,
  HEADING_COUNT,
  integer,
  LOCAL_LIMIT,
  moveAxis,
  normalizeAxis,
  projectResidue,
  Q24,
  rebaseAxis,
  REGION_MAX,
  REGION_MIN,
  roundRatio,
  stepMotion,
  TABLE_SHA256,
  targetHeading,
} from "../index.ts";
import { generateQuarterTable, tableChecksum } from "../generate.ts";
import {
  HUMANOID_CAPABILITIES,
  validateCapabilities,
} from "../capabilities.ts";

function floorReference(n: bigint, d: bigint): bigint {
  return n / d - (n % d < 0n ? 1n : 0n);
}

void test("signed quotient and half-up rounding match exact arithmetic at safe-number extrema", () => {
  for (const n of [
    -Number.MAX_SAFE_INTEGER,
    -Q24 - 1,
    -Q24 / 2,
    -9,
    -1,
    0,
    1,
    9,
    Q24 / 2,
    Q24 + 1,
    Number.MAX_SAFE_INTEGER,
  ]) {
    for (const d of [1, 2, 3, 7, 16_000, Q24, Number.MAX_SAFE_INTEGER]) {
      const q = floorReference(BigInt(n), BigInt(d));
      assert.deepEqual(divide(n, d), {
        quotient: Number(q),
        remainder: Number(BigInt(n) - q * BigInt(d)),
      });
      assert.equal(
        roundRatio(n, d),
        Number(floorReference(2n * BigInt(n) + BigInt(d), 2n * BigInt(d)))
      );
    }
  }
  for (const bad of [NaN, Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => integer(bad), RangeError);
  }
  assert.throws(() => divide(1, 0), RangeError);
  assert.throws(() => divide(1, -1), RangeError);
  assert.equal(advanceCounter(COUNTER_MAX - 1), COUNTER_MAX);
  assert.throws(() => advanceCounter(COUNTER_MAX), RangeError);
  assert.throws(() => advanceCounter(-1), RangeError);
});

void test("region normalization and rebasing preserve position across negative crossings and extrema", () => {
  for (const region of [REGION_MIN + 100, -1, 0, 1, REGION_MAX - 100]) {
    for (const local of [
      -1_000_000, -16_001, -16_000, -1, 0, 15_999, 16_000, 1_000_000,
    ]) {
      const axis = normalizeAxis(region, local);
      assert.equal(
        BigInt(axis.region) * 16000n + BigInt(axis.local),
        BigInt(region) * 16000n + BigInt(local)
      );
      assert.ok(axis.local >= 0 && axis.local < 16000);
    }
  }
  assert.deepEqual(moveAxis({ region: 0, local: 0 }, -1), {
    region: -1,
    local: 15999,
  });
  assert.equal(
    rebaseAxis(
      { region: REGION_MAX, local: 10 },
      { region: REGION_MAX - 1, local: 15990 }
    ),
    20
  );
  assert.equal(
    rebaseAxis({ region: 62, local: 8000 }, { region: 0, local: 0 }),
    LOCAL_LIMIT
  );
  assert.throws(
    () => rebaseAxis({ region: 62, local: 8001 }, { region: 0, local: 0 }),
    RangeError
  );
  assert.throws(
    () =>
      rebaseAxis(
        { region: REGION_MAX, local: 0 },
        { region: REGION_MIN, local: 0 }
      ),
    RangeError
  );
  assert.throws(() => normalizeAxis(REGION_MIN, -1), RangeError);
  assert.throws(() => normalizeAxis(REGION_MAX, 16000), RangeError);
  assert.throws(() => moveAxis({ region: 0, local: 16000 }, 1), RangeError);
  assert.throws(
    () => moveAxis({ region: 0, local: 0 }, LOCAL_LIMIT + 1),
    RangeError
  );
});

void test("reproducible table agrees at two precisions and every heading obeys inward norm and symmetry", () => {
  const table = generateQuarterTable();
  assert.deepEqual(generateQuarterTable(60), table);
  assert.equal(tableChecksum(table), TABLE_SHA256);
  assert.equal(
    TABLE_SHA256,
    "51536c7e41109875da68c138322b4b6692ba98509db8d5024b3708b94cd40b80"
  );
  assert.equal(table.length, 16385);
  assert.deepEqual(direction(8192), { x: 11863283, z: 11863283 });
  const s = BigInt(Q24);
  for (let h = 0; h < HEADING_COUNT; h++) {
    const v = direction(h);
    const opposite = direction((h + 32768) % HEADING_COUNT);
    assert.equal(v.x + opposite.x, 0);
    assert.equal(v.z + opposite.z, 0);
    const norm = BigInt(v.x) ** 2n + BigInt(v.z) ** 2n;
    assert.ok(norm <= s * s);
    assert.ok((s * s + 2n - norm) ** 2n < 8n * s * s);
    if (h <= 16384) {
      assert.equal(v.z, table[h]);
    }
  }
  for (const h of [-1, 65536, 0.1, NaN]) {
    assert.throws(() => direction(h), RangeError);
  }
});

void test("target heading chooses maximum exact dot product and lowest heading on ties", () => {
  assert.equal(targetHeading(0, 0), null);
  for (const [x, z] of [
    [1, 0],
    [0, -1],
    [-1, 1],
    [999999, 456789],
    [-1000000, -1],
    [3, 7],
  ]) {
    assert.notEqual(x, undefined);
    assert.notEqual(z, undefined);
    if (x === undefined || z === undefined) {
      throw new Error("Fixture");
    }
    const chosen = targetHeading(x, z);
    assert.notEqual(chosen, null);
    if (chosen === null) {
      throw new Error("Expected heading");
    }
    const selected = direction(chosen);
    const score =
      BigInt(x) * BigInt(selected.x) + BigInt(z) * BigInt(selected.z);
    for (let h = 0; h < HEADING_COUNT; h++) {
      const v = direction(h);
      const other: bigint = BigInt(x) * BigInt(v.x) + BigInt(z) * BigInt(v.z);
      assert.ok(other <= score);
      if (other === score) {
        assert.ok(chosen <= h);
      }
    }
  }
  assert.throws(() => targetHeading(LOCAL_LIMIT + 1, 0), RangeError);
});

void test("turns, stops and reversals preserve exact accumulated world-axis displacement", () => {
  let residue = { x: 0, z: 0 };
  let px = 0n,
    pz = 0n,
    nx = 0n,
    nz = 0n;
  for (let tick = 0; tick < 100000; tick++) {
    const h = tick % 11 === 0 ? null : (tick * 7919) % HEADING_COUNT;
    const vector = h === null ? { x: 0, z: 0 } : direction(h);
    const next = stepMotion(h, 70, residue);
    px += BigInt(next.displacement.x);
    pz += BigInt(next.displacement.z);
    nx += BigInt(vector.x) * 70n;
    nz += BigInt(vector.z) * 70n;
    residue = next.residue;
    assert.equal(px * BigInt(Q24) + BigInt(residue.x), nx);
    assert.equal(pz * BigInt(Q24) + BigInt(residue.z), nz);
    assert.ok(residue.x >= -Q24 / 2 && residue.x < Q24 / 2);
    assert.ok(residue.z >= -Q24 / 2 && residue.z < Q24 / 2);
  }
  const start = { x: -Q24 / 2, z: Q24 / 2 - 1 };
  assert.deepEqual(stepMotion(null, 70, start), {
    displacement: { x: 0, z: 0 },
    residue: start,
  });
  const forward = stepMotion(8192, 70, { x: 0, z: 0 });
  const backward = stepMotion(40960, 70, forward.residue);
  assert.equal(forward.displacement.x + backward.displacement.x, 0);
  assert.deepEqual(backward.residue, { x: 0, z: 0 });
  assert.deepEqual(projectResidue(start, { x: true, z: false }), {
    x: 0,
    z: start.z,
  });
  assert.deepEqual(projectResidue(start, { x: false, z: true }), {
    x: start.x,
    z: 0,
  });
  assert.throws(() => stepMotion(0, 0.5, start), RangeError);
  assert.throws(() => stepMotion(0, 70, { x: Q24 / 2, z: 0 }), RangeError);
  assert.equal(
    stepMotion(0, LOCAL_LIMIT, { x: 0, z: 0 }).displacement.x,
    LOCAL_LIMIT
  );
});

void test("individual capabilities retain canonical units and accepted humanoid values", () => {
  assert.deepEqual(
    validateCapabilities(HUMANOID_CAPABILITIES),
    HUMANOID_CAPABILITIES
  );
  assert.equal(HUMANOID_CAPABILITIES.walkMmPerTick, 70);
  assert.equal(HUMANOID_CAPABILITIES.preparationTicks, 7);
  assert.equal(HUMANOID_CAPABILITIES.recoveryTicks, 7);
  assert.equal(
    validateCapabilities({
      ...HUMANOID_CAPABILITIES,
      canJump: false,
      walkMmPerTick: 35,
    }).walkMmPerTick,
    35
  );
  for (const key of [
    "walkMmPerTick",
    "bodyHeightMm",
    "preparationTicks",
    "accelerationMmPerTickSquared",
  ] as const) {
    assert.throws(
      () => validateCapabilities({ ...HUMANOID_CAPABILITIES, [key]: 0.5 }),
      RangeError
    );
  }
  assert.throws(
    () => validateCapabilities({ ...HUMANOID_CAPABILITIES, bodyWidthMm: 0 }),
    RangeError
  );
});
