// Throwaway comparison: silhouette, obstructing-mesh fade, or manual orbit only.
import * as THREE from "three";
function isMesh(object: THREE.Object3D): object is THREE.Mesh {
  return object instanceof THREE.Mesh;
}
export type OcclusionVariant = "A" | "B" | "C";
export function occlusionVariant(value: string | null): OcclusionVariant {
  return value === "B" || value === "C" ? value : "A";
}
export function createOcclusionStudy(scene: THREE.Scene, avatar: THREE.Group) {
  const ghost = avatar.clone(true);
  ghost.name = "occlusion-ghost";
  const ghostMaterial = new THREE.MeshBasicMaterial({
    color: "#8ce6bd",
    transparent: true,
    opacity: 0.7,
    depthFunc: THREE.GreaterDepth,
    depthWrite: false,
  });
  ghost.traverse((o) => {
    if (isMesh(o)) {
      o.material = ghostMaterial;
      o.renderOrder = 1000;
      o.castShadow = false;
    }
  });
  ghost.visible = false;
  scene.add(ghost);
  const originals = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  const faded = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  function restore() {
    for (const [mesh, material] of originals) {
      mesh.material = material;
    }
  }
  function apply(camera: THREE.Camera, variant?: OcclusionVariant) {
    restore();
    ghost.visible = variant === "A";
    ghost.position.copy(avatar.position);
    ghost.rotation.copy(avatar.rotation);
    ghost.children.forEach((child, i) => {
      const source = avatar.children[i];
      if (source) {
        child.rotation.copy(source.rotation);
      }
    });
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    const meshes: THREE.Mesh[] = [];
    scene.traverse((o) => {
      if (
        isMesh(o) &&
        !avatar.getObjectById(o.id) &&
        !ghost.getObjectById(o.id)
      ) {
        meshes.push(o);
      }
    });
    const blocked = new Set<THREE.Mesh>();
    const origin = camera.getWorldPosition(new THREE.Vector3());
    for (const height of [0.2, 0.7, 1.3]) {
      const target = avatar.position
        .clone()
        .add(new THREE.Vector3(0, height, 0));
      const ray = new THREE.Raycaster(
        origin,
        target.clone().sub(origin).normalize(),
        0,
        origin.distanceTo(target)
      );
      // Two-sided probing also detects a camera inside closed ship/terrain geometry.
      const sides = new Map<THREE.Material, THREE.Side>();
      for (const mesh of meshes) {
        for (const m of Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]) {
          sides.set(m, m.side);
          m.side = THREE.DoubleSide;
        }
      }
      for (const hit of ray.intersectObjects(meshes)) {
        if (isMesh(hit.object)) {
          blocked.add(hit.object);
        }
      }
      for (const [m, side] of sides) {
        m.side = side;
      }
    }
    ghost.visible = variant === "A" && blocked.size > 0;
    if (variant === "B") {
      for (const mesh of blocked) {
        if (!originals.has(mesh)) {
          originals.set(mesh, mesh.material);
          const fade = (m: THREE.Material) => {
            const copy = m.clone();
            copy.transparent = true;
            copy.opacity = 0.18;
            copy.depthWrite = false;
            return copy;
          };
          faded.set(
            mesh,
            Array.isArray(mesh.material)
              ? mesh.material.map(fade)
              : fade(mesh.material)
          );
        }
        const material = faded.get(mesh);
        if (material) {
          mesh.material = material;
        }
      }
    }
    return blocked.size;
  }
  return {
    apply,
    restore,
    dispose() {
      restore();
      scene.remove(ghost);
      ghostMaterial.dispose();
      for (const material of faded.values()) {
        for (const m of Array.isArray(material) ? material : [material]) {
          m.dispose();
        }
      }
    },
  };
}
