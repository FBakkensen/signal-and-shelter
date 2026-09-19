// Throwaway visual studies: three world/UI directions on /?variant=A|B|C.
export type Variant = "A" | "B" | "C";
export const variants: readonly Variant[] = ["A", "B", "C"];
export function parseVariant(value: string | null): Variant {
  return value === "B" || value === "C" ? value : "A";
}
export function cycleVariant(value: Variant, direction: -1 | 1): Variant {
  return variants[(variants.indexOf(value) + direction + 3) % 3] ?? "A";
}
export function variantURL(url: string, variant: Variant): string {
  const next = new URL(url);
  next.searchParams.set("variant", variant);
  return next.href;
}
export const studies = {
  A: {
    name: "Porcelain Expanse",
    subtitle: "A quiet place, impossibly far away.",
    material: "Porcelain crust / suspended mineral haze / hollow arches",
    geometry: "Half-metre voxels + stepped mineral arches",
    ui: "Airy field notes",
    sky: "#bdc8cc",
    ground: "#dedbcc",
    edge: "#888ba0",
    accent: "#87f3e0",
  },
  B: {
    name: "Ember Fold",
    subtitle: "Even here, something feels like home.",
    material: "Fired ceramic / amber vapor / breathing vents",
    geometry: "Half-metre voxels + fine stepped vents",
    ui: "Warm onboard instrument panel",
    sky: "#ad827e",
    ground: "#c58260",
    edge: "#703f55",
    accent: "#ffdb87",
  },
  C: {
    name: "Violet Relay",
    subtitle: "Follow the little lights.",
    material: "Violet plates / charged dust / levitating stones",
    geometry: "Half-metre voxels + block-built monoliths",
    ui: "Minimal visor + contextual signal",
    sky: "#26253f",
    ground: "#756a9e",
    edge: "#3c385a",
    accent: "#b8f99a",
  },
} satisfies Record<
  Variant,
  {
    name: string;
    subtitle: string;
    material: string;
    geometry: string;
    ui: string;
    sky: string;
    ground: string;
    edge: string;
    accent: string;
  }
>;
export function surfaceHeight(x: number, z: number, variant: Variant): number {
  const undulation =
    Math.sin(x * 0.22) * Math.cos(z * 0.19) +
    Math.sin(z * 0.36 + x * 0.12) * 0.45;
  const amplitude = variant === "B" ? 1.15 : variant === "C" ? 1.35 : 1;
  return 1.5 + Math.round((undulation * amplitude) / 0.5) * 0.5;
}
export function boundaryRadius(angle: number): number {
  return 17 + Math.sin(angle * 3) * 2 + Math.cos(angle * 5) * 1.3;
}
