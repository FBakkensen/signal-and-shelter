import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import type { PlacedSolid } from "./solids.ts";

// Rendering adapter owns procedural mesh resources; the authored template keeps
// ownership of its shared geometry/materials across island replacements.
export function createSolidMeshes(
  solids: readonly PlacedSolid[],
  shipAsset: Group,
) {
  const group = new Group();
  const geometry = new BoxGeometry(1, 1, 1);
  const materials = new Map<string, MeshStandardMaterial>();
  for (const solid of solids) {
    if (solid.kind === "ship") {
      const ship = shipAsset.clone(true);
      ship.position.set(...solid.origin);
      ship.traverse((object) => {
        if (object instanceof Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      group.add(ship);
      continue;
    }
    for (const part of solid.parts) {
      let material = materials.get(part.color);
      if (!material) {
        material = new MeshStandardMaterial({
          color: part.color,
          roughness: 1,
        });
        materials.set(part.color, material);
      }
      const mesh = new Mesh(geometry, material);
      mesh.name = part.name;
      mesh.position.set(...part.position);
      mesh.scale.set(...part.size);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
  function dispose() {
    geometry.dispose();
    for (const material of materials.values()) {
      material.dispose();
    }
  }
  return { group, dispose };
}
