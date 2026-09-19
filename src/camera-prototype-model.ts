// Throwaway A/B camera study. The production play controller still owns actions.
import { GameApplication } from "./packages/play/index.ts";
import type { Island } from "./packages/island/index.ts";
import type { HeightSampler } from "./packages/island/index.ts";
import type { Obstacle } from "./packages/island/geometry.ts";

export type CameraVariant = "A" | "B";
export interface Position3 {
  x: number;
  y: number;
  z: number;
}
export interface CameraFrame {
  position: Position3;
  target: Position3;
  fov: number;
  facing: number;
}
export function readVariant(value: string | null): CameraVariant {
  return value === "B" ? "B" : "A";
}
export function scrollZoom(zoom: number, delta: number, mode = 0) {
  if (!Number.isFinite(delta)) {
    return zoom;
  }
  const pixels = delta * (mode === 1 ? 16 : mode === 2 ? 600 : 1);
  return Math.max(0, Math.min(1, zoom + pixels * 0.0007));
}
export function cameraFrame(
  variant: CameraVariant,
  zoom: number,
  yaw: number,
  facing: number,
  anchor: Position3,
  heightAt: HeightSampler,
  solids: readonly Obstacle[],
  aspect = 1
) {
  const t = Math.max(0, Math.min(1, zoom));
  const requestedDistance = 3.5 * (70 / 3.5) ** t;
  const elevation =
    ((variant === "A" ? 50 + 18 * t : 12 + 56 * t ** 0.85) * Math.PI) / 180;
  const shoulder = variant === "B" ? 0.65 * (1 - t) * Math.min(1, aspect) : 0;
  const target = {
    x: anchor.x + Math.cos(yaw) * shoulder,
    y: anchor.y - 0.35,
    z: anchor.z - Math.sin(yaw) * shoulder,
  };
  const direction = {
    x: Math.sin(yaw) * Math.cos(elevation),
    y: Math.sin(elevation),
    z: Math.cos(yaw) * Math.cos(elevation),
  };
  const at = (distance: number) => ({
    x: target.x + direction.x * distance,
    y: target.y + direction.y * distance,
    z: target.z + direction.z * distance,
  });
  // Conservative sampled boom, including camera clearance around small voxel parts.
  // Deliberately no trailing lag: input and follow feel are easier to compare.
  const radius = 0.28;
  let distance = requestedDistance;
  for (let d = 0; d <= requestedDistance; d += 0.1) {
    const p = at(d);
    const terrainHit = [-radius, 0, radius].some((dx) =>
      [-radius, 0, radius].some(
        (dz) => heightAt(p.x + dx, p.z + dz) >= p.y - radius
      )
    );
    const solidHit = solids.some(
      (o) =>
        p.x >= o.minX - radius &&
        p.x <= o.maxX + radius &&
        p.y >= o.minY - radius &&
        p.y <= o.maxY + radius &&
        p.z >= o.minZ - radius &&
        p.z <= o.maxZ + radius
    );
    if (terrainHit || solidHit) {
      distance = Math.max(0, d - 0.1);
      break;
    }
  }
  return {
    position: at(distance),
    target,
    fov: 55,
    facing,
    requestedDistance,
    distance,
    elevation: (elevation * 180) / Math.PI,
    occluded: distance < requestedDistance,
  };
}
export class CameraStudy {
  readonly app: GameApplication;
  variant: CameraVariant;
  zoom = 0.35;
  facing = 0;
  constructor(island: Island, variant: CameraVariant) {
    this.app = new GameApplication(island);
    this.variant = variant;
    this.app.start(island, true);
  }
  key(code: string, down: boolean) {
    // Temporary comparison bindings: arrows switch variants; Q/R orbit.
    const mapped =
      code === "KeyQ" ? "ArrowLeft" : code === "KeyR" ? "ArrowRight" : code;
    if (
      ![
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
        "Space",
        "ControlLeft",
        "ControlRight",
        "ShiftLeft",
        "ShiftRight",
        "KeyQ",
        "KeyR",
      ].includes(code)
    ) {
      return false;
    }
    if (down) {
      return this.app.press(mapped);
    }
    this.app.release(mapped);
    return true;
  }
  tick(seconds: number) {
    const before = this.app.state;
    this.app.tick(seconds);
    const dx = this.app.state.x - before.x;
    const dz = this.app.state.z - before.z;
    if (Math.hypot(dx, dz) > 0.00001) {
      this.facing = Math.atan2(-dx, -dz);
    }
  }
  switchVariant() {
    this.variant = this.variant === "A" ? "B" : "A";
  }
  scroll(delta: number, mode = 0) {
    this.zoom = scrollZoom(this.zoom, delta, mode);
  }
  restart() {
    this.app.restart();
    this.facing = 0;
  }
  frame(aspect = 1) {
    return cameraFrame(
      this.variant,
      this.zoom,
      this.app.state.yaw,
      this.facing,
      this.app.viewPosition,
      this.app.island.heightAt,
      this.app.island.solids,
      aspect
    );
  }
}
