import { COUNTER_MAX, integer } from "./lib/integer.ts";
export const RANDOM_VERSION = 1;
export const SEED_VERSION = 1;
const WORD_RANGE = 2 ** 32;
const encoder = new TextEncoder();
export interface RandomKey {
  readonly seed: string;
  readonly purpose: string;
  readonly entity: string;
}
export interface RandomState extends RandomKey {
  readonly version: number;
  readonly counter: number;
}
/** Matches the existing case-sensitive, trimmed 80-UTF-16-unit seed convention. */
export function normalizeSeed(value: string): string {
  return value
    .trim()
    .slice(0, 80)
    .replace(/[\uD800-\uDFFF]/gu, "\uFFFD");
}
function stringBytes(value: string): Uint8Array {
  if (/[\uD800-\uDFFF]/u.test(value)) {
    throw new RangeError("Random fields require well-formed Unicode");
  }
  const bytes = encoder.encode(value);
  integer(bytes.length, 0, WORD_RANGE - 1);
  return bytes;
}
/** v1: seed, purpose, entity UTF-8 strings, each prefixed by u32 LE byte length; u48 LE counter. */
export function encodeRandomKey(key: RandomKey, counter: number): Uint8Array {
  integer(counter, 0, COUNTER_MAX);
  if (!key.seed || normalizeSeed(key.seed) !== key.seed) {
    throw new RangeError("Seed must be resolved and canonical");
  }
  const fields = [key.seed, key.purpose, key.entity].map(stringBytes);
  const result = new Uint8Array(
    fields.reduce((length, field) => length + 4 + field.length, 6)
  );
  const view = new DataView(result.buffer);
  let offset = 0;
  for (const field of fields) {
    view.setUint32(offset, field.length, true);
    result.set(field, offset + 4);
    offset += 4 + field.length;
  }
  view.setUint32(offset, counter % WORD_RANGE, true);
  view.setUint16(offset + 4, Math.floor(counter / WORD_RANGE), true);
  return result;
}
export function randomWord(key: RandomKey, counter: number): number {
  let hash = 2_166_136_261;
  for (const byte of encodeRandomKey(key, counter)) {
    hash = Math.imul(hash ^ byte, 16_777_619) >>> 0;
  }
  hash = Math.imul(hash ^ (hash >>> 13), 1_274_126_177);
  return (hash ^ (hash >>> 16)) >>> 0;
}
export function createRandomStream(key: RandomKey, counter = 0): RandomState {
  encodeRandomKey(key, counter);
  return {
    seed: key.seed,
    purpose: key.purpose,
    entity: key.entity,
    version: RANDOM_VERSION,
    counter,
  };
}
/** Immutable result includes every rejected draw. Counter MAX is an exhausted stream. */
export function drawInteger(
  state: RandomState,
  min: number,
  max: number
): { value: number; state: RandomState } {
  if (state.version !== RANDOM_VERSION) {
    throw new RangeError("Unsupported random version");
  }
  integer(min, -(2 ** 31), WORD_RANGE - 1);
  integer(max, min, WORD_RANGE - 1);
  const width = integer(max - min + 1, 1, WORD_RANGE);
  const limit = WORD_RANGE - (WORD_RANGE % width);
  let counter = integer(state.counter, 0, COUNTER_MAX);
  while (counter < COUNTER_MAX) {
    const word = randomWord(state, counter);
    counter++;
    if (word < limit) {
      return { value: min + (word % width), state: { ...state, counter } };
    }
  }
  throw new RangeError("Random stream exhausted");
}
