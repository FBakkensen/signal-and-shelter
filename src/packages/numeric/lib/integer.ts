export const REGION_SIZE = 16_000;
export const LOCAL_LIMIT = 1_000_000;
export const COUNTER_MAX = 2 ** 48 - 1;
export const Q24 = 2 ** 24;
export const REGION_MIN = -(2 ** 31);
export const REGION_MAX = 2 ** 31 - 1;

export function integer(
  value: number,
  min = -Number.MAX_SAFE_INTEGER,
  max = Number.MAX_SAFE_INTEGER
): number {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new RangeError(
      `Integer outside [${String(min)}, ${String(max)}]: ${String(value)}`
    );
  }
  return value === 0 ? 0 : value;
}

/** Floor quotient and nonnegative remainder; avoids rounded Number division at extrema. */
export function divide(
  numerator: number,
  denominator: number
): { quotient: number; remainder: number } {
  integer(numerator);
  integer(denominator, 1);
  const signedRemainder = numerator % denominator;
  const quotient = (numerator - signedRemainder) / denominator;
  return signedRemainder < 0
    ? { quotient: quotient - 1, remainder: signedRemainder + denominator }
    : {
        quotient: quotient === 0 ? 0 : quotient,
        remainder: signedRemainder === 0 ? 0 : signedRemainder,
      };
}

/** Nearest integer, with exact half ties toward positive infinity. */
export function roundRatio(numerator: number, denominator: number): number {
  const { quotient, remainder } = divide(numerator, denominator);
  return quotient + (remainder >= denominator - remainder ? 1 : 0);
}

export function advanceCounter(value: number): number {
  return integer(value, 0, COUNTER_MAX - 1) + 1;
}

export interface RegionAxis {
  readonly region: number;
  readonly local: number;
}
export function normalizeAxis(region: number, local: number): RegionAxis {
  integer(region, REGION_MIN, REGION_MAX);
  const { quotient, remainder } = divide(local, REGION_SIZE);
  return {
    region: integer(region + quotient, REGION_MIN, REGION_MAX),
    local: remainder,
  };
}
export function checkAxis(axis: RegionAxis): void {
  integer(axis.region, REGION_MIN, REGION_MAX);
  integer(axis.local, 0, REGION_SIZE - 1);
}
export function moveAxis(axis: RegionAxis, displacement: number): RegionAxis {
  checkAxis(axis);
  integer(displacement, -LOCAL_LIMIT, LOCAL_LIMIT);
  return normalizeAxis(axis.region, axis.local + displacement);
}
/** Relative millimetres; global coordinates are never flattened. */
export function rebaseAxis(axis: RegionAxis, origin: RegionAxis): number {
  checkAxis(axis);
  checkAxis(origin);
  const regions = axis.region - origin.region;
  integer(regions, -64, 64);
  return integer(
    regions * REGION_SIZE + axis.local - origin.local,
    -LOCAL_LIMIT,
    LOCAL_LIMIT
  );
}
