import type { GameState } from "./game.ts";
import { viewPosition } from "./game.ts";
import { makeObstacles } from "./collision.ts";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { terrainQuads, SIZE, WATER, RESOURCE_CRYSTALS } from "./world.ts";
import type { Island } from "./world.ts";

export async function loadShip() {
  return (await new GLTFLoader().loadAsync("/assets/ship.glb")).scene;
}
export function createScene(
  canvas: HTMLCanvasElement,
  island: Island,
  shipAsset: THREE.Group,
) {
  const { heightAt, hash } = island;
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
  const trees = island.trees;
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
    if (y < 3 || Math.hypot(x - island.ship.x, z - island.ship.z) < 8) {
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
  const ship = shipAsset.clone(true);
  ship.position.set(
    island.ship.x,
    heightAt(island.ship.x, island.ship.z),
    island.ship.z,
  );
  ship.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  scene.add(ship);
  for (const resource of island.resources) {
    const y = heightAt(resource.x, resource.z);
    block(scene, resource.x, y + 0.55, resource.z, 1.8, 1.1, 1.8, "#626e66");
    for (const [dx, dz, h] of RESOURCE_CRYSTALS) {
      block(
        scene,
        resource.x + dx,
        y + 0.7 + h / 2,
        resource.z + dz,
        0.45,
        h,
        0.45,
        resource.color,
      );
    }
  }
  const avatar = new THREE.Group();
  scene.add(avatar);
  block(avatar, 0, 0.68, 0, 0.55, 0.7, 0.35, "#d9decb");
  block(avatar, 0, 1.23, 0, 0.42, 0.42, 0.42, "#537d87");
  block(avatar, 0, 1.25, -0.22, 0.3, 0.13, 0.03, "#8ce6bd");
  block(avatar, 0, 0.76, 0.25, 0.43, 0.45, 0.22, "#495e4d");
  const left = block(avatar, -0.17, 0.18, 0, 0.18, 0.38, 0.22, "#394c45");
  const right = block(avatar, 0.17, 0.18, 0, 0.18, 0.38, 0.22, "#394c45");
  const obstacles = makeObstacles(island);
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);
  function render(state: GameState, time: number, started: boolean) {
    const y = state.y;
    avatar.position.set(state.x, y, state.z);
    avatar.rotation.y = state.yaw;
    left.rotation.x = Math.sin(state.distance * 3) * 0.4;
    right.rotation.x = -left.rotation.x;
    const overview = state.overview || !started;
    avatar.visible = overview;
    const fov = overview ? 44 : 70;
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    if (overview) {
      camera.position.set(49, 53, 66);
      camera.lookAt(0, 2, 0);
    } else {
      const view = viewPosition(state);
      camera.position.set(view.x, view.y, view.z);
      camera.rotation.set(state.pitch, state.yaw, 0, "YXZ");
    }
    glints.position.y = Math.sin(time * 0.4) * 0.015;
    renderer.render(scene, camera);
  }
  function dispose() {
    window.removeEventListener("resize", resize);
    // The shared ship template owns its geometry/materials across world rebuilds.
    scene.remove(ship);
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry instanceof THREE.BufferGeometry) {
          object.geometry.dispose();
        }
        const mats = Array.isArray(object.material)
          ? object.material
          : [object.material];
        for (const mat of mats) {
          if (mat instanceof THREE.Material) {
            mat.dispose();
          }
        }
      }
    });
    sun.shadow.map?.dispose();
    renderer.dispose();
  }
  return { render, obstacles, dispose };
}
