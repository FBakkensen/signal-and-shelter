import type { Box, Capabilities, Point, Setup } from "./index.ts";
import { HUMANOID } from "./index.ts";
export interface Course {
  id: string;
  name: string;
  description: string;
  boxes: Box[];
  start: Point;
  heading: number;
  target: Point;
  other?: Point;
  otherHeading?: number;
  contact?: boolean;
  timedCrossing?: boolean;
}
const box = (
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  minZ: number,
  maxZ: number
): Box => ({ minX, maxX, minY, maxY, minZ, maxZ });
const floor = () => box(-4000, 5000, -500, 0, -3500, 3500);
export const COURSES: readonly Course[] = [
  {
    id: "timed-jumps",
    name: "Crossing jumps at different times",
    timedCrossing: true,
    description:
      "Two short test actors use intersecting flight regions at different times. Try course sends the second actor eight ticks later. Their protected paths must coexist without overlap.",
    boxes: [
      floor(),
      box(0, 500, 0, 500, -250, 250),
      box(-1250, -750, 0, 500, 0, 500),
    ],
    start: { x: -1600, y: 0, z: 0 },
    other: { x: -1000, y: 0, z: -1600 },
    heading: 0,
    otherHeading: 16384,
    target: { x: 263, y: 500, z: 0 },
  },
  {
    id: "partial-contact",
    name: "45 mm before the wall",
    contact: true,
    description:
      "Request 70 mm. Only 45 mm is safe: the actor should advance exactly to contact. Reset + one tick shows the result.",
    boxes: [floor(), box(345, 600, 0, 3000, -2000, 2000)],
    start: { x: 0, y: 0, z: 0 },
    heading: 0,
    target: { x: 45, y: 0, z: 0 },
  },
  {
    id: "exact-fit",
    name: "Exactly 600 mm wide",
    contact: true,
    description:
      "Body and passage are both 600 mm wide. Touching both walls is allowed; try walking through.",
    boxes: [
      floor(),
      box(0, 2000, 0, 2600, -1000, -300),
      box(0, 2000, 0, 2600, 300, 1000),
    ],
    start: { x: -300, y: 0, z: 0 },
    heading: 0,
    target: { x: 2100, y: 0, z: 0 },
  },
  {
    id: "too-tight",
    name: "599 mm is too narrow",
    contact: true,
    description:
      "One millimetre too narrow for this body. The actor must stop at the opening, without overlap.",
    boxes: [
      floor(),
      box(0, 2000, 0, 2600, -1000, -300),
      box(0, 2000, 0, 2600, 299, 1000),
    ],
    start: { x: -300, y: 0, z: 0 },
    heading: 0,
    target: { x: 0, y: 0, z: 0 },
  },
  {
    id: "following",
    name: "Two actors moving together",
    contact: true,
    description:
      "Their bodies start touching. Both advance 70 mm together. Stop the leader to see the follower stop safely.",
    boxes: [floor()],
    start: { x: -600, y: 0, z: 0 },
    other: { x: 0, y: 0, z: 0 },
    heading: 0,
    otherHeading: 0,
    target: { x: 2000, y: 0, z: 0 },
  },
  {
    id: "leader-contact",
    name: "Leader stops after 45 mm",
    contact: true,
    description:
      "The leader reaches the wall after 45 mm. Both movements must shorten together; neither body may overlap.",
    boxes: [floor(), box(945, 1200, 0, 3000, -2000, 2000)],
    start: { x: 0, y: 0, z: 0 },
    other: { x: 600, y: 0, z: 0 },
    heading: 0,
    otherHeading: 0,
    target: { x: 45, y: 0, z: 0 },
  },
  {
    id: "crossing",
    name: "Crossing paths",
    contact: true,
    description:
      "Controlled perpendicular movement. Watch bodies approach and stop without passing through one another. This does not choose robot jobs or routes.",
    boxes: [floor()],
    start: { x: -1000, y: 0, z: 0 },
    other: { x: 0, y: 0, z: -1000 },
    heading: 0,
    otherHeading: 16384,
    target: { x: 1000, y: 0, z: 0 },
  },
  {
    id: "terrace",
    name: "Two-step terrace",
    description:
      "Two connected narrow terraces. Try course lands on the first; press it again for the second, or hold forward to continue.",
    boxes: [
      floor(),
      box(0, 1000, 0, 500, -250, 250),
      box(1000, 1500, 0, 1000, -250, 250),
    ],
    start: { x: -1600, y: 0, z: 0 },
    heading: 0,
    target: { x: 1250, y: 1000, z: 0 },
  },
  {
    id: "rise-half",
    name: "Half-metre step",
    description:
      "Approach the shelf; compare the low hop with the taller climb.",
    boxes: [floor(), box(0, 500, 0, 500, -250, 250)],
    start: { x: -1600, y: 0, z: 0 },
    heading: 0,
    target: { x: 250, y: 500, z: 0 },
  },
  {
    id: "rise-one",
    name: "One-metre step",
    description:
      "Watch early takeoff, centred landing and seven stationary recovery ticks.",
    boxes: [floor(), box(0, 500, 0, 1000, -250, 250)],
    start: { x: -1600, y: 0, z: 0 },
    heading: 0,
    target: { x: 250, y: 1000, z: 0 },
  },
  {
    id: "close",
    name: "Already at the wall",
    description:
      "Rise vertically before travelling forward. No retreat or snap.",
    boxes: [floor(), box(0, 500, 0, 1000, -250, 250)],
    start: { x: -300, y: 0, z: 0 },
    heading: 0,
    target: { x: 250, y: 1000, z: 0 },
  },
  {
    id: "diagonal",
    name: "Diagonal one-metre step",
    description: "A diagonal approach to a one-block shelf with full support.",
    boxes: [floor(), box(0, 500, 0, 1000, 0, 500)],
    start: { x: -1100, y: 0, z: -1100 },
    heading: 8192,
    target: { x: 250, y: 1000, z: 250 },
  },
  {
    id: "diagonal-half",
    name: "Diagonal half-metre step",
    description: "The same diagonal approach to a lower shelf.",
    boxes: [floor(), box(0, 500, 0, 500, 0, 500)],
    start: { x: -1100, y: 0, z: -1100 },
    heading: 8192,
    target: { x: 250, y: 500, z: 250 },
  },
  {
    id: "drop",
    name: "One-metre descent",
    description:
      "Walk toward the edge; a safe jump replaces an uncontrolled fall.",
    boxes: [floor(), box(-250, 250, 0, 1000, -250, 250)],
    start: { x: 0, y: 1000, z: 0 },
    heading: 0,
    target: { x: 1400, y: 0, z: 0 },
  },
  {
    id: "drop-half",
    name: "Half-metre descent",
    description: "A small supported starting shelf above clear ground.",
    boxes: [floor(), box(-250, 250, 0, 500, -250, 250)],
    start: { x: 0, y: 500, z: 0 },
    heading: 0,
    target: { x: 1400, y: 0, z: 0 },
  },
  {
    id: "diagonal-drop",
    name: "Diagonal one-metre descent",
    description:
      "Diagonal descent uses the same integer residues and landing rules.",
    boxes: [floor(), box(-250, 250, 0, 1000, -250, 250)],
    start: { x: 0, y: 1000, z: 0 },
    heading: 8192,
    target: { x: 1100, y: 0, z: 1100 },
  },
  {
    id: "diagonal-drop-half",
    name: "Diagonal half-metre descent",
    description: "A lower diagonal descent from the one-block shelf.",
    boxes: [floor(), box(-250, 250, 0, 500, -250, 250)],
    start: { x: 0, y: 500, z: 0 },
    heading: 8192,
    target: { x: 1100, y: 0, z: 1100 },
  },
  {
    id: "align",
    name: "Sideways alignment",
    description:
      "The shelf is offset 200 mm. Alignment finishes before preparation.",
    boxes: [floor(), box(0, 500, 0, 1000, -50, 450)],
    start: { x: -1600, y: 0, z: 0 },
    heading: 0,
    target: { x: 250, y: 1000, z: 200 },
  },
  {
    id: "outside",
    name: "Beyond alignment reach",
    description:
      "A 450 mm offset is beyond the 250 mm automatic alignment cap.",
    boxes: [floor(), box(0, 500, 0, 1000, 200, 700)],
    start: { x: -1600, y: 0, z: 0 },
    heading: 0,
    target: { x: 250, y: 1000, z: 450 },
  },
  {
    id: "ceiling",
    name: "Low ceiling",
    description:
      "A lower hop fits under this ceiling; a fixed tall jump would not.",
    boxes: [
      floor(),
      box(0, 500, 0, 500, -250, 250),
      box(-2500, 1200, 2650, 2900, -800, 800),
    ],
    start: { x: -1600, y: 0, z: 0 },
    heading: 0,
    target: { x: 250, y: 500, z: 0 },
  },
  {
    id: "blocked-ceiling",
    name: "Ceiling blocks takeoff",
    description:
      "The standing body fits, but no safe hop clears the shelf under the roof.",
    boxes: [
      floor(),
      box(0, 500, 0, 500, -250, 250),
      box(-2500, 1200, 2000, 2250, -800, 800),
    ],
    start: { x: -1600, y: 0, z: 0 },
    heading: 0,
    target: { x: 250, y: 500, z: 0 },
  },
  {
    id: "seam",
    name: "Seam and internal hole",
    description:
      "A coplanar seam supports the whole footprint. An interior hole farther ahead must stop movement.",
    boxes: [
      box(-2000, 0, -500, 0, -1000, 1000),
      box(0, 800, -500, 0, -1000, 1000),
      box(800, 1200, -500, 0, -1000, -40),
      box(800, 1200, -500, 0, 40, 1000),
      box(1200, 2500, -500, 0, -1000, 1000),
    ],
    start: { x: -1000, y: 0, z: 0 },
    heading: 0,
    target: { x: 1600, y: 0, z: 0 },
  },
  {
    id: "wall",
    name: "Slide along a wall",
    description:
      "Diagonal movement keeps its tangential speed; no speed boost along the wall.",
    boxes: [floor(), box(0, 500, 0, 3000, -3000, 3000)],
    start: { x: -300, y: 0, z: -1000 },
    heading: 8192,
    target: { x: -300, y: 0, z: 1000 },
  },
  {
    id: "occupied",
    name: "Occupied landing",
    description:
      "A stopped actor occupies the landing. The jumper must remain safely grounded.",
    boxes: [floor(), box(0, 500, 0, 1000, -500, 500)],
    start: { x: -1600, y: 0, z: 0 },
    heading: 0,
    target: { x: 250, y: 1000, z: 0 },
    other: { x: 250, y: 1000, z: 0 },
  },
  {
    id: "conflict",
    name: "Protect committed flight",
    description:
      "After takeoff, drive the second actor toward the landing. Protected flight takes priority.",
    boxes: [floor(), box(0, 500, 0, 1000, -1000, 2000)],
    start: { x: -1600, y: 0, z: 0 },
    heading: 0,
    target: { x: 250, y: 1000, z: 0 },
    other: { x: 250, y: 1000, z: 1500 },
  },
];
export const PROFILES: readonly { name: string; capabilities: Capabilities }[] =
  [
    { name: "Humanoid", capabilities: { ...HUMANOID } },
    {
      name: "Small slow jumper",
      capabilities: {
        ...HUMANOID,
        support: 300,
        width: 400,
        height: 1200,
        speed: 45,
        elevation: 500,
        apex: 800,
        alignment: 150,
        preparation: 4,
        recovery: 5,
      },
    },
    { name: "Non-jumper", capabilities: { ...HUMANOID, jump: false } },
    {
      name: "Short crossing actor",
      capabilities: {
        ...HUMANOID,
        width: 200,
        support: 100,
        height: 400,
        alignment: 0,
      },
    },
  ];
export function setupCourse(course: Course, capabilities: Capabilities): Setup {
  if (course.timedCrossing) {
    const small = {
      ...HUMANOID,
      width: 200,
      support: 100,
      height: 400,
      alignment: 0,
    };
    return {
      boxes: course.boxes,
      actors: [
        { id: "player", position: course.start, capabilities: small },
        ...(course.other
          ? [{ id: "robot", position: course.other, capabilities: small }]
          : []),
      ],
    };
  }
  const actors = [
    {
      id: "player",
      position: course.start,
      capabilities: {
        ...capabilities,
        jump: course.contact ? false : capabilities.jump,
      },
    },
  ];
  if (course.other) {
    actors.push({
      id: "robot",
      position: course.other,
      capabilities: { ...HUMANOID, jump: !course.contact },
    });
  }
  return { boxes: course.boxes, actors };
}
