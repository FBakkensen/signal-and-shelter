// THROWAWAY: a grid/trajectory study, not the proposed production navigation API.
import { DEFAULT_ISLAND } from "./packages/island/index.ts";
import type { Island, Point } from "./packages/island/index.ts";
import type { Obstacle } from "./packages/island/geometry.ts";
import { createSimulation } from "./packages/play/simulation.ts";
import { exploredAt } from "./packages/play/exploration.ts";

export type Course = "terraces" | "detour" | "frontier" | "clearance";
export interface Position extends Point {
  y: number;
}
export interface Tuning {
  setup: number;
  recovery: number;
  climb: number;
  drop: number;
}
export const PRESETS: Record<string, Tuning> = {
  brisk: { setup: 0.12, recovery: 0.12, climb: 1, drop: 1 },
  deliberate: { setup: 0.25, recovery: 0.3, climb: 1, drop: 1 },
  weighty: { setup: 0.45, recovery: 0.5, climb: 1, drop: 1 },
};
export const BOUNDS = { minX: -10, maxX: 18, minZ: -8, maxZ: 8 };
const SPEED = 4.3;
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
const key = (p: Point) =>
  `${String(Math.floor(p.x * 2))},${String(Math.floor(p.z * 2))}`;
const same = (a: Point, b: Point) => distance(a, b) < 0.001;
export function makeCourse(course: Course): Island {
  const solids: Obstacle[] = [];
  if (course === "detour") {
    // A short walking detour competes with two jumps.
    for (const x of [0]) {
      solids.push({
        minX: x,
        maxX: x + 0.5,
        minZ: -2,
        maxZ: 2,
        minY: 2,
        maxY: 2.5,
      });
    }
  }
  if (course === "frontier") {
    solids.push({ minX: 1, maxX: 2, minZ: -2, maxZ: 2, minY: 2, maxY: 5 });
  }
  if (course === "clearance") {
    solids.push({ minX: -1, maxX: 1, minZ: -2, maxZ: 2, minY: 2, maxY: 2.5 });
    solids.push({
      minX: -1.5,
      maxX: 1.5,
      minZ: -2,
      maxZ: 2,
      minY: 4.2,
      maxY: 4.7,
    });
  }
  return {
    ...DEFAULT_ISLAND,
    seed: `navigation-study-${course}`,
    spawn: { x: -6.75, z: 0.25 },
    terminal: { x: -6.75, z: 1.75 },
    resources: [],
    vents: [],
    solids,
    heightAt(x, z) {
      if (
        x < BOUNDS.minX ||
        x >= BOUNDS.maxX ||
        z < BOUNDS.minZ ||
        z >= BOUNDS.maxZ ||
        (course === "frontier" && x >= 11 && x < 13)
      ) {
        return 0;
      }
      if (course === "terraces" && Math.abs(z) < 3) {
        if (x >= -2 && x < 0) {
          return 2.5;
        }
        if (x >= 0 && x < 2) {
          return 3;
        }
        if (x >= 2 && x < 4) {
          return 3.5;
        }
      }
      return 2;
    },
  };
}
interface Edge {
  from: Position;
  to: Position;
  jump: boolean;
  duration: number;
}
interface Motion {
  edge: Edge;
  time: number;
}
export interface Plan {
  points: Position[];
  endpoint: Position;
  seconds: number;
  jumps: number;
}

// Small binary heap for exhaustive nearest-reachable Dijkstra on this fixed course.
class Queue {
  items: { node: Position; cost: number }[] = [];
  push(node: Position, cost: number) {
    const item = { node, cost };
    let i = this.items.length;
    this.items.push(item);
    while (i > 0) {
      const p = Math.floor((i - 1) / 2),
        parent = this.items[p];
      if (!parent || parent.cost <= cost) {
        break;
      }
      this.items[i] = parent;
      i = p;
    }
    this.items[i] = item;
  }
  pop() {
    const first = this.items[0],
      last = this.items.pop();
    if (this.items.length && last) {
      let i = 0;
      while (i * 2 + 1 < this.items.length) {
        let child = i * 2 + 1;
        const left = this.items[child],
          right = this.items[child + 1];
        if (right && left && right.cost < left.cost) {
          child++;
        }
        const value = this.items[child];
        if (!value || value.cost >= last.cost) {
          break;
        }
        this.items[i] = value;
        i = child;
      }
      this.items[i] = last;
    }
    return first;
  }
}

