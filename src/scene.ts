import { createAvatar } from "./avatar.ts";
import { createExplorationFog } from "./exploration-fog.ts";
import { exploredAt } from "./packages/play/exploration.ts";
import { createAtlas } from "./atlas.ts";
import type { Rect } from "./atlas.ts";
import type { Exploration } from "./packages/play/index.ts";
import type { CameraFrame, Position3 } from "./camera.ts";
import { createPicker } from "./picking.ts";
import { createOcclusion } from "./occlusion.ts";
import { createResourceGroup } from "./resources.ts";
import { WORLD_PALETTE, ventParts } from "./packages/island/geometry.ts";
import type { PlayState } from "./packages/play/index.ts";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  terrainQuads,
  SIZE,
  HAZE_LEVEL,
  CELL_SIZE,
} from "./packages/island/geometry.ts";
import type { Island } from "./packages/island/index.ts";

export async function loadShip() {
  return (await new GLTFLoader().loadAsync("/assets/ship.glb")).scene;
}
export function createScene(
  canvas: HTMLCanvasElement,
  island: Island,
  shipAsset: THREE.Group,
  atlasCanvas: HTMLCanvasElement
) {
  const { heightAt, hash } = island;
  const atlas = createAtlas(atlasCanvas, island);
  let atlasAmount = 0;
  let visibleKnowledge: Exploration | undefined;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(WORLD_PALETTE.sky);
  scene.fog = new THREE.Fog(WORLD_PALETTE.sky, 65, 160);
  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 300);
  scene.add(new THREE.HemisphereLight("#f9e9e4", WORLD_PALETTE.strata, 2.8));
  const sun = new THREE.DirectionalLight("#ffe1b0", 3.3);
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
    color: string
  ) {
    if (!materials.has(color)) {
      materials.set(
        color,
        new THREE.MeshStandardMaterial({ color, roughness: 1 })
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
      for (const quad of terrainQuads(heightAt, cx, cz, 16, CELL_SIZE)) {
        const h = heightAt(quad.x, quad.z);
        const color = new THREE.Color(
          quad.top
            ? h <= 2
              ? WORLD_PALETTE.rim
              : WORLD_PALETTE.crust
            : WORLD_PALETTE.strata
        );
        color.multiplyScalar(0.96 + hash(quad.x * 2, quad.z * 2) * 0.08);
        for (const i of [0, 1, 2, 0, 2, 3] as const) {
          positions.push(...quad.points[i]);
          colors.push(color.r, color.g, color.b);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );
      geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, terrainMaterial);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      scene.add(mesh);
    }
  }
  const haze = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 500),
    new THREE.MeshStandardMaterial({ color: WORLD_PALETTE.sky, roughness: 1 })
  );
  haze.rotation.x = -Math.PI / 2;
  haze.position.y = HAZE_LEVEL;
  scene.add(haze);
  // Suspended luminous grains suggest a mineral atmosphere, without water glints.
  const grains = new THREE.Group();
  scene.add(grains);
  for (let i = 0; i < 90; i++) {
    const x = (hash(i, 19) - 0.5) * 150,
      z = (hash(i, 27) - 0.5) * 150;
    if (heightAt(x, z) > HAZE_LEVEL) {
      continue;
    }
    block(
      grains,
      x,
      HAZE_LEVEL + 0.5 + hash(i, 33) * 3,
      z,
      0.09,
      0.09,
      0.09,
      WORLD_PALETTE.light
    );
  }
  for (const vent of island.vents) {
    const y = heightAt(vent.x, vent.z);
    for (const part of ventParts(vent.height)) {
      const [dx, dy, dz] = part.position;
      const [sx, sy, sz] = part.size;
      block(scene, vent.x + dx, y + dy, vent.z + dz, sx, sy, sz, part.color);
    }
  }
  const sky = new THREE.Group();
  scene.add(sky);
  // Distant voxel shelves and a stepped satellite establish an unfamiliar planet.
  for (let i = 0; i < 5; i++) {
    for (let tier = 0; tier < 5; tier++) {
      const width = 12 - tier * 2;
      block(
        scene,
        -70 + i * 32,
        HAZE_LEVEL + tier * 1.5,
        -75 - (i % 2) * 12,
        width,
        1.5,
        width * 0.75,
        WORLD_PALETTE.strata
      );
    }
  }
  for (let tier = -6; tier <= 6; tier++) {
    const width = Math.floor(Math.sqrt(49 - tier * tier)) * 2;
    block(sky, -35, 37 + tier * 2, -85, width, 2, width, "#e4b699");
  }
  const ship = shipAsset.clone(true);
  ship.name = "select:ship";
  ship.position.set(
    island.ship.x,
    heightAt(island.ship.x, island.ship.z),
    island.ship.z
  );
  ship.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  scene.add(ship);
  for (const resource of island.resources) {
    const group = createResourceGroup(resource);
    group.name = `select:${resource.id}`;
    group.position.set(
      resource.x,
      heightAt(resource.x, resource.z),
      resource.z
    );
    scene.add(group);
  }
  const avatarModel = createAvatar();
  const avatar = avatarModel.group;
  scene.add(avatar);
  const visibility = createOcclusion(scene, avatar);
  const fog = createExplorationFog(scene, [avatar, sky]);
  let lastTime = 0;
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);
  function render(
    state: PlayState,
    pose: { ground: Position3; eye: Position3 },
    time: number,
    started: boolean,
    frame: CameraFrame | undefined,
    knowledge: Exploration,
    selection: string | null,
    blend: number,
    obstacles: readonly Rect[]
  ) {
    avatar.position.set(pose.ground.x, pose.ground.y, pose.ground.z);
    avatar.rotation.y = frame?.facing ?? state.yaw;
    avatarModel.pose(state.distance);
    const preview = !started;
    avatar.visible = preview || Boolean(frame);
    const fov = frame?.fov ?? (preview ? 44 : 70);
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    if (frame) {
      camera.position.set(frame.position.x, frame.position.y, frame.position.z);
      camera.lookAt(frame.target.x, frame.target.y, frame.target.z);
    } else if (preview) {
      camera.position.set(49, 53, 66);
      camera.lookAt(0, 2, 0);
    } else {
      camera.position.set(pose.eye.x, pose.eye.y, pose.eye.z);
      camera.rotation.set(state.pitch, state.yaw, 0, "YXZ");
    }
    grains.position.y = Math.sin(time * 0.25) * 0.15;
    visibility.update(camera, time - lastTime, Boolean(frame));
    lastTime = time;
    visibleKnowledge = knowledge;
    fog.update(knowledge);
    renderer.render(scene, camera);
    atlasAmount = started ? blend : 0;
    atlas.render(
      camera,
      knowledge,
      pose.ground,
      frame?.facing ?? state.yaw,
      selection,
      atlasAmount,
      obstacles
    );
  }
  function dispose() {
    window.removeEventListener("resize", resize);
    fog.dispose();
    visibility.dispose();
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
  const pickObject = createPicker(
    scene,
    camera,
    avatar,
    (point) =>
      visibleKnowledge !== undefined &&
      exploredAt(visibleKnowledge, point.x, point.z)
  );
  function pick(clientX: number, clientY: number): string | null {
    return atlasAmount >= 0.5
      ? atlas.pick(clientX, clientY)
      : pickObject(clientX, clientY, canvas.getBoundingClientRect());
  }
  return { render, dispose, pick };
}
