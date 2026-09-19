export function summarizeReadingsInternal(readings: readonly number[]) {
  let count = 0;
  let total = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const reading of readings) {
    if (!Number.isFinite(reading)) {
      throw new RangeError("Readings must be finite numbers.");
    }

    count += 1;
    total += reading;
    min = Math.min(min, reading);
    max = Math.max(max, reading);
  }

  if (count === 0) {
    return { count, mean: null, min: null, max: null };
  }

  return { count, mean: total / count, min, max };
}
