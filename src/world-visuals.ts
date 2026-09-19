import type { BlockPart } from "./blocks.ts";

export const WORLD_PALETTE = {
  sky: "#ad827e",
  crust: "#c58260",
  rim: "#e9af81",
  strata: "#703f55",
  vent: "#b77554",
  light: "#ffdb87",
} as const;

// Shared by rendering and collision; each tier keeps crisp, finer block edges.
export function ventParts(height: number): BlockPart[] {
  if (!Number.isFinite(height) || height < 1.5 || height > 5) {
    throw new RangeError("Vent height must be between 1.5 and 5 metres");
  }
  const tiers = Math.round(height / 0.5);
  const parts: BlockPart[] = [];
  for (let layer = 0; layer < tiers; layer++) {
    const width = 1.5 - Math.floor((layer / tiers) * 4) * 0.25;
    parts.push({
      name: `Vent_tier_${String(layer)}`,
      position: [0, layer * 0.5 + 0.25, 0],
      size: [width, 0.5, width],
      color: WORLD_PALETTE.vent,
    });
  }
  const top = tiers * 0.5;
  for (const direction of [-1, 1]) {
    parts.push({
      name: `Vent_rim_x_${String(direction)}`,
      position: [direction * 0.5, top + 0.125, 0],
      size: [0.25, 0.25, 1.25],
      color: WORLD_PALETTE.rim,
    });
    parts.push({
      name: `Vent_rim_z_${String(direction)}`,
      position: [0, top + 0.125, direction * 0.5],
      size: [0.75, 0.25, 0.25],
      color: WORLD_PALETTE.rim,
    });
  }
  parts.push({
    name: "Vent_core",
    position: [0, top + 0.025, 0],
    size: [0.75, 0.05, 0.75],
    color: WORLD_PALETTE.light,
  });
  return parts;
}
