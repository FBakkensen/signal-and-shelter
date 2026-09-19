import type { GameState, Obstacle } from "./game.ts";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  heightAt,
  hash,
  terrainQuads,
  makeTrees,
  LANDMARKS,
  SIZE,
  WATER,
} from "./world.ts";

export async function createScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#accfc7");
  scene.fog = new THREE.Fog("#accfc7", 65, 160);
  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 300);
  scene.add(new THREE.HemisphereLight("#f4f2d2", "#66846a", 2.8));
  const sun = new THREE.DirectionalLight("#ffe1a3", 3.3);
  sun.position.set(-25, 55, 25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -50,
    right: 50,
    top: 50,
    bottom: -50,
    near: 1,
    far: 130,
  });
  sun.shadow.normalBias = 0.04;
  scene.add(sun);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  function block(
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    color: string,
  ) {
    if (!materials.has(color)) {
      materials.set(
        color,
        new THREE.MeshStandardMaterial({ color, roughness: 1 }),
      );
    }
    const mesh = new THREE.Mesh(box, materials.get(color));
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  const terrainMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
  });
  for (let cx = -SIZE / 2; cx < SIZE / 2; cx += 16) {
    for (let cz = -SIZE / 2; cz < SIZE / 2; cz += 16) {
      const positions: number[] = [],
        colors: number[] = [];
      for (const quad of terrainQuads(heightAt, cx, cz, 16)) {
        const h = heightAt(quad.x, quad.z);
        const color = new THREE.Color(
          quad.top ? (h <= 2 ? "#d8c494" : "#809650") : "#877a56",
        );
        color.multiplyScalar(0.92 + hash(quad.x, quad.z) * 0.16);
        if (
          quad.top &&
          h > 2 &&
          Math.abs(quad.x) < 2 &&
          quad.z > -3 &&
          quad.z < 20
        ) {
          color.set("#b6a476");
        }
        for (const i of [0, 1, 2, 0, 2, 3] as const) {
          positions.push(...quad.points[i]);
          colors.push(color.r, color.g, color.b);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, terrainMaterial);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      scene.add(mesh);
    }
  }
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 500),
    new THREE.MeshStandardMaterial({
      color: "#5aaba7",
      roughness: 0.5,
      metalness: 0.1,
    }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = WATER;
  scene.add(sea);
  // Sparse, pale water glints keep the surface quiet and graphic.
  const glints = new THREE.Group();
  scene.add(glints);
  for (let i = 0; i < 100; i++) {
    const x = (hash(i, 19) - 0.5) * 160,
      z = (hash(i, 27) - 0.5) * 160;
    if (heightAt(x, z) > 1) {
      continue;
    }
    block(
      glints,
      x,
      WATER + 0.015,
      z,
      1 + hash(i, 32) * 2,
      0.015,
      0.09,
      "#9bc9bb",
    );
  }
  const trees = makeTrees();
  for (const tree of trees) {
    const { x, z, height: h } = tree,
      y = heightAt(x, z);
    block(scene, x, y + h * 0.45, z, 0.48, h * 0.9, 0.48, "#6a6042");
    const shade = hash(x * 2, z * 2) > 0.5 ? "#4d714f" : "#64834c";
    block(scene, x, y + h * 0.8, z, 2.4, 1.5, 2.4, shade);
    block(scene, x, y + h * 0.8 + 1, z, 1.65, 1.2, 1.65, shade);
    block(scene, x, y + h * 0.8 + 1.8, z, 1, 0.75, 1, "#789151");
  }
  for (let i = 0; i < 240; i++) {
    const x = Math.floor(hash(i, 88) * 64 - 32) + 0.5,
      z = Math.floor(hash(i, 99) * 64 - 32) + 0.5,
      y = heightAt(x, z);
    if (y < 3 || Math.abs(x) < 3) {
      continue;
    }
    block(
      scene,
      x,
      y + 0.13,
      z,
      0.13,
      0.26,
      0.13,
      i % 3 === 0 ? "#e6bc71" : "#aeb571",
    );
  }
  const arch = LANDMARKS.find((p) => p.id === "arch");
  const grove = LANDMARKS.find((p) => p.id === "grove");
  const beacon = LANDMARKS.find((p) => p.id === "beacon");
  if (!arch || !grove || !beacon) {
    throw new Error("Missing landmark configuration");
  }
  const ay = heightAt(arch.x, arch.z);
  block(scene, arch.x - 1.8, ay + 2, arch.z, 1.2, 4, 1.5, "#b2ad8a");
  block(scene, arch.x + 1.8, ay + 2, arch.z, 1.2, 4, 1.5, "#a5a282");
  block(scene, arch.x, ay + 4.1, arch.z, 4.8, 1.2, 1.7, "#c1ba94");
  const gy = heightAt(grove.x, grove.z);
  block(scene, grove.x, gy + 2.5, grove.z, 0.85, 5, 0.85, "#7c6650");
  block(scene, grove.x, gy + 5, grove.z, 5, 2, 4.5, "#cba76c");
  block(scene, grove.x - 0.5, gy + 6.4, grove.z, 3.5, 1.3, 3, "#e0bd78");
  const gltf = await new GLTFLoader().loadAsync("/assets/beacon.glb");
  gltf.scene.position.set(beacon.x, heightAt(beacon.x, beacon.z), beacon.z);
  gltf.scene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  scene.add(gltf.scene);
  const avatar = new THREE.Group();
  scene.add(avatar);
  block(avatar, 0, 0.68, 0, 0.55, 0.7, 0.35, "#c7764d");
  block(avatar, 0, 1.23, 0, 0.42, 0.42, 0.42, "#efd3a0");
  block(avatar, 0, 1.46, 0, 0.62, 0.12, 0.6, "#d9ba77");
  block(avatar, 0, 1.58, 0, 0.38, 0.16, 0.37, "#d9ba77");
  block(avatar, 0, 0.76, 0.25, 0.43, 0.45, 0.22, "#495e4d");
  const left = block(avatar, -0.17, 0.18, 0, 0.18, 0.38, 0.22, "#394c45");
  const right = block(avatar, 0.17, 0.18, 0, 0.18, 0.38, 0.22, "#394c45");
  const obstacles: Obstacle[] = [
    ...trees,
    { x: arch.x - 1.8, z: arch.z, radius: 0.85 },
    { x: arch.x + 1.8, z: arch.z, radius: 0.85 },
    { x: grove.x, z: grove.z, radius: 0.6 },
    { x: beacon.x, z: beacon.z, radius: 1.25 },
  ];
  const aim = new THREE.Vector3(),
    desired = new THREE.Vector3();
  let initialized = false;
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);
  function render(
    state: GameState,
    dt: number,
    time: number,
    started: boolean,
  ) {
    const y = heightAt(state.x, state.z);
    avatar.position.set(state.x, y, state.z);
    avatar.rotation.y = state.yaw;
    left.rotation.x = Math.sin(state.distance * 3) * 0.4;
    right.rotation.x = -left.rotation.x;
    const overview = state.overview || !started;
    if (overview) {
      desired.set(49, 53, 66);
      aim.set(0, 2, 0);
    } else {
      desired.set(
        state.x + Math.sin(state.yaw) * 15,
        y + 12,
        state.z + Math.cos(state.yaw) * 15,
      );
      aim.set(state.x, y + 1.1, state.z);
    }
    camera.position.lerp(desired, initialized ? 1 - Math.exp(-dt * 5) : 1);
    camera.lookAt(aim);
    initialized = true;
    glints.position.y = Math.sin(time * 0.4) * 0.015;
    renderer.render(scene, camera);
  }
  return { render, obstacles };
}
