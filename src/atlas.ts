import { exploredBounds } from "./packages/play/exploration.ts";
import * as THREE from "three";
import type { Island } from "./packages/island/index.ts";
import type { Exploration } from "./packages/play/index.ts";
import {
  SIZE,
  SHIP_PARTS,
  resourceParts,
  ventParts,
} from "./packages/island/geometry.ts";
import type { BlockPart } from "./packages/island/geometry.ts";
import type { Position3 } from "./camera.ts";

export interface AtlasPart {
  id: string | null;
  kind: "terrain" | "vent" | "ship" | "deposit";
  x: number;
  z: number;
  y: number;
  width: number;
  depth: number;
  color: string;
}
export interface ScreenPoint {
  x: number;
  y: number;
}
export interface ProjectedPart {
  source: AtlasPart;
  points: ScreenPoint[];
  depth: number;
  color: string;
}
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface AtlasLabel extends Rect {
  text: string;
  anchor: ScreenPoint;
}
export function atlasBlend(zoom: number) {
  const t = Math.max(0, Math.min(1, (zoom - 0.62) / 0.18));
  return t * t * (3 - 2 * t);
}
// Static chart geometry comes from the same block descriptions as visible solids.
export function atlasParts(island: Island): AtlasPart[] {
  const parts: AtlasPart[] = [];
  for (let x = -SIZE / 2; x < SIZE / 2; x += 2) {
    for (let z = -SIZE / 2; z < SIZE / 2; z += 2) {
      const y = island.heightAt(x + 1, z + 1);
      parts.push({
        id: null,
        kind: "terrain",
        x: x + 1,
        z: z + 1,
        y,
        width: 2,
        depth: 2,
        color: y <= 1 ? "#625363" : y <= 2 ? "#a98673" : "#d3b599",
      });
    }
  }
  function add(
    origin: { x: number; z: number },
    blocks: readonly BlockPart[],
    kind: AtlasPart["kind"],
    id: string | null
  ) {
    for (const block of blocks) {
      const x = origin.x + block.position[0],
        z = origin.z + block.position[2];
      parts.push({
        id,
        kind,
        x,
        z,
        y:
          island.heightAt(origin.x, origin.z) +
          block.position[1] +
          block.size[1] / 2,
        width: block.size[0],
        depth: block.size[2],
        color: block.color,
      });
    }
  }
  for (const vent of island.vents) {
    add(vent, ventParts(vent.height), "vent", null);
  }
  add(island.ship, SHIP_PARTS, "ship", "ship");
  for (const resource of island.resources) {
    add(resource, resourceParts(resource), "deposit", resource.id);
  }
  return parts;
}
export function projectPoint(
  point: Position3,
  camera: THREE.Camera,
  width: number,
  height: number
) {
  const p = new THREE.Vector3(point.x, point.y, point.z).project(camera);
  return {
    x: ((p.x + 1) * width) / 2,
    y: ((1 - p.y) * height) / 2,
    depth: p.z,
  };
}
export function projectAtlas(
  parts: readonly AtlasPart[],
  exploration: Exploration,
  camera: THREE.Camera,
  width: number,
  height: number
): ProjectedPart[] {
  const projected: ProjectedPart[] = [];
  for (const part of parts) {
    for (const bounds of exploredBounds(exploration, {
      minX: part.x - part.width / 2,
      maxX: part.x + part.width / 2,
      minZ: part.z - part.depth / 2,
      maxZ: part.z + part.depth / 2,
    })) {
      const points = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].map(([dx = 0, dz = 0]) =>
        projectPoint(
          {
            x: dx < 0 ? bounds.minX : bounds.maxX,
            y: part.y,
            z: dz < 0 ? bounds.minZ : bounds.maxZ,
          },
          camera,
          width,
          height
        )
      );
      if (points.some((p) => p.depth < -1 || p.depth > 1)) {
        continue;
      }
      const depth = projectPoint(part, camera, width, height).depth;
      projected.push({ source: part, points, depth, color: part.color });
    }
  }
  return projected.sort((a, b) => b.depth - a.depth);
}
export function containsPoint(
  points: readonly ScreenPoint[],
  point: ScreenPoint
) {
  let positive = false,
    negative = false;
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    if (!a || !b) {
      continue;
    }
    const cross = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
    positive ||= cross > 0.001;
    negative ||= cross < -0.001;
  }
  return (
    points.length >= 3 && (positive || negative) && !(positive && negative)
  );
}
// Picking follows painter order: foreground terrain/scenery blocks hidden objects.
export function pickAtlas(parts: readonly ProjectedPart[], point: ScreenPoint) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (part && containsPoint(part.points, point)) {
      return part.source.id;
    }
  }
  return null;
}
function overlaps(a: Rect, b: Rect) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
// Selected identity goes first; labels never cover the humanoid, UI or other labels.
export function placeAtlasLabels(
  candidates: readonly { text: string; anchor: ScreenPoint }[],
  width: number,
  height: number,
  obstacles: readonly Rect[]
): AtlasLabel[] {
  const result: AtlasLabel[] = [];
  for (const candidate of candidates) {
    const w = Math.min(220, candidate.text.length * 7 + 18),
      h = 25;
    for (const [dx = 0, dy = 0] of [
      [14, -40],
      [14, 20],
      [-w - 14, -40],
      [-w - 14, 20],
      [14, -72],
      [-w - 14, 52],
    ]) {
      const rect = {
        x: candidate.anchor.x + dx,
        y: candidate.anchor.y + dy,
        width: w,
        height: h,
      };
      if (
        rect.x < 8 ||
        rect.y < 8 ||
        rect.x + w > width - 8 ||
        rect.y + h > height - 8 ||
        [...obstacles, ...result].some((o) => overlaps(o, rect))
      ) {
        continue;
      }
      result.push({ ...candidate, ...rect });
      break;
    }
  }
  return result;
}

