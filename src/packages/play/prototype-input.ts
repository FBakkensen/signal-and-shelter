// Temporary experiment seam: reuse production key interpretation.
import { inputFromKeys } from "./lib/controls.ts";
export function resolvePrototypeHeading(
  keys: ReadonlySet<string>,
  heading: number
): number | null {
  const input = inputFromKeys(keys),
    forward = Number(input.forward) - Number(input.back),
    right = Number(input.right) - Number(input.left);
  return forward === 0 && right === 0
    ? null
    : ((Math.floor(
        (Math.atan2(
          -forward * Math.cos(heading) - right * Math.sin(heading),
          right * Math.cos(heading) - forward * Math.sin(heading)
        ) *
          65536) /
          (2 * Math.PI) +
          0.5
      ) %
        65536) +
        65536) %
        65536;
}
