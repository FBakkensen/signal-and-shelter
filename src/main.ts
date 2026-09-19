import {
  MOVEMENT_KEYS,
  inputFromKeys,
  keyboardTurn,
  dragTurn,
} from "./controls.ts";
import "./style.css";
import { createScene } from "./scene.ts";
import {
  createGame,
  advance,
  turn,
  setPaused,
  toggleOverview,
} from "./game.ts";
import { LANDMARKS, biomeAt } from "./world.ts";

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
let state = createGame(),
  started = false,
  world: Awaited<ReturnType<typeof createScene>>,
  previous = 0,
  toastUntil = 0;
const keys = new Set<string>();
$("places").innerHTML = LANDMARKS.map(
  (p) => `<li data-place="${p.id}"><span>◇</span><span>${p.name}</span></li>`,
).join("");
function sync() {
  $("welcome").hidden = started;
  $("pause-panel").hidden = !started || !state.paused;
  $("pause").hidden = !started || state.paused;
  $("overview").setAttribute("aria-pressed", String(state.overview));
  $("overview-label").hidden = !state.overview;
  $("count").textContent =
    `${String(state.discovered.length)} / ${String(LANDMARKS.length)}`;
  for (const p of LANDMARKS) {
    const row = document.querySelector(`[data-place="${p.id}"]`);
    if (!row?.firstElementChild) {
      throw new Error("Missing journal row");
    }
    const found = state.discovered.includes(p.id);
    row.classList.toggle("found", found);
    row.firstElementChild.textContent = found ? "◆" : "◇";
  }
  $("journal-note").textContent =
    state.discovered.length === 3
      ? "Every landmark found. The rest of the walk is yours."
      : "Follow your curiosity. Walk close to a landmark to discover it.";
}
function pause(value: boolean) {
  state = setPaused(state, value);
  keys.clear();
  sync();
  if (!value) {
    canvas.focus();
  }
}
function overview() {
  state = toggleOverview(state);
  keys.clear();
  sync();
  canvas.focus();
}
$("start").onclick = () => {
  started = true;
  state = { ...state, overview: false };
  pause(false);
};
$("resume").onclick = () => {
  pause(false);
};
$("pause").onclick = () => {
  pause(true);
};
$("overview").onclick = overview;
$("reset").onclick = () => {
  state = createGame();
  started = true;
  toastUntil = 0;
  $("toast").hidden = true;
  pause(false);
};
window.addEventListener("keydown", (e) => {
  if (e.code === "Escape" && started) {
    e.preventDefault();
    pause(!state.paused);
    return;
  }
  if (e.code === "KeyM" && !e.repeat) {
    overview();
    return;
  }
  if (MOVEMENT_KEYS.has(e.code) && e.target === canvas) {
    e.preventDefault();
    keys.add(e.code);
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
  keys.clear();
  if (started) {
    pause(true);
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && started) {
    pause(true);
  }
});
let pointer: number | null = null;
canvas.addEventListener("pointerdown", (e) => {
  canvas.focus();
  if (!state.paused && !state.overview) {
    pointer = e.clientX;
    canvas.setPointerCapture(e.pointerId);
  }
});
canvas.addEventListener("pointermove", (e) => {
  if (pointer !== null) {
    state = turn(state, dragTurn(pointer, e.clientX));
    pointer = e.clientX;
  }
});
canvas.addEventListener("pointerup", () => {
  pointer = null;
});
canvas.addEventListener("pointercancel", () => {
  pointer = null;
});
canvas.addEventListener("lostpointercapture", () => {
  pointer = null;
});
function tick(now: number) {
  const dt = Math.min((now - previous) / 1000, 0.05);
  previous = now;
  const before = state.discovered.length;
  if (!state.paused && !state.overview) {
    state = turn(state, keyboardTurn(keys, dt));
  }
  state = advance(state, inputFromKeys(keys), dt, undefined, world.obstacles);
  if (before !== state.discovered.length) {
    const place = LANDMARKS.find((p) => p.id === state.discovered.at(-1));
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
    `${String(Math.floor(state.distance))} m wandered · ${state.x.toFixed(1)}, ${state.z.toFixed(1)}`;
  $("biome").textContent = {
    shore: "THE SHORE",
    grove: "THE GROVE",
    meadow: "THE MEADOW",
  }[biomeAt(state.x, state.z)];
  world.render(state, dt, now / 1000, started);
  requestAnimationFrame(tick);
}
try {
  world = await createScene(canvas);
  startButton.disabled = false;
  startButton.textContent = "Begin exploring →";
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
