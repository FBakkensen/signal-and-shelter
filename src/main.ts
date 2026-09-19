import { mouseLook } from "./controls.ts";
import { ControlSession } from "./session.ts";
import "./style.css";
import { createScene, loadShip } from "./scene.ts";
import {
  createGame,
  advance,
  look,
  transition,
  canUseTerminal,
  checkDataLink,
} from "./game.ts";
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
let island = createIsland(
  new URLSearchParams(location.search).get("seed") ?? DEFAULT_SEED,
);
let state = createGame(island),
  started = false,
  world: ReturnType<typeof createScene>,
  shipAsset: Awaited<ReturnType<typeof loadShip>>,
  terminalOpen = false,
  previous = 0,
  toastUntil = 0;
const session = new ControlSession();
const sensitivity = element("sensitivity", HTMLInputElement);
const invertY = element("invert-y", HTMLInputElement);

const seedInput = element("seed", HTMLInputElement);
seedInput.value = new URLSearchParams(location.search).get("seed") ?? "";
function updateWorldUI() {
  $("places").replaceChildren(
    ...island.resources.map((resource) => {
      const row = document.createElement("li");
      row.dataset.place = resource.id;
      const marker = document.createElement("span");
      const name = document.createElement("span");
      name.textContent = resource.name;
      row.append(marker, name);
      return row;
    }),
  );
  element("current-seed", HTMLInputElement).value = island.seed;
  $("seed-version").textContent =
    `World generation ${String(GENERATOR_VERSION)}`;
  $("seed-badge").textContent = `Seed: ${island.seed}`;
}
function sync() {
  $("welcome").hidden = started;
  $("control-mode").textContent = session.keyboardPreferred
    ? "Use mouse controls"
    : "Use keyboard controls";
  $("pause-panel").hidden =
    !started || !state.paused || state.overview || terminalOpen;
  $("crosshair").hidden = !started || state.paused || state.overview;
  document.body.classList.toggle("in-menu", !started || state.paused);
  $("overview").hidden = !started;
  $("pause").hidden = !started || state.paused;
  $("overview").setAttribute("aria-pressed", String(state.overview));
  $("overview-label").hidden = !state.overview;
  $("count").textContent =
    `${String(state.discovered.length)} / ${String(island.resources.length)}`;
  for (const p of island.resources) {
    const row = document.querySelector(`[data-place="${p.id}"]`);
    if (!row?.firstElementChild) {
      throw new Error("Missing journal row");
    }
    const found = state.discovered.includes(p.id);
    row.classList.toggle("found", found);
    row.firstElementChild.textContent = found ? "◆" : "◇";
  }
  $("journal-note").textContent =
    state.discovered.length === island.resources.length
      ? "Starter resources surveyed. Gathering and building will come in a later experiment."
      : "Explore the island. Walk close to an outcrop to record what you find.";
  $("terminal-panel").hidden = !terminalOpen;
  $("interact").hidden =
    !started || state.paused || !canUseTerminal(state, island);
  $("link-status").textContent = state.linkChecked
    ? "Data link confirmed"
    : "Check the ship’s data link";
  $("terminal-status").textContent = state.linkChecked
    ? "Connection confirmed. The ship can exchange data, but its flight systems are offline. Software delivery will come in a later experiment."
    : "The communications unit still has power. Run a connection check.";
  $("check-link").textContent = state.linkChecked
    ? "Check connection again"
    : "Check connection";
}
function release(overview = false) {
  terminalOpen = false;
  session.pause();
  $("capture-message").textContent = session.keyboardPreferred
    ? "WASD to move. Arrow keys to look around. Escape pauses."
    : "Look with the mouse or arrow keys. WASD to move. Escape pauses.";
  $("resume").textContent = "Keep wandering →";
  state = transition(state, overview ? "overview" : "pause");
  if (document.pointerLockElement === canvas) {
    document.exitPointerLock();
  }
  sync();
  if (started) {
    element(overview ? "return" : "resume", HTMLButtonElement).focus();
  }
}
function captureFailed() {
  release();
  $("capture-message").textContent =
    "This browser couldn’t start mouse controls. You can use keyboard controls instead.";
}
function activatePlay() {
  state = transition(state, "capture");
  $("look-help").textContent = session.keyboardPreferred
    ? "Arrow keys to look"
    : "Mouse / arrow keys to look";
  canvas.setAttribute(
    "aria-label",
    session.keyboardPreferred
      ? "Island game. W A S D to move, arrow keys to look, Control to sprint, Space to jump, Shift to sneak, Escape to pause."
      : "Island game. Mouse or arrow keys to look, W A S D to move, Control to sprint, Space to jump, Shift to sneak, Escape to pause.",
  );
  previous = performance.now();
  sync();
  canvas.focus();
}
function resume() {
  if (session.mode === "capturing" || document.pointerLockElement === canvas) {
    return;
  }
  started = true;
  state = transition(state, "return");
  const generation = session.resume();
  if (generation === null) {
    activatePlay();
    return;
  }
  $("capture-message").textContent = session.keyboardPreferred
    ? "WASD to move. Arrow keys to look around. Escape pauses."
    : "Look with the mouse or arrow keys. WASD to move. Escape pauses.";
  $("resume").textContent = "Keep wandering →";
  sync();
  try {
    void Promise.resolve(canvas.requestPointerLock()).catch(() => {
      if (session.captureFailed(generation)) {
        captureFailed();
      }
    });
  } catch {
    if (session.captureFailed(generation)) {
      captureFailed();
    }
  }
}
$("control-mode").onclick = () => {
  const keyboard = !session.keyboardPreferred;
  release();
  session.keyboardPreferred = keyboard;
  resume();
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
    island = nextIsland;
    state = createGame(island);
    terminalOpen = false;
    seedInput.value = seed;
    const url = new URL(location.href);
    url.searchParams.set("seed", seed);
    history.replaceState(null, "", url);
    session.keyboardPreferred =
      element("start-controls", HTMLSelectElement).value === "keyboard";
    toastUntil = 0;
    $("toast").hidden = true;
    updateWorldUI();
    resume();
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
  if (state.overview) {
    release();
  } else {
    release(true);
  }
};
$("reset").onclick = () => {
  release();
  state = createGame(island);
  toastUntil = 0;
  $("toast").hidden = true;
  resume();
};
$("new-island").onclick = () => {
  release();
  started = false;
  state = createGame(island);
  toastUntil = 0;
  $("toast").hidden = true;
  sync();
  seedInput.focus();
};
function openTerminal() {
  if (state.paused || !canUseTerminal(state, island)) {
    return;
  }
  release();
  terminalOpen = true;
  sync();
  $("check-link").focus();
}
$("interact").onclick = openTerminal;
$("check-link").onclick = () => {
  state = checkDataLink(state, island);
  sync();
};
$("terminal-return").onclick = () => {
  terminalOpen = false;
  resume();
};
document.addEventListener("pointerlockchange", () => {
  if (document.pointerLockElement === canvas) {
    if (!session.captureSucceeded()) {
      document.exitPointerLock();
      return;
    }

    activatePlay();
  } else if (!state.overview && !terminalOpen && session.mode !== "keyboard") {
    release();
  }
});
document.addEventListener("pointerlockerror", () => {
  if (session.mode === "capturing") {
    captureFailed();
  }
});
window.addEventListener("keydown", (e) => {
  if (e.code === "Escape" && started) {
    e.preventDefault();
    release();
    return;
  }
  const editing =
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLSelectElement;
  if (e.code === "KeyE" && !editing && !e.repeat && !state.paused) {
    e.preventDefault();
    openTerminal();
    return;
  }
  if (e.code === "KeyM" && started && !e.repeat && !editing) {
    e.preventDefault();
    release(!state.overview);
    return;
  }
  if (!state.paused && !editing && session.press(e.code)) {
    e.preventDefault();
  }
});
window.addEventListener("keyup", (e) => {
  session.release(e.code);
});
window.addEventListener("blur", () => {
  if (started) {
    release();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && started) {
    release();
  }
});
canvas.addEventListener("click", () => {
  if (started && state.paused && !state.overview) {
    resume();
  }
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
  state = look(state, delta.yaw, delta.pitch);
});
function tick(now: number) {
  const dt = Math.min((now - previous) / 1000, 0.05);
  previous = now;
  const before = state.discovered.length;
  const rotation = session.look(dt);
  state = look(state, rotation.yaw, rotation.pitch);
  state = advance(
    state,
    session.readInput(),
    dt,
    island.heightAt,
    world.obstacles,
    island,
  );
  $("interact").hidden =
    !started || state.paused || !canUseTerminal(state, island);
  if (before !== state.discovered.length) {
    const place = island.resources.find(
      (p) => p.id === state.discovered.at(-1),
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
    `${String(Math.floor(state.distance))} m wandered · ${state.x.toFixed(1)}, ${state.z.toFixed(1)} · ${state.grounded ? (state.crouching ? "Sneaking" : "Grounded") : "Airborne"}`;
  $("biome").textContent = {
    shore: "THE SHORE",
    grove: "THE GROVE",
    meadow: "THE MEADOW",
  }[island.biomeAt(state.x, state.z)];
  world.render(state, now / 1000, started);
  requestAnimationFrame(tick);
}
try {
  shipAsset = await loadShip();
  world = createScene(canvas, island, shipAsset);
  updateWorldUI();
  startButton.disabled = false;
  startButton.textContent = "Begin your island →";
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
