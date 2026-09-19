import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import type { ResourceDeposit } from "./packages/island/index.ts";
import { resourceParts } from "./packages/island/geometry.ts";

export function createResourceGroup(resource: ResourceDeposit): Group {
  const group = new Group();
  for (const part of resourceParts(resource)) {
    const mesh = new Mesh(
      new BoxGeometry(...part.size),
      new MeshStandardMaterial({ color: part.color, roughness: 1 })
    );
    mesh.name = part.name;
    mesh.position.set(...part.position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}
