import { BASELINE_AVATAR } from "./avatar.ts";

// Explicit study values: physics is not calculated from rendered mesh geometry.
export const FEET_VARIANTS = [
  {
    name: "A · Current",
    proportions: BASELINE_AVATAR,
    supportMm: 600,
    description: "Original stance · 520 mm visible span",
  },
  {
    name: "B · Narrower",
    proportions: { stance: 0.14, footWidth: 0.16 },
    supportMm: 440,
    description: "Narrower stance · 440 mm visible span",
  },
  {
    name: "C · Compact",
    proportions: { stance: 0.13, footWidth: 0.14 },
    supportMm: 400,
    description: "Compact stance · 400 mm visible span",
  },
];
export function variantIndex(value: string | null): number {
  return value === "B" ? 1 : value === "C" ? 2 : 0;
}
export function supportFitsShelf(
  supportMm: number,
  offsetMm: number,
  shelfMm: number
) {
  return Math.abs(offsetMm) * 2 + supportMm <= shelfMm;
}
