// Animation frames and the hidden-tab timer share one clock, so neither can
// double-count time. Browser/OS suspension beyond two seconds is not replayed.
export function createSimulationClock(advance: (seconds: number) => void) {
  let previous: number | undefined;
  return (now: number) => {
    if (!Number.isFinite(now)) {
      return;
    }
    if (previous === undefined) {
      previous = now;
      return;
    }
    if (now < previous) {
      return;
    }
    let elapsed = Math.min((now - previous) / 1000, 2);
    previous = now;
    while (elapsed > 1e-9) {
      const slice = Math.min(elapsed, 0.05);
      advance(slice);
      elapsed -= slice;
    }
  };
}
