// Throwaway exploration and map presentation rules. These never mutate gameplay.
import type { Island, Point } from "./packages/island/index.ts";
import type { PlayState } from "./packages/play/index.ts";
import type { CameraFrame } from "./camera-prototype-model.ts";
import {
  SHIP_PARTS,
  ventParts,
  resourceParts,
} from "./packages/island/geometry.ts";
import type { BlockPart } from "./packages/island/geometry.ts";
import * as THREE from "three";

export type MapVariant = "A" | "B";
export const MAP_CELL = 2;
export function mapOpacity(zoom: number) {
  const t = Math.max(0, Math.min(1, (zoom - 0.62) / 0.18));
  return t * t * (3 - 2 * t);
}
export class ExplorationStudy {
  private readonly cells = new Set<string>();
  visit(point: Point, paused: boolean) {
    if (paused) {
      return;
    }
    for (
      let x = Math.floor((point.x - 8) / MAP_CELL);
      x <= Math.floor((point.x + 8) / MAP_CELL);
      x++
    ) {
      for (
        let z = Math.floor((point.z - 8) / MAP_CELL);
        z <= Math.floor((point.z + 8) / MAP_CELL);
        z++
      ) {
        if (
          Math.hypot(
            (x + 0.5) * MAP_CELL - point.x,
            (z + 0.5) * MAP_CELL - point.z
          ) <= 8
        ) {
          this.cells.add(`${String(x)},${String(z)}`);
        }
      }
    }
  }
  knows(point: Point) {
    return this.cells.has(
      `${String(Math.floor(point.x / MAP_CELL))},${String(Math.floor(point.z / MAP_CELL))}`
    );
  }
  clear() {
    this.cells.clear();
  }
  get count() {
    return this.cells.size;
  }
}
export function mapMarkers(
  island: Island,
  state: PlayState,
  exploration: ExplorationStudy,
  sample: boolean
) {
  return [
    {
      id: "ship",
      x: island.ship.x,
      z: island.ship.z,
      symbol: "⌂",
      label: "Ship",
      color: "#fff0d5",
    },
    ...island.resources
      .filter(
        (r) => sample || exploration.knows(r) || state.discovered.includes(r.id)
      )
      .map((r) => {
        const known = sample || state.discovered.includes(r.id);
        return {
          id: r.id,
          x: r.x,
          z: r.z,
          symbol: known
            ? { copper: "Cu", iron: "Fe", silica: "Si" }[r.id]
            : "?",
          label: known ? r.name : "Unsurveyed deposit",
          color: known
            ? { copper: "#ffb877", iron: "#c1d1e3", silica: "#d8baff" }[r.id]
            : "#c8b9a4",
        };
      }),
    {
      id: "humanoid",
      x: state.x,
      z: state.z,
      symbol: "↑",
      label: "You",
      color: "#a4f7d7",
    },
  ];
}
export function mapProjector(
  frame: CameraFrame,
  width: number,
  height: number
) {
  const camera = new THREE.PerspectiveCamera(
    frame.fov,
    width / height,
    0.1,
    300
  );
  camera.position.set(frame.position.x, frame.position.y, frame.position.z);
  camera.lookAt(frame.target.x, frame.target.y, frame.target.z);
  camera.updateMatrixWorld();
  return (x: number, y: number, z: number) => {
    const p = new THREE.Vector3(x, y, z).project(camera);
    return {
      x: ((p.x + 1) * width) / 2,
      y: ((1 - p.y) * height) / 2,
      visible: p.z > -1 && p.z < 1,
    };
  };
}
export interface ScreenMarker {
  id: string;
  x: number;
  y: number;
}
export function pickMapMarker(
  markers: readonly ScreenMarker[],
  x: number,
  y: number
) {
  return (
    markers
      .filter((m) => Math.hypot(m.x - x, m.y - y) <= 22)
      .sort(
        (a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y)
      )[0]?.id ?? null
  );
}

export function mapFootprints(island: Island) {
  function place(id: string, origin: Point, parts: readonly BlockPart[]) {
    return parts.map((part) => ({
      id,
      origin,
      minX: origin.x + part.position[0] - part.size[0] / 2,
      maxX: origin.x + part.position[0] + part.size[0] / 2,
      minZ: origin.z + part.position[2] - part.size[2] / 2,
      maxZ: origin.z + part.position[2] + part.size[2] / 2,
      y: island.heightAt(origin.x, origin.z) + 0.03,
      color: part.color,
    }));
  }
  return [
    ...island.vents.flatMap((v, i) =>
      place(`vent-${String(i)}`, v, ventParts(v.height))
    ),
    ...place("ship", island.ship, SHIP_PARTS),
    ...island.resources.flatMap((r) => place(r.id, r, resourceParts(r))),
  ];
}
export interface ScreenFootprint {
  id: string;
  points: readonly { x: number; y: number }[];
}
export function pickMapFootprint(
  footprints: readonly ScreenFootprint[],
  x: number,
  y: number
) {
  for (const footprint of [...footprints].reverse()) {
    let inside = false;
    const points = footprint.points;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[i],
        b = points[j];
      if (
        a &&
        b &&
        a.y > y !== b.y > y &&
        x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
      ) {
        inside = !inside;
      }
    }
    if (inside) {
      return footprint.id;
    }
  }
  return null;
}