export function atlasLabelCandidates(
  projected: readonly ProjectedPart[],
  island: Island,
  selection: string | null
) {
  const objects = [
    { id: "ship", text: "Stranded ship" },
    ...island.resources.map((r) => ({ id: r.id, text: r.name })),
  ];
  objects.sort(
    (a, b) => Number(b.id === selection) - Number(a.id === selection)
  );
  return objects.flatMap((object) => {
    // Anchor to a revealed fragment, never an unseen object's centre.
    const visible = projected.filter((p) => p.source.id === object.id).at(-1);
    if (!visible || visible.points.length === 0) {
      return [];
    }
    const anchor = {
      x:
        visible.points.reduce((sum, p) => sum + p.x, 0) / visible.points.length,
      y:
        visible.points.reduce((sum, p) => sum + p.y, 0) / visible.points.length,
    };
    return [{ text: object.text, anchor }];
  });
}

export function createAtlas(canvas: HTMLCanvasElement, island: Island) {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Atlas canvas unavailable");
  }
  const ctx = context;
  const parts = atlasParts(island);
  let projected: ProjectedPart[] = [];
  function render(
    camera: THREE.Camera,
    exploration: Exploration,
    pose: Position3,
    facing: number,
    selection: string | null,
    blend: number,
    obstacles: readonly Rect[]
  ) {
    canvas.style.opacity = String(blend);
    if (blend === 0) {
      projected = [];
      return;
    }
    const width = canvas.clientWidth,
      height = canvas.clientHeight;
    const ratio = Math.min(devicePixelRatio, 1.5);
    if (
      canvas.width !== Math.round(width * ratio) ||
      canvas.height !== Math.round(height * ratio)
    ) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = "#191c28";
    ctx.fillRect(0, 0, width, height);
    projected = projectAtlas(parts, exploration, camera, width, height);
    for (const part of projected) {
      ctx.beginPath();
      part.points.forEach((p, i) => {
        if (i === 0) {
          ctx.moveTo(p.x, p.y);
        } else {
          ctx.lineTo(p.x, p.y);
        }
      });
      ctx.closePath();
      ctx.fillStyle = part.color;
      ctx.fill();
      ctx.strokeStyle =
        part.source.id !== null && part.source.id === selection
          ? "#ffdf8e"
          : "#12162355";
      ctx.lineWidth =
        part.source.id !== null && part.source.id === selection ? 2 : 0.6;
      ctx.stroke();
    }
    const player = projectPoint(pose, camera, width, height);
    const ahead = projectPoint(
      { x: pose.x - Math.sin(facing), y: pose.y, z: pose.z - Math.cos(facing) },
      camera,
      width,
      height
    );
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(Math.atan2(ahead.y - player.y, ahead.x - player.x));
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-7, 6);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-7, -6);
    ctx.closePath();
    ctx.fillStyle = "#adffdf";
    ctx.fill();
    ctx.strokeStyle = "#183f39";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    const candidates = atlasLabelCandidates(
      projected,
      island,
      selection
    ).filter(
      (o) =>
        o.anchor.x >= 0 &&
        o.anchor.x <= width &&
        o.anchor.y >= 0 &&
        o.anchor.y <= height
    );
    const protectedAreas: Rect[] = [
      ...obstacles,
      { x: player.x - 22, y: player.y - 22, width: 44, height: 44 },
    ];
    for (const part of projected.filter(
      (p) => p.source.id !== null && p.source.id === selection
    )) {
      const xs = part.points.map((p) => p.x),
        ys = part.points.map((p) => p.y);
      protectedAreas.push({
        x: Math.min(...xs) - 3,
        y: Math.min(...ys) - 3,
        width: Math.max(...xs) - Math.min(...xs) + 6,
        height: Math.max(...ys) - Math.min(...ys) + 6,
      });
    }
    const labels = placeAtlasLabels(candidates, width, height, protectedAreas);
    ctx.font = "12px monospace";
    for (const label of labels) {
      ctx.strokeStyle = "#ccb39a88";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(label.anchor.x, label.anchor.y);
      ctx.lineTo(label.x + label.width / 2, label.y + label.height / 2);
      ctx.stroke();
      ctx.fillStyle = "#252331ee";
      ctx.fillRect(label.x, label.y, label.width, label.height);
      ctx.fillStyle = "#f5dfc3";
      ctx.fillText(label.text, label.x + 9, label.y + 17, label.width - 18);
    }
  }
  return {
    render,
    pick: (x: number, y: number) => {
      const rect = canvas.getBoundingClientRect();
      return pickAtlas(projected, { x: x - rect.left, y: y - rect.top });
    },
  };
}
