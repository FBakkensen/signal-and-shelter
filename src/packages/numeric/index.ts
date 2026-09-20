/** Integer millimetres, Q24 headings, and checked local arithmetic. See README.md. */
export const NUMERIC_VERSION = 1;
export const TABLE_VERSION = 1;
export const TICKS_PER_SECOND = 60;
export {
  REGION_SIZE,
  REGION_MIN,
  REGION_MAX,
  LOCAL_LIMIT,
  COUNTER_MAX,
  Q24,
  integer,
  divide,
  roundRatio,
  advanceCounter,
  normalizeAxis,
  moveAxis,
  rebaseAxis,
} from "./lib/integer.ts";
export type { RegionAxis } from "./lib/integer.ts";
export {
  HEADING_COUNT,
  direction,
  targetHeading,
  stepMotion,
  projectResidue,
} from "./lib/directions.ts";
export type { Horizontal, MotionStep } from "./lib/directions.ts";
export { TABLE_SHA256 } from "./lib/directions-table.ts";
