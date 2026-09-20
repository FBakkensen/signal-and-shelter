import assert from "node:assert/strict";
import test from "node:test";
import { resolvePrototypeHeading } from "../prototype-input.ts";
await test("prototype host resolves production WASD mapping into recorded headings", () => {
  assert.equal(resolvePrototypeHeading(new Set(["KeyW"]), 0), 49152);
  assert.equal(resolvePrototypeHeading(new Set(["KeyD"]), 0), 0);
  assert.equal(resolvePrototypeHeading(new Set(["KeyW", "KeyD"]), 0), 57344);
  assert.equal(resolvePrototypeHeading(new Set(["KeyW"]), -Math.PI / 2), 0);
  assert.equal(resolvePrototypeHeading(new Set(["KeyW", "KeyS"]), 0), null);
  assert.equal(
    resolvePrototypeHeading(new Set(["Space", "ShiftLeft", "ControlLeft"]), 0),
    null
  );
  assert.equal(resolvePrototypeHeading(new Set(), Math.PI), null);
});
