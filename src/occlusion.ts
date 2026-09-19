import * as THREE from "three";

function isMesh(object: THREE.Object3D): object is THREE.Mesh {
  return object instanceof THREE.Mesh;
}

export class FadeEnvelope {
  strength = 0;
  private hold = 0;
  update(blocked: boolean, seconds: number) {
    const dt = Number.isFinite(seconds)
      ? Math.max(0, Math.min(seconds, 0.05))
      : 0;
    this.hold = blocked ? 0.12 : Math.max(0, this.hold - dt);
    const target = blocked || this.hold > 0 ? 1 : 0;
    this.strength += Math.max(
      -dt / 0.18,
      Math.min(dt / 0.18, target - this.strength)
    );
    return this.strength;
  }
}

// A world-space corridor removes only fragments between the camera and humanoid.
// Dithered coverage keeps depth writes and avoids transparent mesh sorting artifacts.
export function createOcclusion(scene: THREE.Scene, avatar: THREE.Group) {
  const eye = { value: new THREE.Vector3() };
  const target = { value: new THREE.Vector3() };
  const strength = { value: 0 };
  const envelope = new FadeEnvelope();
  const meshes: THREE.Mesh[] = [];
  const originals = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  const clones: THREE.Material[] = [];
  scene.traverse((object) => {
    if (!isMesh(object) || avatar.getObjectById(object.id)) {
      return;
    }
    const mesh: THREE.Mesh = object;
    originals.set(mesh, mesh.material);
    const prepare = (original: THREE.Material) => {
      const material = original.clone();
      material.side = THREE.DoubleSide;
      material.onBeforeCompile = (shader) => {
        shader.uniforms.occlusionEye = eye;
        shader.uniforms.occlusionTarget = target;
        shader.uniforms.occlusionStrength = strength;
        shader.vertexShader =
          "varying vec3 occlusionWorld;\n" + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          "#include <project_vertex>",
          "#include <project_vertex>\nocclusionWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;"
        );
        shader.fragmentShader =
          "varying vec3 occlusionWorld;\nuniform vec3 occlusionEye;\nuniform vec3 occlusionTarget;\nuniform float occlusionStrength;\n" +
          shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <clipping_planes_fragment>",
          `#include <clipping_planes_fragment>
          vec3 corridor = occlusionTarget - occlusionEye;
          float corridorLength = max(length(corridor), 0.001);
          vec3 direction = corridor / corridorLength;
          vec3 relative = occlusionWorld - occlusionEye;
          float along = dot(relative, direction);
          float radial = length(relative - direction * along);
          float apertureScale = clamp(along / corridorLength, 0.0, 1.0);
          float region = (1.0 - smoothstep(0.08 + 0.7 * apertureScale, 0.1 + 1.1 * apertureScale, radial)) * step(0.0, along) * (1.0 - smoothstep(corridorLength - 0.5, corridorLength - 0.15, along));
          float noise = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898,78.233))) * 43758.5453);
          if (noise < 0.82 * region * occlusionStrength) discard;
        `
        );
      };
      material.customProgramCacheKey = () => "localized-occlusion-v1";
      clones.push(material);
      return material;
    };
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(prepare)
      : prepare(mesh.material);
    meshes.push(mesh);
  });
  return {
    update(camera: THREE.Camera, seconds: number, enabled: boolean) {
      scene.updateMatrixWorld(true);
      eye.value.copy(camera.position);
      target.value.copy(avatar.position).add(new THREE.Vector3(0, 0.8, 0));
      let blocked = false;
      if (enabled) {
        for (const height of [0.2, 0.8, 1.4]) {
          const aim = avatar.position
            .clone()
            .add(new THREE.Vector3(0, height, 0));
          const delta = aim.sub(eye.value);
          const distance = delta.length();
          const ray = new THREE.Raycaster(
            eye.value,
            delta.normalize(),
            0,
            Math.max(0, distance - 0.15)
          );
          if (ray.intersectObjects(meshes, false).length > 0) {
            blocked = true;
            break;
          }
        }
      }
      strength.value = enabled ? envelope.update(blocked, seconds) : 0;
      return { blocked, strength: strength.value };
    },
    dispose() {
      for (const [mesh, material] of originals) {
        mesh.material = material;
      }
      for (const material of clones) {
        material.dispose();
      }
    },
  };
}
