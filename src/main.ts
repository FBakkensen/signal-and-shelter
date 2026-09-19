import { mouseLook } from "./controls.ts";
import { GameApplication } from "./application.ts";
import type { ResumeResult } from "./application.ts";
import "./style.css";
import { createScene, loadShip } from "./scene.ts";
import { canUseTerminal } from "./game.ts";
import {
  createIsland,
  chooseSeed,
  DEFAULT_SEED,
  GENERATOR_VERSION,
} from "./world.ts";

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
    new URLSearchParams(location.search).get("seed") ?? DEFAULT_SEED,
  ),
);
let world: ReturnType<typeof createScene>,
  shipAsset: Awaited<ReturnType<typeof loadShip>>,
  previous = 0,
  toastUntil = 0;
const sensitivity = element("sensitivity", HTMLInputElement);
const invertY = element("invert-y", HTMLInputElement);

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
    }),
  );
  element("current-seed", HTMLInputElement).value = app.island.seed;
  $("seed-version").textContent =
    `World generation ${String(GENERATOR_VERSION)}`;
  $("seed-badge").textContent = `Seed: ${app.island.seed}`;
}
function sync() {
  $("welcome").hidden = app.started;
  $("control-mode").textContent = app.session.keyboardPreferred
    ? "Use mouse controls"
    : "Use keyboard controls";
  $("pause-panel").hidden =
    !app.started || !app.state.paused || app.state.overview || app.terminalOpen;
  $("crosshair").hidden =
    !app.started || app.state.paused || app.state.overview;
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
  $("interact").hidden =
    !app.started || app.state.paused || !canUseTerminal(app.state, app.island);
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
  $("capture-message").textContent = app.session.keyboardPreferred
    ? "WASD to move. Arrow keys to look around. Escape pauses."
    : "Look with the mouse or arrow keys. WASD to move. Escape pauses.";
  $("resume").textContent = "Keep wandering →";
  if (document.pointerLockElement === canvas) {
    document.exitPointerLock();
  }
  sync();
  if (app.started) {
    element(overview ? "return" : "resume", HTMLButtonElement).focus();
  }
}
function captureFailed() {
  release();
  $("capture-message").textContent =
    "This browser couldn’t start mouse controls. You can use keyboard controls instead.";
}
function activatePlay() {
  $("look-help").textContent = app.session.keyboardPreferred
    ? "Arrow keys to look"
    : "Mouse / arrow keys to look";
  canvas.setAttribute(
    "aria-label",
    app.session.keyboardPreferred
      ? "Ember Fold exploration. W A S D to move, arrow keys to look, Control to sprint, Space to jump, Shift to sneak, Escape to pause."
      : "Ember Fold exploration. Mouse or arrow keys to look, W A S D to move, Control to sprint, Space to jump, Shift to sneak, Escape to pause.",
  );
  previous = performance.now();
  sync();
  canvas.focus();
}
function applyResume(result: ResumeResult) {
  if (result.kind === "ignored") {
    return;
  }
  if (result.kind === "keyboard") {
    activatePlay();
    return;
  }
  $("capture-message").textContent =
    "Look with the mouse or arrow keys. WASD to move. Escape pauses.";
  $("resume").textContent = "Keep wandering →";
  sync();
  try {
    void Promise.resolve(canvas.requestPointerLock()).catch(() => {
      if (app.captureFailed(result.generation)) {
        captureFailed();
      }
    });
  } catch {
    if (app.captureFailed(result.generation)) {
      captureFailed();
    }
  }
}
function resume() {
  applyResume(app.resume());
}
$("control-mode").onclick = () => {
  applyResume(app.switchControls());
};
element("start-form", HTMLFormElement).onsubmit = (event) => {
  event.preventDefault();
  const seed = chooseSeed(seedInput.value, () =>
    crypto.randomUUID().slice(0, 12),
  );
  try {
    const nextIsland = createIsland(seed);
    world.dispose();
    world = createScene(canvas, nextIsland, shipAsset);
    seedInput.value = seed;
    const url = new URL(location.href);
    url.searchParams.set("seed", seed);
    history.replaceState(null, "", url);
    const result = app.start(
      nextIsland,
      element("start-controls", HTMLSelectElement).value === "keyboard",
    );
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
  if (!app.openTerminal()) {
    return;
  }
  if (document.pointerLockElement === canvas) {
    document.exitPointerLock();
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
document.addEventListener("pointerlockchange", () => {
  if (document.pointerLockElement === canvas) {
    if (!app.captureSucceeded()) {
      document.exitPointerLock();
      return;
    }

    activatePlay();
  } else if (app.captureLost()) {
    release();
  }
});
document.addEventListener("pointerlockerror", () => {
  if (app.captureFailed()) {
    captureFailed();
  }
});
window.addEventListener("keydown", (e) => {
  if (e.code === "Escape" && app.started) {
    e.preventDefault();
    release();
    return;
  }
  const editing =
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLSelectElement;
  if (e.code === "KeyE" && !editing && !e.repeat && !app.state.paused) {
    e.preventDefault();
    openTerminal();
    return;
  }
  if (e.code === "KeyM" && app.started && !e.repeat && !editing) {
    e.preventDefault();
    release(!app.state.overview);
    return;
  }
  if (!app.state.paused && !editing && app.session.press(e.code)) {
    e.preventDefault();
  }
});
window.addEventListener("keyup", (e) => {
  app.session.release(e.code);
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
canvas.addEventListener("click", () => {
  applyResume(app.resume("canvas"));
});
document.addEventListener("mousemove", (e) => {
  if (document.pointerLockElement !== canvas) {
    return;
  }
  const delta = mouseLook(
    e.movementX,
    e.movementY,
    sensitivity.valueAsNumber,
    invertY.checked,
  );
  app.look(delta.yaw, delta.pitch);
});
function tick(now: number) {
  const dt = Math.min((now - previous) / 1000, 0.05);
  previous = now;
  const before = app.state.discovered.length;
  app.tick(dt, world.obstacles);
  $("interact").hidden =
    !app.started || app.state.paused || !canUseTerminal(app.state, app.island);
  if (before !== app.state.discovered.length) {
    const place = app.island.resources.find(
      (p) => p.id === app.state.discovered.at(-1),
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
  world.render(app.state, now / 1000, app.started);
  requestAnimationFrame(tick);
}
try {
  shipAsset = await loadShip();
  world = createScene(canvas, app.island, shipAsset);
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
