// THROWAWAY playable study; archive this branch, never merge this entry into production.
import * as THREE from "three";
import { NavigationStudy, PRESETS, BOUNDS } from "./navigation-prototype-model.ts";
import type { Course } from "./navigation-prototype-model.ts";
import { ThirdPersonCamera } from "./camera.ts";
import "./navigation-prototype.css";

document.body.innerHTML = `
<canvas id="study-world" tabindex="0" aria-label="Navigation study. Right-click to move; WASD walk; Q E orbit; wheel zoom; Escape pause."></canvas>
<header><strong>Signal & Shelter</strong><span>THROWAWAY / NAVIGATION STUDY</span><button id="pause-study">Pause</button></header>
<aside id="study-panel">
<h1>How should a jump feel?</h1>
<p>Try short preparation and landing pauses. A faster walking detour can beat a jumping shortcut.</p>
<label>Course<select id="course"><option value="terraces">1 · Terraces</option><option value="detour">2 · Jump or detour</option><option value="frontier">3 · Explore toward a target</option><option value="clearance">4 · Low ceiling</option></select></label>
<label>Timing<select id="timing"><option value="brisk">A · Brisk — 0.12 / 0.12 s</option><option value="deliberate" selected>B · Deliberate — 0.25 / 0.30 s</option><option value="weighty">C · Weighty — 0.45 / 0.50 s</option></select></label>
<label>Maximum climb<select id="climb"><option value="0.5">0.5 m</option><option value="1" selected>1.0 m</option></select></label>
<div class="actions"><button id="reset-study">Restart course</button><button id="terminal-study">Use terminal</button></div>
<details><summary>What to try</summary><p id="guide"></p><p>Right-click the world, including fog. WASD takes over. Q/E orbit; scroll to zoom. Space, Ctrl and Shift have no gameplay action.</p><p>The cube beside your starting point is a test terminal. Approach within 3.2 m to use it.</p></details>
<details><summary>Study limitations</summary><p>Controlled course; four-direction grid movement and a simplified collision-checked jump arc. Airborne steering is not implemented in this first study. This does not establish production physics, seeded-island traversal or final navigation architecture.</p></details>
</aside>
<footer><strong id="status"></strong><span id="stats"></span><span id="hint">Right-click a destination · WASD walk · Q/E orbit · scroll zoom</span></footer>
<section id="pause-dialog" class="dialog" hidden><h2>Paused</h2><p>Position, destination and jump phase are preserved.</p><button id="resume-study">Resume</button></section>
<section id="terminal-dialog" class="dialog" hidden><h2>Ship link · test terminal</h2><p>The world keeps running. Gameplay keyboard controls are inactive here.</p><button id="check-link">Check data connection</button><p id="link-status">Connection not checked</p><button id="close-terminal">Return to play</button></section>`;
function element(id: string) {
  const value = document.getElementById(id);
  if (!value) { throw new Error(`Missing ${id}`); }
  return value;
}
function select(id: string) {
  const value = element(id);
  if (!(value instanceof HTMLSelectElement)) { throw new Error(`Expected select: ${id}`); }
  return value;
}
const canvasElement = element("study-world");
if (!(canvasElement instanceof HTMLCanvasElement)) { throw new Error("Missing canvas"); }
const canvas: HTMLCanvasElement = canvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color("#292d38");
scene.add(new THREE.HemisphereLight(0xffe8cc, 0x575877, 2.5));
const sun = new THREE.DirectionalLight(0xffdfb4, 3); sun.position.set(-10, 25, 12); scene.add(sun);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 180);
const framing = new ThirdPersonCamera(); framing.zoom = 0.68;
let heading = 0;
let study = new NavigationStudy();
let world = new THREE.Group();
const blocks: { mesh: THREE.Mesh; x: number; z: number }[] = [];
const body = new THREE.Group();
function box(w: number, h: number, d: number, color: string) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
}
const torso = box(0.48, 0.8, 0.34, "#eab883"); torso.position.y = 1.05; body.add(torso);
const head = box(0.42, 0.4, 0.4, "#f2ddbb"); head.position.y = 1.65; body.add(head);
const visor = box(0.3, 0.12, 0.03, "#5da9b0"); visor.position.set(0, 1.65, -0.215); body.add(visor);
for (const x of [-0.16, 0.16]) { const leg = box(0.2, 0.65, 0.25, "#747b89"); leg.position.set(x, 0.325, 0); body.add(leg); }
scene.add(body);
const marker = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.045, 6, 24), new THREE.MeshBasicMaterial({ color: "#ffcf8c", depthTest: false }));
marker.rotation.x = Math.PI / 2; marker.renderOrder = 10; scene.add(marker);
const flag = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.35, 4), new THREE.MeshBasicMaterial({ color: "#ffcf8c", depthTest: false }));
flag.rotation.z = Math.PI; flag.renderOrder = 10; scene.add(flag);
const guides: Record<Course, string> = {
  terraces: "Click beyond the three terraces. Compare jump timing A/B/C. Walk into a step with WASD, then release during preparation. Try taking over while airborne.",
  detour: "Click just beyond the two low bars. Compare A and C: watch the predicted jump count and walking detour. The destination stays the same; only travel costs change.",
  frontier: "Click deep into the dark ground ahead. Watch the destination persist while new ground is revealed. A tall wall needs a detour; a gap near the far edge cannot be crossed.",
  clearance: "Click on the roof or past the low ceiling. The body cannot fit between the ledge and ceiling; it must go around. Too-high targets retain their marker at the closest reachable point.",
};
function buildWorld() {
  scene.remove(world);
  world.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); if (object.material instanceof THREE.Material) { object.material.dispose(); } } });
  world = new THREE.Group(); blocks.length = 0;
  const dark = box(28, 0.1, 16, "#343440"); dark.position.set(4, 0, 0); world.add(dark);
  for (let x = BOUNDS.minX + 0.25; x < BOUNDS.maxX; x += 0.5) {
    for (let z = BOUNDS.minZ + 0.25; z < BOUNDS.maxZ; z += 0.5) {
      const y = study.island.heightAt(x, z);
      if (y < 1.2) { continue; }
      const block = box(0.495, y, 0.495, y > 2 ? "#b7857c" : (Math.floor(x * 2) + Math.floor(z * 2)) % 2 === 0 ? "#87978f" : "#81918a");
      block.position.set(x, y / 2, z); world.add(block); blocks.push({ mesh: block, x, z });
    }
  }
  for (const solid of study.island.solids) {
    for (let x = solid.minX + 0.25; x < solid.maxX; x += 0.5) {
      for (let z = solid.minZ + 0.25; z < solid.maxZ; z += 0.5) {
        const block = box(0.49, solid.maxY - solid.minY, 0.49, "#b590af");
        block.position.set(x, (solid.maxY + solid.minY) / 2, z); world.add(block); blocks.push({ mesh: block, x, z });
      }
    }
  }
  const terminal = box(0.5, 1, 0.5, "#80c8cd"); terminal.position.set(study.island.terminal.x, 2.5, study.island.terminal.z); world.add(terminal);
  scene.add(world); element("guide").textContent = guides[study.course];
}
function configure() {
  const preset = PRESETS[select("timing").value];
  if (preset) { study.configure({ ...preset, climb: Number(select("climb").value) }); }
}
const keys = new Set<string>();
function restart() {
  const selected = select("course").value;
  const course: Course = selected === "detour" || selected === "frontier" || selected === "clearance" ? selected : "terraces";
  study = new NavigationStudy(course); keys.clear(); configure(); buildWorld();
}
select("course").onchange = restart;
select("timing").onchange = configure;
select("climb").onchange = configure;
element("reset-study").onclick = restart;
element("pause-study").onclick = () => { study.pause(); keys.clear(); };
element("resume-study").onclick = () => { study.resume(); canvas.focus(); };
element("terminal-study").onclick = () => { study.openTerminal(); keys.clear(); };
element("close-terminal").onclick = () => { study.closeTerminal(); canvas.focus(); };
element("check-link").onclick = () => { study.linkChecked = true; };
const raycaster = new THREE.Raycaster();
canvas.addEventListener("contextmenu", event => {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
  const hit = raycaster.intersectObjects(blocks.filter(b => b.mesh.visible).map(b => b.mesh))[0];
  const target = hit?.point ?? raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -2), new THREE.Vector3());
  if (target) { study.request({ x: target.x, z: target.z }); }
  canvas.focus();
});
canvas.addEventListener("wheel", event => { event.preventDefault(); framing.scroll(event.deltaY, event.deltaMode); }, { passive: false });
window.addEventListener("keydown", event => {
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) { return; }
  if (event.code === "Escape") { event.preventDefault(); study.pause(); keys.clear(); return; }
  if (study.paused || study.terminal) { return; }
  if (["KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE", "Space"].includes(event.code)) { event.preventDefault(); keys.add(event.code); }
});
window.addEventListener("keyup", event => { keys.delete(event.code); });
window.addEventListener("blur", () => { keys.clear(); study.blur(); });
document.addEventListener("visibilitychange", () => { if (document.hidden) { keys.clear(); study.blur(); } });
let last = performance.now(), uiTime = 0;
function advance() {
  const now = performance.now(), dt = Math.max(0, (now - last) / 1000); last = now;
  if (!study.paused && !study.terminal) {
    heading += ((keys.has("KeyQ") ? 1 : 0) - (keys.has("KeyE") ? 1 : 0)) * dt * 1.8;
    const forward = Number(keys.has("KeyW")) - Number(keys.has("KeyS"));
    const right = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
    const x = right * Math.cos(heading) - forward * Math.sin(heading), z = -forward * Math.cos(heading) - right * Math.sin(heading);
    study.direct(forward || right ? Math.abs(x) > Math.abs(z) ? { x: Math.sign(x), z: 0 } : { x: 0, z: Math.sign(z) } : undefined);
  }
  study.tick(dt);
  uiTime += dt;
  if (uiTime > 0.1) {
    uiTime = 0;
    element("status").textContent = study.paused ? "Paused" : `${study.phase.toUpperCase()} · ${study.message}`;
    element("stats").textContent = `Position ${study.position.x.toFixed(1)}, ${study.position.z.toFixed(1)} · height ${study.position.y.toFixed(2)} m · ${study.elapsed.toFixed(1)} s active · ${study.completedJumps} jumps · ${study.recalculations} route calculations${study.plan ? ` · plan ${study.plan.seconds.toFixed(1)} s / ${study.plan.jumps} jumps` : ""}`;
    element("pause-dialog").hidden = !study.paused;
    element("terminal-dialog").hidden = !study.terminal || study.paused;
    element("link-status").textContent = study.linkChecked ? "Connection established" : "Connection not checked";
  }
}
// A timer continues model ticks in background tabs where animation frames are suspended.
window.setInterval(advance, 25);
function render() {
  const width = innerWidth, height = innerHeight;
  if (canvas.width !== Math.round(width * renderer.getPixelRatio()) || canvas.height !== Math.round(height * renderer.getPixelRatio())) { renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); }
  const position = study.position;
  body.position.set(position.x, position.y, position.z);
  body.scale.y = study.phase === "setup" ? 0.87 : study.phase === "recovery" ? 0.92 : 1;
  const frame = framing.frame({ ...position, y: position.y + 1.5 }, heading, 0, camera.aspect);
  camera.position.set(frame.position.x, frame.position.y, frame.position.z); camera.lookAt(frame.target.x, frame.target.y, frame.target.z);
  for (const block of blocks) { block.mesh.visible = study.known(block); }
  marker.visible = Boolean(study.destination); flag.visible = marker.visible;
  if (study.destination) {
    const d = study.destination;
    const y = study.known(d) ? Math.max(2, study.island.heightAt(d.x, d.z)) + 0.08 : 2.08;
    marker.position.set(d.x, y, d.z); flag.position.set(d.x, y + 0.6, d.z);
  }
  renderer.render(scene, camera); requestAnimationFrame(render);
}
buildWorld(); render();
