// Metres, Y-up. A single source for visible block bounds and solid geometry.
export interface BlockPart {
  name: string;
  position: readonly [number, number, number];
  size: readonly [number, number, number];
  color: string;
  emission?: number;
}
