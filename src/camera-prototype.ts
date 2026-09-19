// Two playable camera variants on the existing route, selected by ?variant=A|B.
// Throwaway: compare framing and zoom, not the final control contract or map view.
import "./style.css";
import "./camera-prototype.css";
import { createIsland, DEFAULT_SEED } from "./packages/island/index.ts";
import { CameraStudy, readVariant } from "./camera-prototype-model.ts";
import { createScene, loadShip } from "./scene.ts";

const params = new URLSearchParams(location.search);
const study = new CameraStudy(
  createIsland(params.get("seed") ?? DEFAULT_SEED),
  readVariant(params.get("variant"))
);
document.body.className = "camera-study";
document.body.innerHTML = `
  <canvas id="study-world" tabindex="0" aria-label="Camera comparison island"></canvas>
  <header><a class="brand" href="/">◈ Signal &amp; Shelter</a><span>CAMERA STUDY · THROWAWAY</span><a href="/">Return to current game ↗</a></header>
  <aside class="study-info">
    <span class="eyebrow">CLOSE PLAY → ISLAND SURVEY</span>
    <h1 id="study-title"></h1><p id="study-description"></p>
    <p>WASD move · Space jump · Ctrl sprint · Shift sneak<br>Q / R orbit · Scroll zoom · E terminal · Esc pause</p>
    <details><summary>What to compare</summary><p>Walk around the ship, orbit beside a wall, then zoom out. Can you see your humanoid and judge distances? Click the ship or a deposit to inspect it. The distant map presentation comes in a separate study.</p><p>Temporary bindings. No mouse capture or drag-to-look. Direct follow, no camera lag.</p></details>
  </aside>
  <aside class="study-selection"><span class="eyebrow">POINTER INSPECTION</span><p id="selection-text">Click the ship or a resource deposit.</p><button id="study-interact">E · Use nearby terminal</button></aside>
  <section class="study-modal" id="study-modal" hidden><h2 id="modal-title"></h2><p id="modal-copy"></p><button id="study-check">Check connection</button><button id="study-resume">Return to island</button></section>
  <div class="study-status"><output id="study-state"></output><output id="study-errors" role="status">Runtime errors: 0</output></div>
  <nav class="study-switcher" aria-label="Camera variants"><button id="study-prev" aria-label="Previous camera variant">←</button><strong id="study-label"></strong><button id="study-next" aria-label="Next camera variant">→</button><button id="study-close">Close</button><button id="study-far">Far</button><button id="study-pause">Pause</button><button id="study-reset">Restart</button></nav>`;
