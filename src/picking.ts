import * as THREE from "three";

type Viewport = Pick<DOMRectReadOnly, "left" | "top" | "width" | "height">;

// Uses the rendered scene's transforms; visual fading does not bypass solid hits.
export function createPicker(
  scene: THREE.Scene,
  camera: THREE.Camera,
  avatar: THREE.Object3D
) {
  function isAvatar(object: THREE.Object3D): boolean {
    return (
      object === avatar || (object.parent !== null && isAvatar(object.parent))
    );
  }
  return (
    clientX: number,
    clientY: number,
    viewport: Viewport
  ): string | null => {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(
      new THREE.Vector2(
        ((clientX - viewport.left) / viewport.width) * 2 - 1,
        (-(clientY - viewport.top) / viewport.height) * 2 + 1
      ),
      camera
    );
    const hit = ray
      .intersectObjects(scene.children, true)
      .find((h) => !isAvatar(h.object));
    let object: THREE.Object3D | null = hit?.object ?? null;
    while (object) {
      if (object.name.startsWith("select:")) {
        return object.name.slice(7);
      }
      object = object.parent;
    }
    return null;
  };
}
