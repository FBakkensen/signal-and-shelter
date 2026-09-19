import * as THREE from "three";
import {
  EXPLORATION_WIDTH,
  EXPLORATION_ORIGIN,
  EXPLORATION_CELL_SIZE,
} from "./packages/play/exploration.ts";
import type { Exploration } from "./packages/play/exploration.ts";

function isMesh(object: THREE.Object3D): object is THREE.Mesh {
  return object instanceof THREE.Mesh;
}

// Upload only changed immutable knowledge rows; shader and CPU use identical cells.
export class ExplorationMask {
  readonly pixels = new Uint8Array(EXPLORATION_WIDTH * EXPLORATION_WIDTH);
  readonly texture = new THREE.DataTexture(
    this.pixels,
    EXPLORATION_WIDTH,
    EXPLORATION_WIDTH,
    THREE.RedFormat
  );
  private previous: Exploration | undefined;
  constructor() {
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false;
    this.texture.unpackAlignment = 1;
  }
  update(knowledge: Exploration) {
    if (knowledge === this.previous) {
      return;
    }
    for (let z = 0; z < EXPLORATION_WIDTH; z++) {
      const row = knowledge.rows[z];
      if (!row || row === this.previous?.rows[z]) {
        continue;
      }
      for (let x = 0; x < EXPLORATION_WIDTH; x++) {
        this.pixels[z * EXPLORATION_WIDTH + x] = row[x] === 1 ? 255 : 0;
      }
    }
    this.previous = knowledge;
    this.texture.needsUpdate = true;
  }
  dispose() {
    this.texture.dispose();
  }
}

// Discard hidden surface and shadow fragments: dark silhouettes still leak shape.
export function createExplorationFog(
  scene: THREE.Scene,
  excluded: readonly THREE.Object3D[]
) {
  const mask = new ExplorationMask();
  const uniform = { value: mask.texture };
  const originals = new Map<
    THREE.Mesh,
    {
      material: THREE.Material | THREE.Material[];
      depth: THREE.Material | undefined;
      distance: THREE.Material | undefined;
    }
  >();
  const clones: THREE.Material[] = [];
  function prepare(original: THREE.Material) {
    const material = original.clone();
    const compile = original.onBeforeCompile.bind(original);
    material.onBeforeCompile = (shader, renderer) => {
      compile(shader, renderer);
      shader.uniforms.explorationMap = uniform;
      shader.vertexShader =
        "varying vec2 explorationXZ;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <project_vertex>",
        "#include <project_vertex>\nexplorationXZ = (modelMatrix * vec4(transformed, 1.0)).xz;"
      );
      shader.fragmentShader =
        "varying vec2 explorationXZ;\nuniform sampler2D explorationMap;\n" +
        shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
        vec2 explorationUV = (explorationXZ - vec2(${EXPLORATION_ORIGIN.toFixed(1)})) / ${(EXPLORATION_WIDTH * EXPLORATION_CELL_SIZE).toFixed(1)};
        if (any(lessThan(explorationUV, vec2(0.0))) || any(greaterThanEqual(explorationUV, vec2(1.0))) || texture2D(explorationMap, explorationUV).r < 0.5) discard;
      `
      );
    };
    material.customProgramCacheKey = () =>
      original.customProgramCacheKey() + ":exploration-v1";
    clones.push(material);
    return material;
  }
  scene.traverse((object) => {
    if (
      !isMesh(object) ||
      excluded.some((root) => root === object || root.getObjectById(object.id))
    ) {
      return;
    }
    const mesh: THREE.Mesh = object;
    originals.set(mesh, {
      material: mesh.material,
      depth: mesh.customDepthMaterial,
      distance: mesh.customDistanceMaterial,
    });
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(prepare)
      : prepare(mesh.material);
    const depth = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
    });
    const distance = new THREE.MeshDistanceMaterial();
    mesh.customDepthMaterial = prepare(depth);
    mesh.customDistanceMaterial = prepare(distance);
    depth.dispose();
    distance.dispose();
  });
  return {
    update(knowledge: Exploration) {
      mask.update(knowledge);
    },
    dispose() {
      for (const [mesh, original] of originals) {
        mesh.material = original.material;
        mesh.customDepthMaterial = original.depth;
        mesh.customDistanceMaterial = original.distance;
      }
      for (const material of clones) {
        material.dispose();
      }
      mask.dispose();
    },
  };
}
