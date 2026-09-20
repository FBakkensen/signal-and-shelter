// Throwaway browser harness: normal game entry remains untouched.
import * as THREE from "three";
import { ThirdPersonCamera } from "./camera.ts";
import {
  MovementStudy,
  studyDimensions,
  STUDY_STEP,
} from "./packages/play/movement-prototype.ts";
import type {
  Policy,
  Scenario,
  StudyActor,
} from "./packages/play/movement-prototype.ts";
import "./movement-prototype.css";

const root = document.querySelector<HTMLElement>("#study");
if (!root) {
  throw new Error("Missing study root");
}
root.innerHTML = `<aside>
<div class="eyebrow">SIGNAL & SHELTER / THROWAWAY STUDY</div>
<h1>Who gets the landing?</h1>
<p class="intro">Try movement conflicts before choosing the rules. Amber protects a flight; cyan is you. Robots remain where they land.</p>
<h2>1 · Set the situation</h2>
<label for="scenario">Scenario</label><select id="scenario"><option value="crossing">Competing jump preparations</option><option value="yielding">Enter before robot takeoff</option><option value="landing">Walk into a robot’s landing</option><option value="steering">Steer toward an occupied landing</option><option value="ledges">Inspect body, feet & ledges</option></select>
<div id="motion-controls"><label for="policy">Conflict policy (resets scenario)</label><select id="policy"><option value="protected">Protected completion</option><option value="immediate">Immediate contact only</option></select>
<p id="guide"></p><button id="walkthrough" class="primary">Run the encounter</button><button id="reset">Reset scenario</button>
<h2>2 · Try it yourself</h2><div class="pair"><button id="robot">Robot jump</button><button id="player">Your jump</button></div><div class="pair"><button id="pause">Pause</button><button id="step">Advance 1 tick</button></div>
<p class="hint">WASD moves you; release to stop. During your flight, WASD requests steering. Q/E or ←/→ orbit; wheel zooms. Jump buttons are experiment controls. Space, sprint and sneak are disabled.</p></div>
<div id="ledge-controls"><p>Same avatar dimensions as the game. Cyan: existing 600 × 600 mm clearance body. White: that square used as full support. Feet: two visible 180 × 220 mm blocks, 340 mm apart centre to centre.</p><label for="ledge">Shelf width</label><select id="ledge"><option value="0.5">500 mm · one terrain cell</option><option value="1">1,000 mm · two cells</option></select><label for="offset">Move across the shelf</label><input id="offset" type="range" min="-0.6" max="0.6" step="0.01" value="0"/><p id="support"></p><p>This is a geometry comparison, not a choice of foot size. Visual feet are not an approved collision or support footprint.</p></div>
<details><summary>Experiment limits & event log</summary><p>Uses the current game’s floating-point 120 Hz movement, 4.3 m/s speed and jump arc. Preparation/recovery: 7/60 s each. This is not the accepted integer foundation. Robots yield during preparation. Protection begins at takeoff, shrinks as the flight advances, and ends on landing. It conservatively covers the remaining path, so it can block more than a timed reservation would. No fairness, routing or scale result is claimed. Steering uses the existing controller’s full directional authority; final limited steering remains unresolved.</p><ol id="history"></ol></details>
</aside><section id="viewport"><div id="legend">CYAN · YOU &nbsp; AMBER · ROBOT / PROTECTED SPACE &nbsp; WHITE · LANDING</div><div id="status"><strong id="message"></strong><div id="positions"></div></div></section>`;
function element<T extends HTMLElement>(id: string, type: new () => T): T {
  const value = document.getElementById(id);
  if (!(value instanceof type)) {
    throw new Error(`Missing ${id}`);
  }
  return value;
}
const viewport = element("viewport", HTMLElement);
const scenarioSelect = element("scenario", HTMLSelectElement);
const policySelect = element("policy", HTMLSelectElement);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
viewport.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color("#263342");
scene.add(new THREE.HemisphereLight("#d9f5ff", "#625448", 2.8));
const sun = new THREE.DirectionalLight("#fff0d9", 3);
sun.position.set(4, 10, 5);
scene.add(sun);
const camera = new THREE.PerspectiveCamera(55, 1, 0.01, 100);
const cameraControl = new ThirdPersonCamera();
cameraControl.zoom = 0.55;
let heading = 0;
const floor = new THREE.Mesh(
  new THREE.BoxGeometry(12, 0.25, 10),
  new THREE.MeshStandardMaterial({ color: "#66717b", roughness: 1 })
);
floor.position.y = 2.875;
scene.add(floor);
const grid = new THREE.GridHelper(12, 24, "#aab4b9", "#798793");
grid.position.y = 3.005;
scene.add(grid);
function block(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: string
) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color })
  );
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}
function avatar(color: string) {
  const group = new THREE.Group();
  // Exact authored dimensions in scene.ts; retained here as an explicit render fixture.
  block(group, 0, 0.68, 0, 0.55, 0.7, 0.35, color);
  block(group, 0, 1.23, 0, 0.42, 0.42, 0.42, "#424c62");
  block(group, 0, 1.25, -0.22, 0.3, 0.13, 0.03, "#8ce6bd");
  block(group, 0, 0.76, 0.25, 0.43, 0.45, 0.22, "#9e7657");
  block(group, -0.17, 0.18, 0, 0.18, 0.38, 0.22, "#ece7d7");
  block(group, 0.17, 0.18, 0, 0.18, 0.38, 0.22, "#ece7d7");
  const wire = new THREE.LineSegments(
    new THREE.EdgesGeometry(
      new THREE.BoxGeometry(
        studyDimensions.radius * 2,
        studyDimensions.height,
        studyDimensions.radius * 2
      )
    ),
    new THREE.LineBasicMaterial({ color })
  );
  wire.position.y = studyDimensions.height / 2;
  group.add(wire);
  const support = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.01, 0.6),
    new THREE.MeshBasicMaterial({ color: "#ffffff", wireframe: true })
  );
  support.position.y = 0.012;
  group.add(support);
  scene.add(group);
  return group;
}
const playerMesh = avatar("#7fddce"),
  robotMesh = avatar("#edb477");
