import * as THREE from "three";
import { WORLD_PALETTE } from "./packages/island/geometry.ts";

export interface AvatarProportions {
  stance: number;
  footWidth: number;
}
export const BASELINE_AVATAR: AvatarProportions = {
  stance: 0.17,
  footWidth: 0.18,
};

// Shared with normal rendering so the study preserves the real avatar and gait.
export function createAvatar(proportions: AvatarProportions = BASELINE_AVATAR) {
  const group = new THREE.Group();
  const box = new THREE.BoxGeometry(1, 1, 1);
  function part(
    name: string,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    color: string
  ) {
    const mesh = new THREE.Mesh(
      box,
      new THREE.MeshStandardMaterial({ color, roughness: 1 })
    );
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  part("torso", 0, 0.68, 0, 0.55, 0.7, 0.35, "#ece7d7");
  part("head", 0, 1.23, 0, 0.42, 0.42, 0.42, "#424c62");
  part("visor", 0, 1.25, -0.22, 0.3, 0.13, 0.03, "#8ce6bd");
  part("pack", 0, 0.76, 0.25, 0.43, 0.45, 0.22, WORLD_PALETTE.strata);
  const left = part(
    "left-foot",
    -proportions.stance,
    0.18,
    0,
    proportions.footWidth,
    0.38,
    0.22,
    "#3e2c35"
  );
  const right = part(
    "right-foot",
    proportions.stance,
    0.18,
    0,
    proportions.footWidth,
    0.38,
    0.22,
    "#3e2c35"
  );
  return {
    group,
    pose(distance: number) {
      left.rotation.x = Math.sin(distance * 3) * 0.4;
      right.rotation.x = -left.rotation.x;
    },
    dispose() {
      box.dispose();
      for (const child of group.children) {
        if (
          child instanceof THREE.Mesh &&
          child.material instanceof THREE.MeshStandardMaterial
        ) {
          child.material.dispose();
        }
      }
    },
  };
}
