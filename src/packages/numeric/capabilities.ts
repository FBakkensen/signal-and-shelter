import { COUNTER_MAX, integer, LOCAL_LIMIT } from "./lib/integer.ts";
export interface MovementCapabilities {
  readonly supportWidthMm: number;
  readonly supportDepthMm: number;
  readonly bodyWidthMm: number;
  readonly bodyDepthMm: number;
  readonly bodyHeightMm: number;
  readonly walkMmPerTick: number;
  readonly accelerationMmPerTickSquared: number;
  readonly elevationMm: number;
  readonly apexMm: number;
  readonly preparationTicks: number;
  readonly recoveryTicks: number;
  readonly alignmentMm: number;
  readonly canJump: boolean;
}
export const HUMANOID_CAPABILITIES: MovementCapabilities = Object.freeze({
  supportWidthMm: 440,
  supportDepthMm: 440,
  bodyWidthMm: 600,
  bodyDepthMm: 600,
  bodyHeightMm: 1800,
  walkMmPerTick: 70,
  accelerationMmPerTickSquared: 7,
  elevationMm: 1000,
  apexMm: 1250,
  preparationTicks: 7,
  recoveryTicks: 7,
  alignmentMm: 250,
  canJump: true,
});
/** Validates numeric units only; physics must validate support/clearance and feasibility. */
export function validateCapabilities(
  value: MovementCapabilities
): MovementCapabilities {
  for (const dimension of [
    value.supportWidthMm,
    value.supportDepthMm,
    value.bodyWidthMm,
    value.bodyDepthMm,
    value.bodyHeightMm,
  ]) {
    integer(dimension, 1, LOCAL_LIMIT);
  }
  integer(value.walkMmPerTick, 0, LOCAL_LIMIT);
  integer(value.accelerationMmPerTickSquared, 1, LOCAL_LIMIT);
  integer(value.elevationMm, 0, LOCAL_LIMIT);
  integer(value.apexMm, 0, LOCAL_LIMIT);
  integer(value.alignmentMm, 0, LOCAL_LIMIT);
  integer(value.preparationTicks, 0, COUNTER_MAX);
  integer(value.recoveryTicks, 0, COUNTER_MAX);
  if (typeof value.canJump !== "boolean") {
    throw new TypeError("canJump must be boolean");
  }
  return Object.freeze({ ...value });
}
