import { summarizeReadingsInternal } from "./lib/impl";

export interface ReadingSummary {
  readonly count: number;
  readonly mean: number | null;
  readonly min: number | null;
  readonly max: number | null;
}

export function summarizeReadings(readings: readonly number[]): ReadingSummary {
  return summarizeReadingsInternal(readings);
}
