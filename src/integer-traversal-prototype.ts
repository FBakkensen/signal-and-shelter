import * as THREE from "three";
import { ThirdPersonCamera } from "./camera.ts";
import { resolvePrototypeHeading } from "./packages/play/prototype-input.ts";
import {
  createTraversal,
  HUMANOID,
} from "./packages/traversal-prototype/index.ts";
import type { Actor, Command } from "./packages/traversal-prototype/index.ts";
import {
  COURSES,
  PROFILES,
  setupCourse,
} from "./packages/traversal-prototype/courses.ts";
import "./integer-traversal-prototype.css";
const root = document.querySelector("#lab");
if (!root) {
  throw new Error("Missing lab mount");
}
root.innerHTML = `<header><div><div class="eyebrow">Signal & Shelter · experiment</div><h1>Exact contacts, shared movement</h1></div><p>Test exact-fit passages, partial steps, actors moving together and safe jumps. Controlled inputs exercise the same integer physics.</p></header><div class="layout"><section class="world" aria-label="Traversal course"><div class="hint"><strong id="course-title"></strong>WASD move · Q/E orbit · wheel zoom · Escape pause<br>Use “Try course” to watch the same movement rules.</div><div class="bottom"><span class="badge" id="phase">Ready</span><span id="feedback">Ready</span></div></section><aside><label>Course<select id="course">${COURSES.map((c) => `<option value="${c.id}">${c.name}</option>`).join("")}</select></label><p class="description" id="description"></p><label>Actor capabilities<select id="profile">${PROFILES.map((p, i) => `<option value="${String(i)}">${p.name}</option>`).join("")}</select></label><div class="controls"><button class="primary wide" id="try">Try course</button><button id="pause">Pause</button><button id="reset">Reset</button><button id="stop">Release input</button><button id="step">One tick</button><button class="wide" id="scenario-tick">Reset + one tick</button><button class="wide" id="stop-leader">Stop second actor</button></div><label>Pause automatically at<select id="pause-at"><option value="none">Keep running</option><option value="alignment">Alignment</option><option value="preparation">Preparation</option><option value="flight">Takeoff</option><option value="recovery">Landing</option></select></label><label>Keyboard controls<select id="actor"><option value="player">Humanoid / test actor</option><option value="robot">Second actor (conflict courses)</option></select></label><button id="cross">Second actor: approach landing</button><label class="check"><input type="checkbox" id="bounds"/>Show body clearance</label><div class="phases"><span data-phase="ground"></span><span data-phase="alignment"></span><span data-phase="preparation"></span><span data-phase="flight"></span><span data-phase="recovery"></span></div><div class="stats" id="stats"></div><div id="error" role="alert"></div><details><summary>What this experiment tests</summary><p>Gold squares show required support. Blue wireframes show the separate body clearance. Appearance does not set either rule.</p><p>Exact contact and simultaneous motion use the same kernel as adaptive traversal. Blue body outlines show clearance; turn them on to inspect touching. Job and movement decisions are not simulated.</p><p>Courses use static geometry and a few actors. Flight protection compares matching times and retains safe landing occupancy. Contact-clipped ticks use a straight segment to the accepted integer endpoint. Search failures do not prove every possible trajectory impossible. This is not a scale benchmark.</p><div class="stats" id="diagnostics"></div></details><p class="note">Throwaway prototype · accepted experiment · 20 Sep 2026<br>Production gameplay remains on its normal entry.</p></aside></div>`;
function element<T extends Element>(
  selector: string,
  type: new (...args: never[]) => T
): T {
  const e = document.querySelector(selector);
  if (!(e instanceof type)) {
    throw new Error(`Missing ${selector}`);
  }
  return e;
}
const world = element(".world", HTMLElement),
  courseSelect = element("#course", HTMLSelectElement),
  profileSelect = element("#profile", HTMLSelectElement),
  pauseAt = element("#pause-at", HTMLSelectElement),
  actorSelect = element("#actor", HTMLSelectElement),
  bounds = element("#bounds", HTMLInputElement);
