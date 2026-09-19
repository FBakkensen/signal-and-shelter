import { BufferGeometry, Float32BufferAttribute } from "three";

// Exposed cube faces only: every normal stays on an axis, including curved silhouettes.
export function voxelGeometry(
  size: readonly [number, number, number],
  step: number,
  contains: (x: number, y: number, z: number) => boolean,
): BufferGeometry {
  const [nx, ny, nz] = size.map((value) => Math.ceil(value / step));
  if (
    !nx ||
    !ny ||
    !nz ||
    !Number.isFinite(step) ||
    step <= 0 ||
    size.some((value) => !Number.isFinite(value) || value <= 0)
  ) {
    throw new Error("Voxel dimensions and step must be positive and finite");
  }
  const cells = new Uint8Array(nx * ny * nz);
  const index = (x: number, y: number, z: number) => (x * ny + y) * nz + z;
  for (let x = 0; x < nx; x++) {
    for (let y = 0; y < ny; y++) {
      for (let z = 0; z < nz; z++) {
        cells[index(x, y, z)] = Number(
          contains(
            (x + 0.5 - nx / 2) * step,
            (y + 0.5 - ny / 2) * step,
            (z + 0.5 - nz / 2) * step,
          ),
        );
      }
    }
  }
  const occupied = (x: number, y: number, z: number) =>
    x >= 0 &&
    y >= 0 &&
    z >= 0 &&
    x < nx &&
    y < ny &&
    z < nz &&
    cells[index(x, y, z)] === 1;
  const positions: number[] = [];
  const normals: number[] = [];
  const faces = [
    {
      normal: [1, 0, 0],
      corners: [
        [1, 0, 0],
        [1, 1, 0],
        [1, 1, 1],
        [1, 0, 1],
      ],
    },
    {
      normal: [-1, 0, 0],
      corners: [
        [0, 0, 1],
        [0, 1, 1],
        [0, 1, 0],
        [0, 0, 0],
      ],
    },
    {
      normal: [0, 1, 0],
      corners: [
        [0, 1, 1],
        [1, 1, 1],
        [1, 1, 0],
        [0, 1, 0],
      ],
    },
    {
      normal: [0, -1, 0],
      corners: [
        [0, 0, 0],
        [1, 0, 0],
        [1, 0, 1],
        [0, 0, 1],
      ],
    },
    {
      normal: [0, 0, 1],
      corners: [
        [1, 0, 1],
        [1, 1, 1],
        [0, 1, 1],
        [0, 0, 1],
      ],
    },
    {
      normal: [0, 0, -1],
      corners: [
        [0, 0, 0],
        [0, 1, 0],
        [1, 1, 0],
        [1, 0, 0],
      ],
    },
  ] as const;
  for (let x = 0; x < nx; x++) {
    for (let y = 0; y < ny; y++) {
      for (let z = 0; z < nz; z++) {
        if (!occupied(x, y, z)) {
          continue;
        }
        for (const { normal, corners } of faces) {
          if (occupied(x + normal[0], y + normal[1], z + normal[2])) {
            continue;
          }
          for (const vertex of [0, 1, 2, 0, 2, 3] as const) {
            const corner = corners[vertex];
            positions.push(
              (x + corner[0] - nx / 2) * step,
              (y + corner[1] - ny / 2) * step,
              (z + corner[2] - nz / 2) * step,
            );
            normals.push(...normal);
          }
        }
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  return geometry;
}
