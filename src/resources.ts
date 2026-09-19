import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import type { BlockPart } from "./blocks.ts";
import type { ResourceDeposit } from "./world.ts";
import { EMBER } from "./ember.ts";

export function resourceParts(resource: ResourceDeposit): readonly BlockPart[] {
  return [
    {
      name: "Resource_base",
      position: [0, 0.55, 0],
      size: [1.8, 1.1, 1.8],
      color: EMBER.strata,
    },
    {
      name: "Crystal_left",
      position: [-0.45, 1.05, 0.3],
      size: [0.45, 0.7, 0.45],
      color: resource.color,
    },
    {
      name: "Crystal_tall",
      position: [0.35, 1.2, -0.25],
      size: [0.45, 1, 0.45],
      color: resource.color,
    },
    {
      name: "Crystal_right",
      position: [0.5, 0.95, 0.5],
      size: [0.45, 0.5, 0.45],
      color: resource.color,
    },
  ];
}

export function createResourceGroup(resource: ResourceDeposit): Group {
  const group = new Group();
  for (const part of resourceParts(resource)) {
    const mesh = new Mesh(
      new BoxGeometry(...part.size),
      new MeshStandardMaterial({ color: part.color, roughness: 1 }),
    );
    mesh.name = part.name;
    mesh.position.set(...part.position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}