bounds.checked = true;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor("#223743");
world.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog("#223743", 22, 55);
scene.add(new THREE.HemisphereLight("#dcecf0", "#5f4b43", 2.4));
const sun = new THREE.DirectionalLight("#ffddaa", 3);
sun.position.set(-5, 10, 4);
scene.add(sun);
const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 100),
  orbit = new ThirdPersonCamera();
orbit.zoom = 0.33;
let heading = -Math.PI / 3,
  course = COURSES[0];
if (!course) {
  throw new Error("Missing courses");
}
let simulation = createTraversal(setupCourse(course, { ...HUMANOID })),
  state = simulation.initial();
const scenery = new THREE.Group();
scene.add(scenery);
const actorViews = new Map<
  string,
  {
    group: THREE.Group;
    visual: THREE.Group;
    left: THREE.Mesh;
    right: THREE.Mesh;
    bounds: THREE.LineSegments;
    distance: number;
    last: THREE.Vector3;
  }
>();
const keys = new Set<string>();
let secondStartTick: number | null = null;
let pending: Command[] = [],
  lastCommand: number | null = null,
  auto = false,
  credit = 0,
  lastTime = performance.now(),
  maxStep = 0,
  autoPauseUsed = false;
const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
function addBox(
  parent: THREE.Group,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  color: string
) {
  const mesh = new THREE.Mesh(
    boxGeometry,
    new THREE.MeshStandardMaterial({ color, roughness: 1 })
  );
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  parent.add(mesh);
  return mesh;
}
function disposeGroup(group: THREE.Group) {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
      if (
        child.geometry instanceof THREE.BufferGeometry &&
        child.geometry !== boxGeometry
      ) {
        child.geometry.dispose();
      }
      const materials: unknown[] = Array.isArray(child.material)
        ? child.material
        : [child.material];
      for (const m of materials) {
        if (m instanceof THREE.Material) {
          m.dispose();
        }
      }
    }
  });
  group.clear();
}
function build() {
  disposeGroup(scenery);
  for (const view of actorViews.values()) {
    scene.remove(view.group);
    disposeGroup(view.group);
  }
  actorViews.clear();
  for (const b of course?.boxes ?? []) {
    const mesh = addBox(
      scenery,
      (b.minX + b.maxX) / 2000,
      (b.minY + b.maxY) / 2000,
      (b.minZ + b.maxZ) / 2000,
      (b.maxX - b.minX) / 1000,
      (b.maxY - b.minY) / 1000,
      (b.maxZ - b.minZ) / 1000,
      b.minY > 0 ? "#81969a" : b.maxY <= 0 ? "#b4a98e" : "#c48668"
    );
    if (b.minY > 0) {
      mesh.material.transparent = true;
      mesh.material.opacity = 0.22;
      mesh.material.depthWrite = false;
    }
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry),
      new THREE.LineBasicMaterial({
        color: "#243d46",
        transparent: true,
        opacity: 0.3,
      })
    );
    edges.scale.copy(mesh.scale);
    edges.position.copy(mesh.position);
    scenery.add(edges);
  }
  const grid = new THREE.GridHelper(12, 24, "#4f6264", "#6b7975");
  grid.position.y = 0.002;
  scenery.add(grid);
  for (const a of state.actors) {
    const group = new THREE.Group();
    scene.add(group);
    const visual = new THREE.Group();
    group.add(visual);
    visual.rotation.y =
      (-(course?.heading ?? 0) * Math.PI * 2) / 65536 - Math.PI / 2;
    visual.scale.setScalar(a.capabilities.support / HUMANOID.support);
    const color = a.id === "player" ? "#e9e2cd" : "#83b8c2";
    addBox(visual, 0, 0.68, 0, 0.55, 0.7, 0.35, color);
    addBox(visual, 0, 1.23, 0, 0.42, 0.42, 0.42, "#424c62");
    addBox(visual, 0, 1.25, -0.22, 0.3, 0.13, 0.03, "#8ce6bd");
    addBox(visual, 0, 0.76, 0.25, 0.43, 0.45, 0.22, "#bf9a79");
    const left = addBox(visual, -0.14, 0.18, 0, 0.16, 0.38, 0.22, "#3e2c35"),
      right = addBox(visual, 0.14, 0.18, 0, 0.16, 0.38, 0.22, "#3e2c35");
    const size = a.capabilities.support / 1000;
    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(size, 0.004, size)),
      new THREE.LineBasicMaterial({ color: "#ffce71" })
    );
    outline.position.y = 0.005;
    // Physics outlines are world-axis aligned, so attached separately from facing avatar.
    const wire = new THREE.LineSegments(
      new THREE.EdgesGeometry(
        new THREE.BoxGeometry(
          a.capabilities.width / 1000,
          a.capabilities.height / 1000,
          a.capabilities.width / 1000
        )
      ),
      new THREE.LineBasicMaterial({
        color: "#8dcbd6",
        transparent: true,
        opacity: 0.5,
      })
    );
    wire.position.y = a.capabilities.height / 2000;
    group.add(outline, wire);
    actorViews.set(a.id, {
      group,
      visual,
      left,
      right,
      bounds: wire,
      distance: 0,
      last: new THREE.Vector3(
        a.motion.x / 1000,
        a.motion.y / 1000,
        a.motion.z / 1000
      ),
    });
  }
}
function updateText() {
  const a = state.actors[0];
  if (!a) {
    return;
  }
  element("#phase", HTMLElement).textContent = state.fault
    ? "Fault"
    : state.paused
      ? "Paused"
      : a.phase === "ground"
        ? "Ready"
        : a.phase.charAt(0).toUpperCase() + a.phase.slice(1);
  element("#feedback", HTMLElement).textContent =
    a.blocked ??
    (auto
      ? "Following course direction"
      : state.paused
        ? "Traversal preserved · resume to continue"
        : "Free movement");
  element("#stats", HTMLElement).textContent =
    `Tick ${String(state.tick)} · phase timer ${String(a.timer)}\nPosition ${String(a.motion.x)}, ${String(a.motion.y)}, ${String(a.motion.z)} mm\nSupport ${String(a.capabilities.support)} mm · body ${String(a.capabilities.width)} mm\nWalking ${String(a.capabilities.speed)} mm/tick · jump ${a.capabilities.jump ? "enabled" : "disabled"}`;
  element("#stats", HTMLElement).textContent += state.actors
    .slice(1)
    .map(
      (other) =>
        `\nSecond actor: ${String(other.motion.x)}, ${String(other.motion.y)}, ${String(other.motion.z)} mm · ${other.phase}`
    )
    .join("");
  element("#diagnostics", HTMLElement).textContent =
    `Successful search candidates tested: ${String(state.trials)}\nLargest tick observed: ${maxStep.toFixed(2)} ms\nResidues ${String(a.motion.rx)}, ${String(a.motion.rz)}\nFlight speed ${String(a.plan?.speed ?? 0)} · delay ${String(a.plan?.delay ?? 0)}`;
  element("#error", HTMLElement).textContent = state.fault ?? "";
  element("#pause", HTMLButtonElement).textContent = state.paused
    ? "Resume"
    : "Pause";
  for (const e of document.querySelectorAll<HTMLElement>("[data-phase]")) {
    e.classList.toggle("active", e.dataset.phase === a.phase);
  }
}
function load() {
  const next = COURSES.find((c) => c.id === courseSelect.value),
    profile = PROFILES[Number(profileSelect.value)];
  if (!next || !profile) {
    return;
  }
  course = next;
  if (next.timedCrossing) {
    profileSelect.value = "3";
  }
  profileSelect.disabled = Boolean(next.timedCrossing);
  simulation = createTraversal(setupCourse(next, profile.capabilities));
  state = simulation.initial();
  keys.clear();
  pending = [];
  secondStartTick = null;
  lastCommand = null;
  auto = false;
  credit = 0;
  maxStep = 0;
  autoPauseUsed = false;
  heading = -Math.PI / 3;
  element("#course-title", HTMLElement).textContent = next.name;
  element("#description", HTMLElement).textContent = next.description;
  actorSelect.value = "player";
  actorSelect.disabled = state.actors.length < 2;
  element("#cross", HTMLButtonElement).disabled = state.actors.length < 2;
  build();
  updateText();
}
function pause() {
  state = simulation.pause(state, !state.paused);
  keys.clear();
  pending = [];
  lastCommand = null;
  credit = 0;
  if (
    !state.paused &&
    (state.actors[0]?.phase === "ground" ||
      state.actors[0]?.phase === "recovery")
  ) {
    pending.push({ actor: actorSelect.value, heading: null });
  }
  updateText();
}
function issue(command: Command) {
  if (!state.paused) {
    pending.push(command);
  }
}
function tick() {
  if (state.paused || state.fault) {
    return;
  }
  if (
    secondStartTick !== null &&
    state.tick >= secondStartTick &&
    course?.otherHeading !== undefined
  ) {
    pending.push({ actor: "robot", heading: course.otherHeading });
    secondStartTick = null;
  }
  const before = state.actors[0]?.phase;
  const start = performance.now();
  state = simulation.step(state, pending);
  if (
    course?.timedCrossing &&
    state.actors.some((a) => a.id === "robot" && a.phase === "recovery")
  ) {
    pending = [{ actor: "robot", heading: null }];
  } else {
    pending = [];
  }
  maxStep = Math.max(maxStep, performance.now() - start);
  const a = state.actors[0];
  if (
    a &&
    ((auto && (a.phase === "recovery" || a.blocked)) ||
      (!auto && a.phase === "recovery" && keys.size === 0))
  ) {
    auto = false;
    pending.push({ actor: "player", heading: null });
  }
  if (a && !autoPauseUsed && pauseAt.value === a.phase && before !== a.phase) {
    autoPauseUsed = true;
    state = simulation.pause(state, true);
    keys.clear();
    lastCommand = null;
  }
  updateText();
}
function movement() {
  const resolved = resolvePrototypeHeading(keys, heading);
  if (resolved !== lastCommand) {
    auto = false;
    issue({ actor: actorSelect.value, heading: resolved });
    lastCommand = resolved;
  }
}
courseSelect.addEventListener("change", load);
profileSelect.addEventListener("change", load);
element("#reset", HTMLButtonElement).addEventListener("click", load);
element("#pause", HTMLButtonElement).addEventListener("click", pause);
element("#try", HTMLButtonElement).addEventListener("click", () => {
  if (!course) {
    return;
  }
  autoPauseUsed = false;
  state = simulation.pause(state, false);
  auto = true;
  pending = [{ actor: "player", heading: course.heading }];
  if (course.otherHeading !== undefined) {
    if (course.timedCrossing) {
      secondStartTick = state.tick + 8;
    } else {
      pending.push({ actor: "robot", heading: course.otherHeading });
    }
  }
  lastCommand = null;
  updateText();
});
element("#stop", HTMLButtonElement).addEventListener("click", () => {
  auto = false;
  keys.clear();
  lastCommand = null;
  issue({ actor: actorSelect.value, heading: null });
});
element("#cross", HTMLButtonElement).addEventListener("click", () => {
  if (state.actors.some((a) => a.id === "robot")) {
    issue({ actor: "robot", heading: 49152 });
  }
});
element("#step", HTMLButtonElement).addEventListener("click", () => {
  state = simulation.pause(state, false);
  tick();
  state = simulation.pause(state, true);
  updateText();
});
element("#scenario-tick", HTMLButtonElement).addEventListener("click", () => {
  load();
  if (!course) {
    return;
  }
  pending = [{ actor: "player", heading: course.heading }];
  if (course.otherHeading !== undefined) {
    if (course.timedCrossing) {
      secondStartTick = state.tick + 8;
    } else {
      pending.push({ actor: "robot", heading: course.otherHeading });
    }
  }
  tick();
  state = simulation.pause(state, true);
  updateText();
});
element("#stop-leader", HTMLButtonElement).addEventListener("click", () => {
  if (state.actors.some((a) => a.id === "robot")) {
    issue({ actor: "robot", heading: null });
  }
});
window.addEventListener("keydown", (event) => {
  if (
    event.target instanceof HTMLSelectElement ||
    event.target instanceof HTMLInputElement
  ) {
    return;
  }
  if (event.code === "Escape") {
    event.preventDefault();
    if (!event.repeat) {
      pause();
    }
    return;
  }
  if (
    [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "KeyQ",
      "KeyE",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "Space",
    ].includes(event.code)
  ) {
    event.preventDefault();
    if (!state.paused) {
      keys.add(event.code);
      movement();
    }
  }
  if (event.code === "Home") {
    heading = -Math.PI / 3;
  }
});
window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
  if (!state.paused) {
    movement();
  }
});
window.addEventListener("blur", () => {
  keys.clear();
  lastCommand = null;
  if (!state.paused) {
    issue({ actor: actorSelect.value, heading: null });
  }
});
world.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    orbit.scroll(event.deltaY, event.deltaMode);
  },
  { passive: false }
);
function renderActor(a: Actor) {
  const view = actorViews.get(a.id);
  if (!view) {
    return;
  }
  const position = new THREE.Vector3(
    a.motion.x / 1000,
    a.motion.y / 1000,
    a.motion.z / 1000
  );
  const dx = position.x - view.last.x,
    dz = position.z - view.last.z;
  if (dx !== 0 || dz !== 0) {
    view.visual.rotation.y = Math.atan2(-dx, -dz);
  }
  view.distance += Math.hypot(dx, dz);
  view.last.copy(position);
  view.group.position.copy(position);
  view.left.rotation.x = Math.sin(view.distance * 3) * 0.4;
  view.right.rotation.x = -view.left.rotation.x;
  // Render meshes keep selected B stance; clearance is authored independently.
  view.bounds.visible = bounds.checked;
}
function frame(now: number) {
  const elapsed = now - lastTime;
  lastTime = now;
  const seconds = Math.min(elapsed / 1000, 0.1);
  if (!state.paused) {
    heading +=
      (Number(keys.has("KeyQ") || keys.has("ArrowLeft")) -
        Number(keys.has("KeyE") || keys.has("ArrowRight"))) *
      seconds *
      1.8;
    if (keys.size) {
      movement();
    }
  }
  credit = state.paused
    ? 0
    : elapsed > 100
      ? 1000 / 60
      : Math.min(100, credit + elapsed);
  while (credit >= 1000 / 60 && !state.paused) {
    tick();
    credit -= 1000 / 60;
  }
  for (const a of state.actors) {
    renderActor(a);
  }
  const a = state.actors[0];
  if (a) {
    const width = world.clientWidth,
      height = world.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const frame = orbit.frame(
      {
        x: a.motion.x / 1000,
        y: a.motion.y / 1000 + 1.6,
        z: a.motion.z / 1000,
      },
      heading,
      0,
      camera.aspect
    );
    camera.position.set(frame.position.x, frame.position.y, frame.position.z);
    camera.lookAt(frame.target.x, frame.target.y, frame.target.z);
    camera.updateProjectionMatrix();
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
load();
requestAnimationFrame(frame);
