import * as THREE from "three";
import { createAvatar } from "./avatar.ts";
import {
  FEET_VARIANTS,
  supportFitsShelf,
  variantIndex,
} from "./feet-prototype-model.ts";
import "./feet-prototype.css";

function element<T extends Element>(selector: string, type: new () => T): T {
  const value = document.querySelector(selector);
  if (!(value instanceof type)) {
    throw new Error(`Missing ${selector}`);
  }
  return value;
}
const canvas = element("canvas", HTMLCanvasElement);
const heading = element("#heading", HTMLInputElement);
const pose = element("#pose", HTMLInputElement);
const offset = element("#offset", HTMLInputElement);
const shelf = element("#shelf", HTMLSelectElement);
const outlines = element("#outlines", HTMLInputElement);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
scene.background = new THREE.Color("#201b25");
scene.add(new THREE.HemisphereLight("#fff2df", "#665078", 3));
const sun = new THREE.DirectionalLight("#ffe2b5", 3);
sun.position.set(-3, 5, -4);
scene.add(sun);
const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 50);
let view = "angle";
let index = variantIndex(new URL(location.href).searchParams.get("variant"));
let model = createAvatar();
scene.add(model.group);
const platform = new THREE.Group();
scene.add(platform);
const tileGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
const tileMaterial = new THREE.MeshStandardMaterial({
  color: "#b6a69c",
  roughness: 1,
});
const edgeGeometry = new THREE.EdgesGeometry(tileGeometry);
const edgeMaterial = new THREE.LineBasicMaterial({ color: "#6d5d60" });
function rebuildShelf() {
  platform.clear();
  const columns = Number(shelf.value) / 500;
  for (let x = 0; x < columns; x++) {
    for (let z = -2; z <= 2; z++) {
      const tile = new THREE.Mesh(tileGeometry, tileMaterial);
      tile.position.set((x - (columns - 1) / 2) * 0.5, -0.26, z * 0.5);
      tile.add(new THREE.LineSegments(edgeGeometry, edgeMaterial));
      platform.add(tile);
    }
  }
}
function square(color: string) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.5, 0, -0.5),
    new THREE.Vector3(0.5, 0, -0.5),
    new THREE.Vector3(0.5, 0, 0.5),
    new THREE.Vector3(-0.5, 0, 0.5),
  ]);
  const line = new THREE.LineLoop(
    geometry,
    new THREE.LineBasicMaterial({ color, depthTest: false })
  );
  line.renderOrder = 10;
  line.position.y = 0.008;
  scene.add(line);
  return line;
}
const supportOutline = square("#8ce6bd");
const clearanceOutline = square("#e3b86d");
clearanceOutline.scale.setScalar(0.6);
function update() {
  const variant = FEET_VARIANTS[index];
  if (!variant) {
    throw new Error("Unknown variant");
  }
  for (const part of model.group.children) {
    if (
      part instanceof THREE.Mesh &&
      part.material instanceof THREE.MeshStandardMaterial
    ) {
      const faded = view === "top" && !part.name.endsWith("-foot");
      if (part.material.transparent !== faded) {
        part.material.needsUpdate = true;
      }
      part.material.transparent = faded;
      part.material.opacity = faded ? 0.12 : 1;
      part.material.depthWrite = !faded;
    }
  }
  const displacement = Number(offset.value);
  model.group.position.x = displacement / 1000;
  model.group.rotation.y = (Number(heading.value) * Math.PI) / 180;
  model.pose(((Number(pose.value) / 100) * Math.PI) / 6);
  supportOutline.scale.setScalar(variant.supportMm / 1000);
  supportOutline.position.x = clearanceOutline.position.x = displacement / 1000;
  supportOutline.visible = clearanceOutline.visible = outlines.checked;
  const fits = supportFitsShelf(
    variant.supportMm,
    displacement,
    Number(shelf.value)
  );
  supportOutline.material.color.set(fits ? "#8ce6bd" : "#ff8b86");
  element("#variant-name", HTMLElement).textContent = variant.name;
  element("#description", HTMLElement).textContent = variant.description;
  element("#heading-value", HTMLOutputElement).value = `${heading.value}°`;
  element("#pose-value", HTMLOutputElement).value = `${pose.value}% stride`;
  element("#offset-value", HTMLOutputElement).value = `${offset.value} mm`;
  const status = element("#support-status", HTMLElement);
  status.textContent = `${String(variant.supportMm)} mm proposed support square: ${fits ? "fits on shelf" : "extends beyond shelf"}.`;
  status.style.color = fits ? "#8ce6bd" : "#ff8b86";
  for (const button of document.querySelectorAll("[data-variant]")) {
    button.setAttribute(
      "aria-pressed",
      String(
        button.getAttribute("data-variant") === String.fromCharCode(65 + index)
      )
    );
  }
  renderer.render(scene, camera);
}
function choose(next: number) {
  index = (next + FEET_VARIANTS.length) % FEET_VARIANTS.length;
  const variant = FEET_VARIANTS[index];
  if (!variant) {
    throw new Error("Unknown variant");
  }
  scene.remove(model.group);
  model.dispose();
  model = createAvatar(variant.proportions);
  scene.add(model.group);
  const url = new URL(location.href);
  url.searchParams.set("variant", String.fromCharCode(65 + index));
  history.replaceState(null, "", url);
  update();
}
function resize() {
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  camera.aspect = canvas.clientWidth / canvas.clientHeight;
  const distance = camera.aspect < 1 ? 5.3 : 4.5;
  if (view === "top") {
    camera.position.set(0, distance, 0.001);
    camera.lookAt(0, 0, 0);
  } else if (view === "front") {
    camera.position.set(0, 1.3, -distance);
    camera.lookAt(0, 0.55, 0);
  } else {
    camera.position.set(distance * 0.65, 2.6, -distance);
    camera.lookAt(0, 0.45, 0);
  }
  camera.updateProjectionMatrix();
  update();
}
for (const input of [heading, pose, offset, shelf, outlines]) {
  input.addEventListener("input", () => {
    rebuildShelf();
    update();
  });
}
for (const name of ["front", "angle", "top"]) {
  element(`#${name}`, HTMLButtonElement).addEventListener("click", () => {
    view = name;
    resize();
  });
}
for (const button of document.querySelectorAll("[data-variant]")) {
  button.addEventListener("click", () => {
    choose(variantIndex(button.getAttribute("data-variant")));
  });
}
element("#previous", HTMLButtonElement).addEventListener("click", () => {
  choose(index - 1);
});
element("#next", HTMLButtonElement).addEventListener("click", () => {
  choose(index + 1);
});
document.addEventListener("keydown", (event) => {
  if (
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLSelectElement ||
    event.target instanceof HTMLTextAreaElement ||
    (event.target instanceof HTMLElement && event.target.isContentEditable)
  ) {
    return;
  }
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    choose(index + (event.key === "ArrowRight" ? 1 : -1));
  }
});
window.addEventListener("resize", resize);
rebuildShelf();
choose(index);
resize();
