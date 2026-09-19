import assert from "node:assert/strict";
import test from "node:test";

import { summarizeReadings } from "../index";

await test("summarizes readings through the package entry point", () => {
  assert.deepEqual(summarizeReadings([2, 4, 9]), {
    count: 3,
    mean: 5,
    min: 2,
    max: 9,
  });
});

await test("represents an empty sample with null statistics", () => {
  assert.deepEqual(summarizeReadings([]), {
    count: 0,
    mean: null,
    min: null,
    max: null,
  });
});

await test("rejects non-finite readings", () => {
  assert.throws(() => summarizeReadings([1, Number.NaN]), {
    name: "RangeError",
    message: "Readings must be finite numbers.",
  });
});
