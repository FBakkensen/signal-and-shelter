import * as THREE from "three";
import { voxelGeometry } from "./visual-prototype-voxels.ts";
import {
  boundaryRadius,
  studies,
  surfaceHeight,
} from "./visual-prototype-model.ts";
import type { Variant } from "./visual-prototype-model.ts";

export function createVisualStudy(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
  let scene = new THREE.Scene();
  let current: Variant = "A";
  let close = false;
  let angle = 0;
  function mesh(
    geometry: THREE.BufferGeometry,
    color: string,
    x: number,
    y: number,
    z: number,
    glow = false,
  ) {
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.8,
      emissive: glow ? color : "#000000",
      emissiveIntensity: glow ? 1.3 : 0,
    });
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    scene.add(object);
    return object;
  }
  function pebble(
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    color: string,
    step = 0.25,
  ) {
    const object = mesh(
      voxelGeometry(
        [sx * 2, sy * 2, sz * 2],
        step,
        (vx, vy, vz) => (vx / sx) ** 2 + (vy / sy) ** 2 + (vz / sz) ** 2 <= 1,
      ),
      color,
      x,
      y,
      z,
    );
    return object;
  }
  function block(
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    color: string,
  ) {
    return mesh(new THREE.BoxGeometry(sx, sy, sz), color, x, y, z);
  }
  function clear() {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry instanceof THREE.BufferGeometry) {
          object.geometry.dispose();
        }
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => {
          if (material instanceof THREE.Material) {
            material.dispose();
          }
        });
      }
      if (object instanceof THREE.DirectionalLight) {
        object.shadow.map?.dispose();
      }
    });
  }
  function show(variant: Variant) {
    clear();
    current = variant;
    const palette = studies[variant];
    scene = new THREE.Scene();
    scene.background = new THREE.Color(palette.sky);
    scene.fog = new THREE.Fog(palette.sky, 65, 160);
    scene.add(
      new THREE.HemisphereLight(
        "#f9e9e4",
        palette.edge,
        variant === "C" ? 2 : 3,
      ),
    );
    const sun = new THREE.DirectionalLight(
      variant === "B" ? "#ffe1b0" : "#fff4ea",
      3.5,
    );
    sun.position.set(-20, 35, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -30,
      right: 30,
      top: 30,
      bottom: -30,
      far: 100,
    });
    sun.shadow.normalBias = 0.05;
    scene.add(sun);
    // Half-metre cubic cells retain the voxel language at a finer scale.
    const terrain = voxelGeometry(
      [42, 12, 42],
      0.5,
      (x, y, z) =>
        Math.hypot(x, z) <= boundaryRadius(Math.atan2(z, x)) &&
        y >= -3 &&
        y < surfaceHeight(x, z, variant),
    );
    const points = terrain.getAttribute("position");
    const normals = terrain.getAttribute("normal");
    const colors: number[] = [];
    for (let i = 0; i < points.count; i += 6) {
      const color = new THREE.Color(
        normals.getY(i) > 0 ? palette.ground : palette.edge,
      );
      const variation =
        0.96 + Math.sin(points.getX(i) * 9 + points.getZ(i) * 13) * 0.035;
      color.multiplyScalar(variation);
      for (let vertex = 0; vertex < 6; vertex++) {
        colors.push(color.r, color.g, color.b);
      }
    }
    terrain.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const ground = new THREE.Mesh(
      terrain,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 1,
        side: THREE.DoubleSide,
      }),
    );
    ground.receiveShadow = true;
    ground.castShadow = true;
    scene.add(ground);
    // The boundary is an opaque luminous atmosphere, with drifting suspended grains, not a sea.
    const haze = mesh(new THREE.PlaneGeometry(500, 500), palette.sky, 0, -3, 0);
    haze.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 90; i++) {
      const t = i * 2.39996,
        distance = 21 + (i % 13) * 2.9;
      const grain = mesh(
        new THREE.BoxGeometry(0.09, 0.09, 0.09),
        palette.accent,
        Math.cos(t) * distance,
        -1 + (i % 8) * 0.9,
        Math.sin(t) * distance,
        true,
      );
      grain.castShadow = false;
    }
    for (let i = 0; i < 16; i++) {
      const t = i * 2.39996;
      const x = Math.cos(t) * (8 + (i % 5)),
        z = Math.sin(t) * (8 + (i % 5));
      const y = surfaceHeight(x, z, variant);
      if (variant === "A") {
        if (i % 3 === 0) {
          const arch = mesh(
            voxelGeometry(
              [4, 4, 1],
              0.25,
              (vx, vy, vz) =>
                vy >= 0 &&
                Math.abs(Math.hypot(vx, vy) - 1.4) < 0.33 &&
                Math.abs(vz) < 0.35,
            ),
            palette.ground,
            x,
            y,
            z,
          );
          arch.rotation.y = ((i % 2) * Math.PI) / 2;
        } else {
          pebble(x, y + 0.35, z, 1.2, 0.6, 0.8, "#b4a6ba");
        }
        mesh(
          new THREE.BoxGeometry(0.4, 0.4, 0.4),
          palette.accent,
          x + 0.8,
          y + 0.5,
          z,
          true,
        );
      } else if (variant === "B") {
        const h = 1.8 + (i % 3);
        mesh(
          voxelGeometry([3, h + 0.5, 3], 0.25, (vx, vy, vz) => {
            const radius = 1.2 - (vy / h + 0.5) * 0.75;
            return (
              Math.abs(vy) <= h / 2 &&
              Math.hypot(vx, vz) < radius &&
              !(vy > h / 2 - 0.5 && Math.hypot(vx, vz) < 0.3)
            );
          }),
          palette.ground,
          x,
          y + h / 2,
          z,
        );
        const rim = mesh(
          voxelGeometry(
            [1.25, 0.25, 1.25],
            0.25,
            (vx, _vy, vz) => Math.max(Math.abs(vx), Math.abs(vz)) > 0.3,
          ),
          "#efb79b",
          x,
          y + h,
          z,
        );
        rim.receiveShadow = true;
        block(x, y + h - 0.2, z, 0.4, 0.1, 0.4, palette.accent);
        pebble(x + 1.3, y + 0.25, z, 0.8, 0.5, 0.6, "#824e66");
      } else {
        const h = 1 + (i % 4);
        pebble(x, y + h / 2, z, 0.6, h, 0.55, palette.edge);
        mesh(
          new THREE.BoxGeometry(0.4, 0.4, 0.4),
          palette.accent,
          x,
          y + h + 1,
          z,
          true,
        );
        mesh(
          voxelGeometry(
            [1.75, 0.125, 1.75],
            0.125,
            (vx, _vy, vz) =>
              Math.abs(Math.max(Math.abs(vx), Math.abs(vz)) - 0.75) < 0.07,
          ),
          palette.accent,
          x,
          y + h + 1,
          z,
          true,
        );
      }
    }
    // Procedural ship silhouette for scale; does not replace the authored Blender asset.
    const sy = surfaceHeight(0, 2, variant);
    block(0, sy + 1.05, 2, 3.7, 1.65, 5.3, "#ece7d7");
    block(0, sy + 1.7, 0.6, 2.8, 0.9, 1.9, "#424c62");
    block(0, sy + 1.75, -0.34, 2.3, 0.22, 0.08, palette.accent);
    for (const x of [-2.1, 2.1]) {
      block(x, sy + 0.55, 2.5, 0.9, 1.2, 3.4, palette.edge);
      mesh(new THREE.BoxGeometry(0.6, 0.6, 0.15), "#242b3c", x, sy + 0.65, 4.3);
    }
    block(0, sy + 0.18, -1.6, 1.8, 0.18, 1.5, "#c0997f");
    // Small battery-powered humanoid: friendly proportions with crisp block silhouettes.
    const ry = surfaceHeight(3.7, 0, variant);
    block(3.7, ry + 0.85, 0, 0.65, 0.75, 0.45, "#ece7d7");
    block(3.7, ry + 1.5, 0, 0.8, 0.6, 0.6, "#ece7d7");
    block(3.7, ry + 1.5, 0.31, 0.58, 0.24, 0.06, "#344758");
    for (const x of [3.51, 3.89]) {
      block(x, ry + 0.25, 0, 0.22, 0.5, 0.32, palette.edge);
    }
    for (const x of [3.18, 4.22]) {
      block(x, ry + 0.82, 0, 0.22, 0.6, 0.3, "#ece7d7");
    }
    // Distant landforms and a visible satellite make the planetary setting legible.
    for (let i = 0; i < 5; i++) {
      pebble(
        -40 + i * 22,
        -2,
        -42 - (i % 2) * 12,
        8,
        5 + (i % 3) * 4,
        6,
        palette.edge,
        1,
      );
    }
    pebble(-25, 28, -65, 9, 9, 9, variant === "C" ? "#b3a7ce" : "#e4d3c8", 1);
  }
  function render() {
    const width = canvas.clientWidth,
      height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = close ? 48 : 40;
    camera.updateProjectionMatrix();
    const distance = close ? 23 : width / height < 0.8 ? 72 : 53;
    camera.position.set(
      Math.sin(angle + 0.48) * distance,
      close ? 8 : 31,
      Math.cos(angle + 0.48) * distance,
    );
    camera.lookAt(0, close ? 2.5 : 1, 0);
    renderer.render(scene, camera);
  }
  show(current);
  renderer.setAnimationLoop(render);
  return {
    show,
    setClose(value: boolean) {
      close = value;
    },
    rotate() {
      angle += Math.PI / 4;
    },
  };
}
