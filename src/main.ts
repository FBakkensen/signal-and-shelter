import { GameApplication } from "./packages/play/index.ts";
import type { ResumeResult } from "./packages/play/index.ts";
import { ThirdPersonCamera } from "./camera.ts";
import "./style.css";
import { createScene, loadShip } from "./scene.ts";
import {
  createIsland,
  chooseSeed,
  DEFAULT_SEED,
  GENERATOR_VERSION,
} from "./packages/island/index.ts";

function element<T extends HTMLElement>(id: string, type: new () => T): T {
  const found = document.getElementById(id);
  if (!(found instanceof type)) {
    throw new Error(`Missing element: ${id}`);
  }
  return found;
}
const $ = (id: string): HTMLElement => element(id, HTMLElement);
const startButton = element("start", HTMLButtonElement);
const canvas = element("world", HTMLCanvasElement);
const app = new GameApplication(
  createIsland(
    new URLSearchParams(location.search).get("seed") ?? DEFAULT_SEED
  ),
  true
);
let world: ReturnType<typeof createScene>,
  shipAsset: Awaited<ReturnType<typeof loadShip>>,
  previous = 0,
  toastUntil = 0;
const camera = new ThirdPersonCamera();

const seedInput = element("seed", HTMLInputElement);
seedInput.value = new URLSearchParams(location.search).get("seed") ?? "";
function updateWorldUI() {
  $("places").replaceChildren(
    ...app.island.resources.map((resource) => {
      const row = document.createElement("li");
      row.dataset.place = resource.id;
      const marker = document.createElement("span");
      const name = document.createElement("span");
      name.textContent = resource.name;
      row.append(marker, name);
      return row;
    })
  );
  element("current-seed", HTMLInputElement).value = app.island.seed;
  $("seed-version").textContent =
    `World generation ${String(GENERATOR_VERSION)}`;
  $("seed-badge").textContent = `Seed: ${app.island.seed}`;
}
function sync() {
  $("welcome").hidden = app.started;
  $("pause-panel").hidden =
    !app.started || !app.state.paused || app.state.overview || app.terminalOpen;

  document.body.classList.toggle("in-menu", !app.started || app.state.paused);
  $("overview").hidden = !app.started;
  $("pause").hidden = !app.started || app.state.paused;
  $("overview").setAttribute("aria-pressed", String(app.state.overview));
  $("overview-label").hidden = !app.state.overview;
  $("count").textContent =
    `${String(app.state.discovered.length)} / ${String(app.island.resources.length)}`;
  for (const p of app.island.resources) {
    const row = document.querySelector(`[data-place="${p.id}"]`);
    if (!row?.firstElementChild) {
      throw new Error("Missing journal row");
    }
    const found = app.state.discovered.includes(p.id);
    row.classList.toggle("found", found);
    row.firstElementChild.textContent = found ? "◆" : "◇";
  }
  $("journal-note").textContent =
    app.state.discovered.length === app.island.resources.length
      ? "Starter resources surveyed. Gathering and building will come in a later experiment."
      : "Explore the island. Walk close to an outcrop to record what you find.";
  $("terminal-panel").hidden = !app.terminalOpen;
  $("interact").hidden = !app.canUseSelection;
  $("link-status").textContent = app.state.linkChecked
    ? "Data link confirmed"
    : "Check the ship’s data link";
  $("terminal-status").textContent = app.state.linkChecked
    ? "Connection confirmed. The ship can exchange data, but its flight systems are offline. Software delivery will come in a later experiment."
    : "The communications unit still has power. Run a connection check.";
  $("check-link").textContent = app.state.linkChecked
    ? "Check connection again"
    : "Check connection";
}
function release(overview = false) {
  app.pause(overview);
  sync();
  if (app.started) {
    element(overview ? "return" : "resume", HTMLButtonElement).focus();
  }
}
function applyResume(result: ResumeResult) {
  if (result.kind === "ignored") {
    return;
  }
  previous = performance.now();
  sync();
  canvas.focus();
}
function resume() {
  applyResume(app.resume());
}
element("start-form", HTMLFormElement).onsubmit = (event) => {
  event.preventDefault();
  const seed = chooseSeed(seedInput.value, () =>
    crypto.randomUUID().slice(0, 12)
  );
  try {
    const nextIsland = createIsland(seed);
    world.dispose();
    world = createScene(canvas, nextIsland, shipAsset, false, true);
    seedInput.value = seed;
    const url = new URL(location.href);
    url.searchParams.set("seed", seed);
    history.replaceState(null, "", url);
    const result = app.start(nextIsland, true);
    toastUntil = 0;
    $("toast").hidden = true;
    updateWorldUI();
    applyResume(result);
  } catch (error) {
    console.error(error);
    $("start-error").textContent =
      "The island could not be prepared. Please reload and try again.";
  }
};
$("resume").onclick = resume;
$("return").onclick = resume;
$("pause").onclick = () => {
  release();
};
$("overview").onclick = () => {
  if (app.state.overview) {
    release();
  } else {
    release(true);
  }
};
$("reset").onclick = () => {
  release();
  const result = app.restart();
  toastUntil = 0;
  $("toast").hidden = true;
  applyResume(result);
};
$("new-island").onclick = () => {
  release();
  app.chooseSeed();
  toastUntil = 0;
  $("toast").hidden = true;
  sync();
  seedInput.focus();
};
function openTerminal() {
  if (!app.useSelection()) {
    return;
  }
  sync();
  $("check-link").focus();
}
$("interact").onclick = openTerminal;
$("check-link").onclick = () => {
  app.checkLink();
  sync();
};
$("terminal-return").onclick = () => {
  applyResume(app.resume("terminal"));
};
window.addEventListener("keydown", (e) => {
  if (e.code === "Escape" && app.started) {
    e.preventDefault();
    release();
    return;
  }
  const editing =
    e.target instanceof HTMLElement &&
    Boolean(e.target.closest("input,textarea,select,[contenteditable]"));
  if (e.code === "KeyF" && !editing && !e.repeat && !app.state.paused) {
    e.preventDefault();
    openTerminal();
    return;
  }
  if (e.code === "KeyM" && app.started && !e.repeat && !editing) {
    e.preventDefault();
    release(!app.state.overview);
    return;
  }
  if (e.code === "Space" && e.target instanceof HTMLButtonElement) {
    return;
  }
  if (!app.state.paused && !editing && app.press(e.code)) {
    e.preventDefault();
  }
});
window.addEventListener("keyup", (e) => {
  app.release(e.code);
});
window.addEventListener("blur", () => {
  if (app.started) {
    release();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && app.started) {
    release();
  }
});
canvas.addEventListener("click", (e) => {
  if (!app.started || app.state.paused) {
    return;
  }
  app.select(world.pick(e.clientX, e.clientY));
  canvas.focus();
  sync();
});
canvas.addEventListener(
  "wheel",
  (e) => {
    if (!app.started || app.state.paused) {
      return;
    }
    e.preventDefault();
    camera.scroll(e.deltaY, e.deltaMode);
  },
  { passive: false }
);
function tick(now: number) {
  const dt = Math.min((now - previous) / 1000, 0.05);
  previous = now;
  const before = app.state.discovered.length;
  app.tick(dt);
  $("interact").hidden = !app.canUseSelection;
  if (before !== app.state.discovered.length) {
    const place = app.island.resources.find(
      (p) => p.id === app.state.discovered.at(-1)
    );
    if (!place) {
      throw new Error("Unknown discovered landmark");
    }
    $("toast").textContent = `${place.name} — ${place.note}`;
    $("toast").hidden = false;
    toastUntil = now + 5500;
    sync();
  }
  if (now > toastUntil) {
    $("toast").hidden = true;
  }
  $("position").textContent =
    `${String(Math.floor(app.state.distance))} m wandered · ${app.state.x.toFixed(1)}, ${app.state.z.toFixed(1)} · ${app.state.grounded ? (app.state.crouching ? "Sneaking" : "Grounded") : "Airborne"}`;
  $("biome").textContent = {
    haze: "THE HAZE EDGE",
    vents: "THE VENT FIELDS",
    crust: "CERAMIC SHELF",
  }[app.island.biomeAt(app.state.x, app.state.z)];
  const selected = app.island.resources.find((r) => r.id === app.selection);
  $("selection").hidden =
    !app.started || app.state.paused || app.selection === null;
  $("selection-name").textContent =
    app.selection === "ship"
      ? "Stranded ship"
      : selected && app.state.discovered.includes(selected.id)
        ? selected.name
        : "Unsurveyed deposit";
  $("selection-help").textContent =
    app.selection === "ship"
      ? app.canUseTerminal
        ? "F · Use terminal"
        : "Walk closer to the terminal."
      : "Approach to survey. Gathering is not available yet.";
  $("camera-status").textContent =
    `Zoom ${String(Math.round(camera.zoom * 100))}% · Orbit ${String(Math.round((app.state.yaw * 180) / Math.PI))}°`;
  world.render(
    app.state,
    app.viewPosition,
    now / 1000,
    app.started,
    app.started && !app.state.overview
      ? camera.frame(
          app.viewPosition,
          app.state.yaw,
          app.facing,
          innerWidth / innerHeight
        )
      : undefined
  );

  requestAnimationFrame(tick);
}
try {
  shipAsset = await loadShip();
  world = createScene(canvas, app.island, shipAsset, false, true);
  updateWorldUI();
  startButton.disabled = false;
  startButton.textContent = "Begin your landing →";
  sync();
  requestAnimationFrame(tick);
} catch (error) {
  console.error(error);
  $("start").textContent = "Island could not load";
  const message = $("welcome").querySelector("p");
  if (message) {
    message.textContent =
      "The island needs WebGL and its local assets. Try reloading in a browser with hardware acceleration.";
  }
}