const marker = new THREE.Mesh(
  new THREE.RingGeometry(0.34, 0.4, 32),
  new THREE.MeshBasicMaterial({ color: "#fff4da", side: THREE.DoubleSide })
);
marker.rotation.x = -Math.PI / 2;
marker.position.y = 3.012;
scene.add(marker);
const corridor = new THREE.Group();
scene.add(corridor);
const corridorGeometry = new THREE.BoxGeometry(0.6, 0.015, 0.6);
const corridorMaterial = new THREE.MeshBasicMaterial({
  color: "#f6b867",
  transparent: true,
  opacity: 0.14,
  depthWrite: false,
});
const shelf = new THREE.Mesh(
  new THREE.BoxGeometry(1, 0.5, 2),
  new THREE.MeshStandardMaterial({ color: "#ba9774" })
);
shelf.position.set(0, 3.25, 0);
shelf.visible = false;
scene.add(shelf);
let study = new MovementStudy("protected", "crossing");
let ledges = false;
const keys = new Set<string>();
let walkthrough = false;
let walkthroughTick = 0;
let accumulator = 0;
const guides: Record<Scenario, string> = {
  crossing:
    "Both actors prepare crossing jumps. In protected mode, the robot cancels its preparation for you. After takeoff, the jump has priority.",
  yielding:
    "Walk into the robot’s intended landing while it prepares. In protected mode, it cancels takeoff and lets you continue.",
  landing:
    "The robot starts jumping. You walk onto its landing and release movement. Does protecting its flight restrict you acceptably?",
  steering:
    "You jump past a stationary robot. Steer diagonally toward it. Compare declined steering with immediate contact.",
};
function reset() {
  const scenario = scenarioSelect.value;
  ledges = scenario === "ledges";
  const selected: Scenario =
    scenario === "landing" || scenario === "steering" || scenario === "yielding"
      ? scenario
      : "crossing";
  const policy: Policy =
    policySelect.value === "immediate" ? "immediate" : "protected";
  study = new MovementStudy(policy, selected);
  keys.clear();
  walkthrough = false;
  accumulator = 0;
  element("guide", HTMLElement).textContent = guides[selected];
  element("motion-controls", HTMLElement).style.display = ledges
    ? "none"
    : "block";
  element("ledge-controls", HTMLElement).style.display = ledges
    ? "block"
    : "none";
  element("pause", HTMLButtonElement).textContent = "Pause";
  cameraControl.zoom = ledges ? 0.25 : 0.55;
  heading = 0;
}
scenarioSelect.onchange = reset;
policySelect.onchange = reset;
element("reset", HTMLButtonElement).onclick = reset;
element("robot", HTMLButtonElement).onclick = () => {
  walkthrough = false;
  study.jump("robot");
};
element("player", HTMLButtonElement).onclick = () => {
  walkthrough = false;
  study.jump("player");
};
element("pause", HTMLButtonElement).onclick = () => {
  study.paused = !study.paused;
  keys.clear();
  element("pause", HTMLButtonElement).textContent = study.paused
    ? "Resume"
    : "Pause";
};
element("step", HTMLButtonElement).onclick = () => {
  study.paused = false;
  study.step(keys, heading);
  study.paused = true;
  element("pause", HTMLButtonElement).textContent = "Resume";
};
element("walkthrough", HTMLButtonElement).onclick = () => {
  reset();
  walkthrough = true;
  walkthroughTick = 0;
  if (study.scenario === "steering") {
    study.jump("player");
  } else {
    study.jump("robot");
    if (study.scenario === "crossing") {
      study.jump("player");
    }
  }
};
window.addEventListener("keydown", (event) => {
  if (
    event.target instanceof HTMLSelectElement ||
    event.target instanceof HTMLInputElement
  ) {
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
      "Space",
    ].includes(event.code)
  ) {
    event.preventDefault();
    keys.add(event.code);
    walkthrough = false;
  }
});
window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});
window.addEventListener("blur", () => {
  keys.clear();
});
viewport.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    cameraControl.scroll(event.deltaY, event.deltaMode);
  },
  { passive: false }
);
function step() {
  let movement = keys;
  if (walkthrough) {
    movement = new Set();
    if (
      (study.scenario === "landing" || study.scenario === "yielding") &&
      walkthroughTick < 35
    ) {
      movement.add("KeyW");
    }
    if (
      study.scenario === "steering" &&
      walkthroughTick >= 20 &&
      walkthroughTick < 105
    ) {
      movement.add("KeyW");
      movement.add("KeyD");
    }
    if (!study.paused && !study.fault) {
      walkthroughTick++;
    }
    if (walkthroughTick > 160) {
      walkthrough = false;
    }
  }
  study.step(movement, heading);
}
function pose(mesh: THREE.Group, actor: StudyActor) {
  mesh.position.set(actor.state.x, actor.state.y, actor.state.z);
  // Keep fixture body axis-aligned to make its square clearance easy to inspect.
}
let previous = performance.now();
function render(now: number) {
  const seconds = Math.min((now - previous) / 1000, 0.05);
  previous = now;
  if (!ledges) {
    accumulator += seconds;
    while (accumulator >= STUDY_STEP) {
      step();
      accumulator -= STUDY_STEP;
    }
  }
  heading +=
    (Number(keys.has("KeyE") || keys.has("ArrowRight")) -
      Number(keys.has("KeyQ") || keys.has("ArrowLeft"))) *
    seconds *
    1.8;
  robotMesh.visible = !ledges;
  shelf.visible = ledges;
  marker.visible = !ledges;
  pose(playerMesh, study.player);
  pose(robotMesh, study.robot);
  marker.position.set(study.robotLanding.x, 3.012, study.robotLanding.z);
  corridor.clear();
  if (!ledges && study.policy === "protected") {
    for (const actor of [study.robot, study.player]) {
      if (actor.phase !== "airborne") {
        continue;
      }
      for (let i = 0; i < actor.path.length; i += 4) {
        const sample = actor.path[i];
        if (sample) {
          const mesh = new THREE.Mesh(corridorGeometry, corridorMaterial);
          mesh.position.set(sample.x, 3.025, sample.z);
          corridor.add(mesh);
        }
      }
    }
  }
  let anchor = {
    x: study.player.state.x,
    y: study.player.state.y + 1.62,
    z: study.player.state.z,
  };
  let message =
    study.fault ||
    (study.paused
      ? "Paused — state and flight protection preserved."
      : study.message);
  if (ledges) {
    const width = Number(element("ledge", HTMLSelectElement).value);
    const offset = Number(element("offset", HTMLInputElement).value);
    shelf.scale.x = width;
    playerMesh.position.set(offset, 3.5, 0);
    anchor = { x: 0, y: 4.6, z: 0 };
    const support = Math.abs(offset) + 0.3 <= width / 2 + 1e-7;
    message = support
      ? "The entire 600 mm square is supported."
      : "The 600 mm square overhangs this shelf — full support fails.";
    element("support", HTMLElement).textContent =
      `${String(Math.round(offset * 1000))} mm offset. ${message}`;
  }
  const frame = cameraControl.frame(
    anchor,
    heading,
    0,
    viewport.clientWidth / viewport.clientHeight
  );
  camera.position.set(frame.position.x, frame.position.y, frame.position.z);
  camera.lookAt(frame.target.x, frame.target.y, frame.target.z);
  const width = viewport.clientWidth,
    height = viewport.clientHeight;
  if (
    renderer.domElement.width !==
      Math.round(width * renderer.getPixelRatio()) ||
    renderer.domElement.height !== Math.round(height * renderer.getPixelRatio())
  ) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  element("message", HTMLElement).textContent = message;
  element("status", HTMLElement).classList.toggle(
    "fault",
    Boolean(study.fault)
  );
  element("positions", HTMLElement).textContent = ledges
    ? "Static geometry inspection · no footprint selected"
    : `Tick ${String(study.tick)} · You: ${study.player.phase} (${study.player.state.x.toFixed(2)}, ${study.player.state.z.toFixed(2)}) · Robot: ${study.robot.phase} (${study.robot.state.x.toFixed(2)}, ${study.robot.state.z.toFixed(2)})`;
  element("history", HTMLElement).replaceChildren(
    ...study.history.map((message) => {
      const li = document.createElement("li");
      li.textContent = message;
      return li;
    })
  );
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
reset();
requestAnimationFrame(render);
