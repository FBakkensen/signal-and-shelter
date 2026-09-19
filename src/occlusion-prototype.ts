// Three obstruction treatments on the existing route; fixture poses are illustrative.
import "./style.css";
import "./camera-prototype.css";
import { createIsland, DEFAULT_SEED } from "./packages/island/index.ts";
import { CameraStudy, scrollZoom } from "./camera-prototype-model.ts";
import { occlusionVariant } from "./occlusion-prototype-model.ts";
import { createScene, loadShip } from "./scene.ts";
const params = new URLSearchParams(location.search);
const island = createIsland(params.get("seed") ?? DEFAULT_SEED);
const study = new CameraStudy(island, "B");
let variant = occlusionVariant(params.get("variant"));
let fixture = "ship";
let zoom = 0.35;
let orbit = 0;
const names = {
  A: "Through-wall silhouette",
  B: "Fade obstructing scenery",
  C: "Manual orbit only",
};
document.body.className = "camera-study occlusion-study";
document.body.innerHTML = `<canvas id="study-world" tabindex="0" aria-label="Occlusion comparison island"></canvas>
<header><a class="brand" href="/">◈ Signal &amp; Shelter</a><span>OCCLUSION STUDY · THROWAWAY</span><a href="/?study=map&variant=A">Atlas study ↗</a></header>
<aside class="study-info"><span class="eyebrow">YOUR ZOOM STAYS FIXED</span><h1 id="title"></h1><p id="description"></p><p>Scroll: manual zoom · Q/R: orbit<br>←/→: compare treatments</p><p>Fixture buttons place a demonstration humanoid by real seeded geometry. They do not move your playable humanoid or discover resources.</p><p>Free play: WASD, Space jump. Temporary study bindings.</p></aside>
<aside class="study-selection"><span class="eyebrow">POINTER INSPECTION</span><p id="selection">Click visible ship or deposit geometry. Obstructions still block picking, even when faded.</p></aside>
<div class="study-status"><output id="status"></output></div>
<nav class="study-switcher"><button id="prev">←</button><strong id="label"></strong><button id="next">→</button><button data-pose="ship">Behind ship</button><button data-pose="vent">Behind vent</button><button data-pose="inside">Camera inside ship</button><button data-pose="terrain">Camera in terrain</button><button data-pose="play">Free play</button></nav>`;
function el(id: string) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(id);
  }
  return element;
}
const canvas = el("study-world");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("canvas");
}
function sync() {
  el("title").textContent = `${variant} · ${names[variant]}`;
  el("label").textContent = variant;
  el("description").textContent =
    variant === "A"
      ? "Only hidden parts of the humanoid glow through solid scenery. The world keeps its full shape."
      : variant === "B"
        ? "Meshes between camera and humanoid become translucent. Terrain chunks may fade broadly; this is deliberately visible for comparison."
        : "Scenery stays opaque. Orbit manually to see around obstructions.";
  const url = new URL(location.href);
  url.searchParams.set("variant", variant);
  url.searchParams.set("seed", island.seed);
  history.replaceState(null, "", url);
}
function cycle(direction: number) {
  const variants = ["A", "B", "C"] as const;
  variant = variants[(variants.indexOf(variant) + direction + 3) % 3] ?? "A";
  sync();
}
el("prev").onclick = () => {
  cycle(-1);
};
el("next").onclick = () => {
  cycle(1);
};
for (const button of document.querySelectorAll<HTMLButtonElement>(
  "[data-pose]"
)) {
  button.onclick = () => {
    fixture = button.dataset.pose ?? "ship";
    orbit = 0;
    if (fixture === "play") {
      study.app.resume("button");
    }
    canvas.focus();
  };
}
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    zoom = scrollZoom(zoom, e.deltaY, e.deltaMode);
  },
  { passive: false }
);
window.addEventListener("keydown", (e) => {
  if (
    e.target instanceof HTMLElement &&
    e.target.closest("input,textarea,[contenteditable]")
  ) {
    return;
  }
  if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
    e.preventDefault();
    if (!e.repeat) {
      cycle(e.code === "ArrowLeft" ? -1 : 1);
    }
  } else if (e.code === "KeyQ" || e.code === "KeyR") {
    if (fixture === "play") {
      study.key(e.code, true);
    } else {
      orbit += e.code === "KeyQ" ? -0.15 : 0.15;
    }
  } else if (study.key(e.code, true)) {
    e.preventDefault();
    canvas.focus();
  }
});
window.addEventListener("keyup", (e) => study.key(e.code, false));
window.addEventListener("blur", () => {
  study.app.pause();
});
const world = createScene(canvas, island, await loadShip(), true);
canvas.onclick = (e) => {
  el("selection").textContent =
    world.pick(e.clientX, e.clientY) ??
    "Obstructing scenery or empty ground. Selection does not reveal hidden targets.";
};
sync();
let previous = performance.now();
function tick(now: number) {
  study.tick(Math.min((now - previous) / 1000, 0.05));
  previous = now;
  study.zoom = zoom;
  let state = study.app.state;
  let frame = study.frame(innerWidth / innerHeight);
  const distance = 3.5 * 20 ** zoom;
  if (fixture !== "play") {
    const obstacle =
      fixture === "vent" ? (island.vents[0] ?? island.ship) : island.ship;
    const x = obstacle.x,
      z =
        obstacle.z -
        (fixture === "inside" ? distance : fixture === "vent" ? 1.5 : 4.5);
    state = { ...state, x, z, y: island.heightAt(x, z), distance: 0 };
    const target = { x, y: state.y + 0.8, z };
    frame = {
      ...frame,
      target,
      position: {
        x: x + Math.sin(orbit) * distance,
        y: target.y + (fixture === "inside" ? 0 : 0.5),
        z: z + Math.cos(orbit) * distance,
      },
      facing: 0,
    };
  }
  if (fixture === "terrain") {
    frame.position.y =
      island.heightAt(frame.position.x, frame.position.z) - 0.3;
  }
  const blockers = world.render(
    state,
    study.app.viewPosition,
    now / 1000,
    true,
    frame,
    variant
  );
  el("status").textContent =
    `${fixture === "play" ? "LIVE PLAY" : "EXAMPLE POSE: " + fixture} · Treatment ${variant} · Zoom ${String(Math.round(zoom * 100))}% · User distance ${distance.toFixed(1)} m · FOV 55° · Blocking meshes ${String(blockers)}\nNo automatic distance, angle or FOV adjustment. Switch treatments without changing the pose or zoom.`;
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