function el(id: string) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing ${id}`);
  }
  return element;
}
const canvas = el("study-world");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Missing canvas");
}
let errors = 0;
function reportError() {
  errors++;
  el("study-errors").textContent = `Runtime errors: ${String(errors)}`;
}
window.addEventListener("error", reportError);
window.addEventListener("unhandledrejection", reportError);
let selection: string | null = null;
function sync() {
  const a = study.variant === "A";
  el("study-title").textContent = a
    ? "A · Raised companion"
    : "B · Over the shoulder";
  el("study-label").textContent = a ? "A · Raised" : "B · Shoulder";
  el("study-description").textContent = a
    ? "A downward view keeps your feet, nearby terrain and working space in sight. Zoom out toward an overhead survey."
    : "A low, offset view puts the humanoid beside your sightline. Zooming out lifts the camera toward the same overhead survey.";
  const url = new URL(location.href);
  url.searchParams.set("variant", study.variant);
  url.searchParams.set("seed", study.app.island.seed);
  history.replaceState(null, "", url);
}
function switchVariant() {
  study.switchVariant();
  sync();
}
el("study-prev").onclick = switchVariant;
el("study-next").onclick = switchVariant;
el("study-close").onclick = () => {
  study.zoom = 0;
};
el("study-far").onclick = () => {
  study.zoom = 1;
};
el("study-reset").onclick = () => {
  study.restart();
  selection = null;
  canvas.focus();
};
el("study-pause").onclick = () => {
  study.app.pause();
};
el("study-resume").onclick = () => {
  study.app.resume(study.app.terminalOpen ? "terminal" : "button");
  canvas.focus();
};
el("study-check").onclick = () => {
  study.app.checkLink();
};
el("study-interact").onclick = () => {
  study.app.openTerminal();
};
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    study.scroll(e.deltaY, e.deltaMode);
  },
  { passive: false }
);
window.addEventListener("keydown", (e) => {
  if (
    e.target instanceof HTMLElement &&
    e.target.closest("input,textarea,select,[contenteditable]")
  ) {
    return;
  }
  if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
    e.preventDefault();
    if (!e.repeat) {
      switchVariant();
    }
    return;
  }
  if (e.code === "Escape") {
    e.preventDefault();
    study.app.pause();
    return;
  }
  if (e.code === "KeyE" && !e.repeat) {
    study.app.openTerminal();
    return;
  }
  // Space on controls keeps normal button behavior. Movement focuses the world.
  if (e.target instanceof HTMLButtonElement && e.code === "Space") {
    return;
  }
  if (study.key(e.code, true)) {
    e.preventDefault();
    canvas.focus();
  }
});
window.addEventListener("keyup", (e) => {
  study.key(e.code, false);
});
window.addEventListener("blur", () => {
  study.app.pause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    study.app.pause();
  }
});
try {
  const world = createScene(canvas, study.app.island, await loadShip());
  canvas.addEventListener("click", (e) => {
    if (study.app.state.paused) {
      return;
    }
    selection = world.pick(e.clientX, e.clientY);
    canvas.focus();
  });
  let previous = performance.now();
  function tick(now: number) {
    study.tick(Math.min((now - previous) / 1000, 0.05));
    previous = now;
    const { app } = study;
    const frame = study.frame(innerWidth / innerHeight);
    world.render(app.state, app.viewPosition, now / 1000, true, frame);
    el("study-state").textContent =
      `${app.state.paused ? "PAUSED" : "PLAYING"} · Zoom ${String(Math.round(study.zoom * 100))}% · Boom ${frame.distance.toFixed(1)} / ${frame.requestedDistance.toFixed(1)} m · Tilt ${frame.elevation.toFixed(0)}° · Orbit ${((app.state.yaw * 180) / Math.PI).toFixed(0)}° · ${frame.occluded ? "Camera pulled in by scenery" : "Clear camera"}\nPosition ${app.state.x.toFixed(2)}, ${app.state.y.toFixed(2)}, ${app.state.z.toFixed(2)} · ${app.state.grounded ? "Grounded" : "Airborne"} · Surveyed ${String(app.state.discovered.length)}/${String(app.island.resources.length)} · Seed ${app.island.seed}`;
    el("study-modal").hidden = !app.state.paused;
    el("modal-title").textContent = app.terminalOpen
      ? "Ship communications"
      : "Paused";
    el("modal-copy").textContent = app.terminalOpen
      ? app.state.linkChecked
        ? "Data link confirmed. Flight systems remain offline."
        : "Check the ship’s data link."
      : "Return when you’re ready. Camera switching and zoom remain available for comparison.";
    el("study-check").hidden = !app.terminalOpen;
    el("study-interact").hidden = !app.canUseTerminal;
    const resource = app.island.resources.find((r) => r.id === selection);
    el("selection-text").textContent =
      selection === "ship"
        ? app.state.paused
          ? "Stranded ship · Inspection paused."
          : app.canUseTerminal
            ? "Stranded ship · Terminal within reach."
            : "Stranded ship · Walk closer to its terminal to use it."
        : resource
          ? app.state.discovered.includes(resource.id)
            ? resource.name
            : "Unsurveyed deposit · Approach to identify it."
          : "Click the ship or a resource deposit.";
    requestAnimationFrame(tick);
  }
  sync();
  canvas.focus();
  requestAnimationFrame(tick);
} catch (error) {
  reportError();
  el("study-description").textContent =
    "The camera study could not load. Reload with WebGL enabled.";
  console.error(error);
}