export class NavigationStudy {
  readonly island: Island;
  readonly simulation: ReturnType<typeof createSimulation>;
  exploration: ReturnType<
    ReturnType<typeof createSimulation>["createState"]
  >["exploration"];
  readonly nodes = new Map<string, Position>();
  readonly edges = new Map<string, Edge[]>();
  position: Position;
  tuning: Tuning = { setup: 0.25, recovery: 0.3, climb: 1, drop: 1 };
  destination: Point | undefined;
  plan: Plan | undefined;
  phase: "idle" | "walking" | "setup" | "flight" | "recovery" = "idle";
  paused = false;
  terminal = false;
  linkChecked = false;
  elapsed = 0;
  recalculations = 0;
  completedJumps = 0;
  message = "Right-click a destination or walk with WASD.";
  private motion: Motion | undefined;
  private clock = 0;
  private manual: Point | undefined;
  private dirty = false;
  constructor(readonly course: Course = "terraces") {
    this.island = makeCourse(course);
    this.simulation = createSimulation(this.island);
    this.exploration = this.simulation.createState().exploration;
    for (let x = BOUNDS.minX + 0.25; x < BOUNDS.maxX; x += 0.5) {
      for (let z = BOUNDS.minZ + 0.25; z < BOUNDS.maxZ; z += 0.5) {
        const p = { x, z };
        const levels = [
          this.island.heightAt(x, z),
          ...this.island.solids
            .filter(
              (o) =>
                x + 0.3 > o.minX &&
                x - 0.3 < o.maxX &&
                z + 0.3 > o.minZ &&
                z - 0.3 < o.maxZ
            )
            .map((o) => o.maxY),
        ];
        // Footprint support: use production standability for the 0.6 m body.
        for (const dx of [-0.3, 0, 0.3]) {
          for (const dz of [-0.3, 0, 0.3]) {
            levels.push(this.island.heightAt(x + dx, z + dz));
          }
        }
        const y = Math.max(...levels);
        if (this.simulation.canStandAt(p, y)) {
          this.nodes.set(key(p), { ...p, y });
        }
      }
    }
    const spawn = this.nodes.get(key(this.island.spawn));
    if (!spawn) {
      throw new Error("Study spawn must be standable");
    }
    this.position = { ...spawn };
    this.buildEdges();
  }
  known(p: Point) {
    return exploredAt(this.exploration, p.x, p.z);
  }
  private knownFootprint(p: Point) {
    return [-0.3, 0, 0.3].every((dx) =>
      [-0.3, 0, 0.3].every((dz) => this.known({ x: p.x + dx, z: p.z + dz }))
    );
  }
  private trajectory(edge: Edge, t: number): Position {
    const y = edge.from.y + (edge.to.y - edge.from.y) * t;
    // Conservative parabolic jump, separate from production flight integration.
    const lift = edge.jump
      ? 4 * (0.35 + Math.abs(edge.to.y - edge.from.y) * 0.65) * t * (1 - t)
      : 0;
    return {
      x: edge.from.x + (edge.to.x - edge.from.x) * t,
      z: edge.from.z + (edge.to.z - edge.from.z) * t,
      y: y + lift,
    };
  }
  private edge(from: Position, to: Position): Edge | undefined {
    const rise = to.y - from.y;
    if (rise > this.tuning.climb || -rise > this.tuning.drop) {
      return undefined;
    }
    const jump = Math.abs(rise) > 0.01;
    const e = {
      from,
      to,
      jump,
      duration: jump
        ? Math.max(0.38, distance(from, to) / SPEED)
        : distance(from, to) / SPEED,
    };
    for (let i = 0; i <= 24; i++) {
      const p = this.trajectory(e, i / 24);
      if (!this.simulation.canStandAt(p, p.y)) {
        return undefined;
      }
    }
    return e;
  }
  private buildEdges() {
    this.edges.clear();
    for (const [id, from] of this.nodes) {
      const edges: Edge[] = [];
      // Four directions deliberately expose the coarse prototype's steering limits.
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        if (dx === undefined || dz === undefined) {
          continue;
        }
        for (const length of [0.5, 1, 1.5]) {
          const to = this.nodes.get(
            key({ x: from.x + dx * length, z: from.z + dz * length })
          );
          if (!to) {
            continue;
          }
          if (length > 0.5 && Math.abs(to.y - from.y) < 0.01) {
            continue;
          }
          const edge = this.edge(from, to);
          if (edge) {
            edges.push(edge);
          }
        }
      }
      this.edges.set(id, edges);
    }
  }
  configure(tuning: Tuning) {
    this.tuning = { ...tuning };
    this.buildEdges();
    this.dirty = true;
  }
  request(target: Point) {
    if (
      this.paused ||
      this.terminal ||
      !Number.isFinite(target.x) ||
      !Number.isFinite(target.z)
    ) {
      return;
    }
    this.destination = { ...target };
    this.manual = undefined;
    this.dirty = true;
    if (this.phase === "setup") {
      this.motion = undefined;
      this.phase = "idle";
      this.clock = 0;
    }
    if (!this.motion) {
      this.replan();
    }
  }
  direct(direction: Point | undefined) {
    if (this.paused || this.terminal) {
      return;
    }
    if (direction) {
      this.message = "Direct control";
      this.destination = undefined;
      this.plan = undefined;
      this.dirty = false;
    }
    const wasManual = this.manual !== undefined;
    const changed = !direction || !this.manual || !same(direction, this.manual);
    this.manual = direction;
    if (this.phase === "setup" && changed && (wasManual || direction)) {
      this.motion = undefined;
      this.phase = "idle";
      this.clock = 0;
    }
  }
  pause() {
    this.paused = true;
    this.manual = undefined;
  }
  resume() {
    this.paused = false;
  }
  blur() {
    this.manual = undefined;
  }
  openTerminal() {
    if (distance(this.position, this.island.terminal) > 3.2) {
      this.message = "Move closer to the terminal.";
      return;
    }
    this.terminal = true;
    this.manual = undefined;
  }
  closeTerminal() {
    this.terminal = false;
  }
  private knownEdge(edge: Edge) {
    for (let i = 0; i <= 6; i++) {
      if (!this.knownFootprint(this.trajectory(edge, i / 6))) {
        return false;
      }
    }
    return true;
  }
  replan() {
    this.dirty = false;
    const target = this.destination;
    if (!target) {
      return;
    }
    this.recalculations++;
    const start = this.nodes.get(key(this.position));
    if (!start) {
      return;
    }
    const queue = new Queue();
    queue.push(start, 0);
    const costs = new Map<string, number>([[key(start), 0]]);
    const parents = new Map<string, Edge>();
    let best = start,
      bestDistance = distance(start, target),
      bestCost = 0;
    for (let current = queue.pop(); current; current = queue.pop()) {
      const { node, cost } = current;
      if (cost !== costs.get(key(node))) {
        continue;
      }
      const d = distance(node, target);
      if (
        d < bestDistance - 0.001 ||
        (Math.abs(d - bestDistance) < 0.001 && cost < bestCost)
      ) {
        best = node;
        bestDistance = d;
        bestCost = cost;
      }
      for (const edge of this.edges.get(key(node)) ?? []) {
        if (!this.knownEdge(edge)) {
          continue;
        }
        const next =
          cost +
          edge.duration +
          (edge.jump ? this.tuning.setup + this.tuning.recovery : 0);
        if (next >= (costs.get(key(edge.to)) ?? Infinity)) {
          continue;
        }
        costs.set(key(edge.to), next);
        parents.set(key(edge.to), edge);
        queue.push(edge.to, next);
      }
    }
    const points: Position[] = [];
    let jumps = 0,
      cursor = best;
    while (!same(cursor, start)) {
      points.unshift(cursor);
      const parent = parents.get(key(cursor));
      if (!parent) {
        break;
      }
      if (parent.jump) {
        jumps++;
      }
      cursor = parent.from;
    }
    this.plan = { points, endpoint: best, seconds: bestCost, jumps };
    this.message =
      distance(best, target) < 0.36
        ? "Moving to destination"
        : points.length
          ? "Moving to the closest reachable point"
          : "At the closest reachable point · destination retained";
  }
  tick(seconds: number) {
    if (this.paused || !Number.isFinite(seconds) || seconds <= 0) {
      return;
    }
    // Background timer elapsed time is processed in small steps; OS suspension is not guaranteed.
    let remaining = Math.min(seconds, 5);
    while (remaining > 0.00001) {
      const dt = Math.min(remaining, 1 / 60);
      remaining -= dt;
      this.step(dt);
    }
  }
  private step(dt: number) {
    this.elapsed += dt;
    if (this.phase === "recovery") {
      this.clock -= dt;
      if (this.clock <= 0) {
        this.phase = "idle";
      }
      return;
    }
    if (!this.motion) {
      if (this.dirty) {
        this.replan();
      }
      let next: Edge | undefined;
      if (this.manual) {
        const direction = this.manual;
        next = (this.edges.get(key(this.position)) ?? []).find(
          (e) =>
            (e.to.x - e.from.x) * direction.x +
              (e.to.z - e.from.z) * direction.z >
            0.01
        );
      } else if (this.destination) {
        const target = this.plan?.points[0];
        if (target) {
          next = (this.edges.get(key(this.position)) ?? []).find((e) =>
            same(e.to, target)
          );
        } else if (distance(this.position, this.destination) <= 0.36) {
          this.destination = undefined;
          this.plan = undefined;
          this.message = "Arrived";
        }
      }
      if (!next) {
        this.phase = "idle";
        return;
      }
      this.motion = { edge: next, time: 0 };
      this.phase = next.jump ? "setup" : "walking";
      this.clock = this.tuning.setup;
    }
    const motion = this.motion;
    if (this.phase === "setup") {
      this.clock -= dt;
      if (this.clock <= 0) {
        this.phase = "flight";
      }
      return;
    }
    motion.time += dt;
    const t = Math.min(1, motion.time / motion.edge.duration);
    const base = this.trajectory(motion.edge, t);
    if (motion.edge.jump && this.manual) {
      const steer = Math.sin(Math.PI * t) * 0.18;
      const steered = {
        ...base,
        x: base.x + this.manual.x * steer,
        z: base.z + this.manual.z * steer,
      };
      this.position = this.simulation.canStandAt(steered, steered.y)
        ? steered
        : base;
    } else {
      this.position = base;
    }
    // Reuse production exploration reveal via its headless simulation seam.
    const state = this.simulation.createState();
    const revealed = this.simulation.advance(
      {
        ...state,
        ...this.position,
        exploration: this.exploration,
        paused: false,
      },
      {},
      1 / 120
    ).exploration;
    if (revealed !== this.exploration) {
      this.exploration = revealed;
      this.dirty = true;
    }
    if (t >= 1) {
      this.position = { ...motion.edge.to };
      this.motion = undefined;
      this.plan?.points.shift();
      if (motion.edge.jump) {
        this.phase = "recovery";
        this.clock = this.tuning.recovery;
        this.completedJumps++;
      } else {
        this.phase = "idle";
      }
      // Re-evaluate at safe graph nodes rather than redirecting a jump in flight.
      if (this.destination) {
        this.dirty = true;
      }
    }
  }
}
