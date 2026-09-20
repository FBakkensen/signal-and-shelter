import type { Box, Capabilities, Point } from "./types.ts";
interface Fraction {
  n: number;
  d: number;
}
const less = (a: Fraction, b: Fraction) => a.n * b.d < b.n * a.d;
const max = (a: Fraction, b: Fraction) => (less(a, b) ? b : a);
const min = (a: Fraction, b: Fraction) => (less(a, b) ? a : b);
function fraction(n: number, d: number): Fraction {
  return d < 0 ? { n: -n, d: -d } : { n, d };
}
export function body(p: Point, c: Capabilities): Box {
  return {
    minX: p.x - c.width / 2,
    maxX: p.x + c.width / 2,
    minY: p.y,
    maxY: p.y + c.height,
    minZ: p.z - c.width / 2,
    maxZ: p.z + c.width / 2,
  };
}
export function overlaps(a: Box, b: Box): boolean {
  return (
    a.minX < b.maxX &&
    a.maxX > b.minX &&
    a.minY < b.maxY &&
    a.maxY > b.minY &&
    a.minZ < b.maxZ &&
    a.maxZ > b.minZ
  );
}
export function sweep(
  from: Point,
  to: Point,
  c: Capabilities,
  b: Box
): boolean {
  let low: Fraction = { n: 0, d: 1 },
    high: Fraction = { n: 1, d: 1 };
  const axes = [
    [from.x, to.x, b.minX - c.width / 2, b.maxX + c.width / 2],
    [from.y, to.y, b.minY - c.height, b.maxY],
    [from.z, to.z, b.minZ - c.width / 2, b.maxZ + c.width / 2],
  ];
  for (const [start = 0, end = 0, lo = 0, hi = 0] of axes) {
    const delta = end - start;
    if (delta === 0) {
      if (start <= lo || start >= hi) {
        return false;
      }
    } else {
      const a = fraction(lo - start, delta),
        d = fraction(hi - start, delta);
      low = max(low, min(a, d));
      high = min(high, max(a, d));
    }
  }
  return less(low, high);
}
export function clear(
  from: Point,
  to: Point,
  c: Capabilities,
  boxes: readonly Box[]
): boolean {
  return !boxes.some((b) => sweep(from, to, c, b));
}
interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}
function coverage(
  x: number,
  z: number,
  y: number,
  half: number,
  d: number,
  boxes: readonly Box[]
): boolean {
  let gaps: Rect[] = [
    { x0: x - half * d, x1: x + half * d, z0: z - half * d, z1: z + half * d },
  ];
  for (const b of boxes) {
    if (b.maxY !== y) {
      continue;
    }
    const next: Rect[] = [];
    for (const r of gaps) {
      const x0 = Math.max(r.x0, b.minX * d),
        x1 = Math.min(r.x1, b.maxX * d),
        z0 = Math.max(r.z0, b.minZ * d),
        z1 = Math.min(r.z1, b.maxZ * d);
      if (x0 >= x1 || z0 >= z1) {
        next.push(r);
        continue;
      }
      if (r.x0 < x0) {
        next.push({ ...r, x1: x0 });
      }
      if (x1 < r.x1) {
        next.push({ ...r, x0: x1 });
      }
      if (r.z0 < z0) {
        next.push({ x0, x1, z0: r.z0, z1: z0 });
      }
      if (z1 < r.z1) {
        next.push({ x0, x1, z0: z1, z1: r.z1 });
      }
    }
    gaps = next;
    if (gaps.length === 0) {
      return true;
    }
  }
  return false;
}
export function supported(
  p: Point,
  c: Capabilities,
  boxes: readonly Box[]
): boolean {
  return coverage(p.x, p.z, p.y, c.support / 2, 1, boxes);
}
export function groundPath(
  a: Point,
  b: Point,
  c: Capabilities,
  boxes: readonly Box[]
): boolean {
  if (
    Math.abs(b.x - a.x) > 10000 ||
    Math.abs(b.z - a.z) > 10000 ||
    a.y !== b.y ||
    !clear(a, b, c, boxes)
  ) {
    return false;
  }
  const times: Fraction[] = [
    { n: 0, d: 1 },
    { n: 1, d: 1 },
  ];
  for (const solid of boxes) {
    if (solid.maxY !== a.y) {
      continue;
    }
    for (const [start = 0, end = 0, lo = 0, hi = 0] of [
      [a.x, b.x, solid.minX, solid.maxX],
      [a.z, b.z, solid.minZ, solid.maxZ],
    ]) {
      if (start === end) {
        continue;
      }
      for (const edge of [lo, hi]) {
        for (const side of [-c.support / 2, c.support / 2]) {
          const t = fraction(edge - start - side, end - start);
          if (t.n > 0 && t.n < t.d) {
            times.push(t);
          }
        }
      }
    }
  }
  times.sort((u, v) => u.n * v.d - v.n * u.d);
  const at = (t: Fraction) =>
    coverage(
      a.x * t.d + (b.x - a.x) * t.n,
      a.z * t.d + (b.z - a.z) * t.n,
      a.y,
      c.support / 2,
      t.d,
      boxes
    );
  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    if (!t || !at(t)) {
      return false;
    }
    const next = times[i + 1];
    if (next && !at({ n: t.n * next.d + next.n * t.d, d: 2 * t.d * next.d })) {
      return false;
    }
  }
  return true;
}
export function envelope(a: Point, b: Point, c: Capabilities): Box {
  const x = body(a, c),
    y = body(b, c);
  return {
    minX: Math.min(x.minX, y.minX),
    maxX: Math.max(x.maxX, y.maxX),
    minY: Math.min(x.minY, y.minY),
    maxY: Math.max(x.maxY, y.maxY),
    minZ: Math.min(x.minZ, y.minZ),
    maxZ: Math.max(x.maxZ, y.maxZ),
  };
}
