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

// Camera framing depends only on player input and the humanoid anchor, never scenery.
export class ThirdPersonCamera {
  zoom = 0.35;
  scroll(delta: number, mode = 0) {
    if (!Number.isFinite(delta)) {
      return;
    }
    const pixels = delta * (mode === 1 ? 16 : mode === 2 ? 600 : 1);
    this.zoom = Math.max(0, Math.min(1, this.zoom + pixels * 0.0007));
  }
  frame(
    anchor: Position3,
    heading: number,
    facing: number,
    aspect: number
  ): CameraFrame {
    const t = this.zoom;
    const distance = 3.5 * 20 ** t;
    const elevation = ((12 + 56 * t ** 0.85) * Math.PI) / 180;
    const shoulder = 0.65 * (1 - t) * Math.min(1, Math.max(0, aspect));
    const target = {
      x: anchor.x + Math.cos(heading) * shoulder,
      y: anchor.y - 0.35,
      z: anchor.z - Math.sin(heading) * shoulder,
    };
    return {
      target,
      position: {
        x: target.x + Math.sin(heading) * Math.cos(elevation) * distance,
        y: target.y + Math.sin(elevation) * distance,
        z: target.z + Math.cos(heading) * Math.cos(elevation) * distance,
      },
      fov: 55,
      facing,
    };
  }
}
