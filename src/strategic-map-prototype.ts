// Canvas chart uses exactly the active 3D camera: zoom never changes on transition.
import { HAZE_LEVEL } from "./packages/island/geometry.ts";
import type { Island } from "./packages/island/index.ts";
import type { PlayState } from "./packages/play/index.ts";
import type { CameraFrame } from "./camera-prototype-model.ts";
import {
  ExplorationStudy,
  mapMarkers,
  mapOpacity,
  mapProjector,
  pickMapMarker,
  MAP_CELL,
} from "./strategic-map-prototype-model.ts";
import type {
  MapVariant,
  ScreenMarker,
} from "./strategic-map-prototype-model.ts";

export function createStrategicMap(canvas: HTMLCanvasElement, island: Island) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Map canvas unavailable");
  }
  const exploration = new ExplorationStudy();
  const tiles: { x: number; z: number; h: number }[] = [];
  for (let x = -48; x < 48; x += MAP_CELL) {
    for (let z = -48; z < 48; z += MAP_CELL) {
      const h = island.heightAt(x + 1, z + 1);
      if (h > HAZE_LEVEL) {
        tiles.push({ x, z, h });
      }
    }
  }
  let markers: ScreenMarker[] = [];
  let opacity = 0;
  return {
    exploration,
    pick: (x: number, y: number) =>
      opacity >= 0.5 ? pickMapMarker(markers, x, y) : null,
    render(
      state: PlayState,
      frame: CameraFrame,
      zoom: number,
      variant: MapVariant,
      sample: boolean,
      selected: string | null
    ) {
      exploration.visit(state, state.paused);
      opacity = mapOpacity(zoom);
      canvas.style.opacity = String(opacity);
      if (opacity <= 0) {
        return;
      }
      const width = innerWidth,
        height = innerHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      ctx.fillStyle = variant === "A" ? "#302b32" : "#e8d4b9";
      ctx.fillRect(0, 0, width, height);
      const project = mapProjector(frame, width, height);
      const sorted = [...tiles].sort(
        (a, b) =>
          Math.hypot(b.x - frame.position.x, b.z - frame.position.z) -
          Math.hypot(a.x - frame.position.x, a.z - frame.position.z)
      );
      for (const tile of sorted) {
        const known =
          sample || exploration.knows({ x: tile.x + 1, z: tile.z + 1 });
        const corners = [
          [tile.x, tile.z],
          [tile.x + 2, tile.z],
          [tile.x + 2, tile.z + 2],
          [tile.x, tile.z + 2],
        ] as const;
        ctx.beginPath();
        for (const [i, corner] of corners.entries()) {
          const p = project(corner[0], tile.h, corner[1]);
          if (i === 0) {
            ctx.moveTo(p.x, p.y);
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }
        ctx.closePath();
        const light = Math.min(72, 40 + tile.h * 4);
        ctx.fillStyle =
          variant === "A"
            ? known
              ? `hsl(28 40% ${String(light)}%)`
              : "#48414a"
            : known
              ? "#e6c898"
              : "#bdb3a6";
        ctx.fill();
        // Elevation boundaries retain the island's stepped shapes in chart form.
        for (const [dx, dz, from, to] of [
          [2, 0, 1, 2],
          [0, 2, 2, 3],
        ] as const) {
          if (
            island.heightAt(tile.x + 1 + dx, tile.z + 1 + dz) !== tile.h &&
            (known || variant === "B")
          ) {
            const a = project(corners[from][0], tile.h, corners[from][1]);
            const b = project(corners[to][0], tile.h, corners[to][1]);
            ctx.strokeStyle = variant === "A" ? "#5f4142" : "#87745f";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (const vent of island.vents) {
        if (!sample && !exploration.knows(vent)) {
          continue;
        }
        const p = project(
          vent.x,
          island.heightAt(vent.x, vent.z) + 0.2,
          vent.z
        );
        if (!p.visible) {
          continue;
        }
        ctx.fillStyle = variant === "A" ? "#5a3941" : "#87745f";
        ctx.fillRect(p.x - 4, p.y - 4, 8, 8);
      }
      const labels: { x: number; y: number; w: number }[] = [];
      markers = [];
      for (const marker of mapMarkers(island, state, exploration, sample)) {
        const p = project(
          marker.x,
          marker.id === "humanoid"
            ? state.y + 1
            : island.heightAt(marker.x, marker.z) + 1,
          marker.z
        );
        if (!p.visible || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
          continue;
        }
        markers.push({ id: marker.id, x: p.x, y: p.y });
        ctx.fillStyle = marker.id === selected ? "#784357" : "#302b32";
        ctx.strokeStyle = marker.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, marker.id === "humanoid" ? 12 : 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = marker.color;
        ctx.font = "bold 12px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.save();
        ctx.translate(p.x, p.y);
        if (marker.id === "humanoid") {
          ctx.rotate(state.yaw - frame.facing);
        }
        ctx.fillText(marker.symbol, 0, 0);
        ctx.restore();
        if (
          variant === "A" ||
          marker.id === selected ||
          marker.id === "humanoid"
        ) {
          ctx.font = "12px system-ui";
          const w = ctx.measureText(marker.label).width + 12;
          const x = Math.max(4, Math.min(width - w - 4, p.x - w / 2));
          let y = p.y + 23;
          for (
            let attempt = 0;
            attempt < 5 &&
            labels.some(
              (l) => x < l.x + l.w && x + w > l.x && Math.abs(y - l.y) < 22
            );
            attempt++
          ) {
            y += 22;
          }
          labels.push({ x, y, w });
          ctx.fillStyle = "#302b32";
          ctx.fillRect(x, y - 9, w, 20);
          ctx.fillStyle = "#fff0da";
          ctx.fillText(marker.label, x + w / 2, y + 1);
        }
      }
    },
  };
}
