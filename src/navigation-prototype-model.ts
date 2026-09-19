// THROWAWAY: a grid/trajectory study, not the proposed production navigation API.
import { DEFAULT_ISLAND } from "./packages/island/index.ts";
import type { Island, Point } from "./packages/island/index.ts";
import type { Obstacle } from "./packages/island/geometry.ts";
import {
  createSimulation,
  WALK_SPEED,
  GRAVITY,
  JUMP_SPEED,
  STEP,
} from "./packages/play/simulation.ts";
import { exploredAt } from "./packages/play/exploration.ts";

export type Course = "terraces" | "detour" | "frontier" | "clearance";
export interface Position extends Point {
  y: number;
}
export interface Tuning {
  setup: number;
  recovery: number;
  jumpHeight: number;
}
export const PRESETS: Record<string, Tuning> = {
  brisk: { setup: 0.12, recovery: 0.12, jumpHeight: 1 },
  deliberate: { setup: 0.25, recovery: 0.3, jumpHeight: 1 },
  weighty: { setup: 0.45, recovery: 0.5, jumpHeight: 1 },
};
export const BOUNDS = { minX: -10, maxX: 18, minZ: -8, maxZ: 8 };
const SPEED = WALK_SPEED;
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
  apex: number;
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
  private state: ReturnType<ReturnType<typeof createSimulation>["createState"]>;
  exploration: ReturnType<
    ReturnType<typeof createSimulation>["createState"]
  >["exploration"];
  readonly nodes = new Map<string, Position>();
  readonly edges = new Map<string, Edge[]>();
  position: Position;
  tuning: Tuning = { setup: 0.12, recovery: 0.12, jumpHeight: 1 };
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
    const bounds = BOUNDS;
    this.simulation = createSimulation(this.island);
    this.state = { ...this.simulation.createState(), paused: false };
    this.exploration = this.state.exploration;
    for (let x = bounds.minX + 0.25; x < bounds.maxX; x += 0.5) {
      for (let z = bounds.minZ + 0.25; z < bounds.maxZ; z += 0.5) {
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
        if (this.supported({ ...p, y })) {
          this.nodes.set(key(p), { ...p, y });
        }
      }
    }
    const spawn = this.nodes.get(key(this.island.spawn));
    if (!spawn) {
      throw new Error("Study spawn must be standable");
    }
    this.position = { x: this.state.x, y: this.state.y, z: this.state.z };
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
  private surface(p: Point) {
    let y = this.island.heightAt(p.x, p.z);
    for (const solid of this.island.solids) {
      if (
        p.x >= solid.minX &&
        p.x <= solid.maxX &&
        p.z >= solid.minZ &&
        p.z <= solid.maxZ
      ) {
        y = Math.max(y, solid.maxY);
      }
    }
    return y;
  }
  private supported(p: Position) {
    return (
      this.simulation.canStandAt(p, p.y) &&
      [-0.299, 0, 0.299].every((dx) =>
        [-0.299, 0, 0.299].every(
          (dz) =>
            Math.abs(this.surface({ x: p.x + dx, z: p.z + dz }) - p.y) < 0.001
        )
      )
    );
  }
  private trajectory(edge: Edge, t: number): Position {
    // One ballistic arc, with zero vertical velocity at its apex.
    const gravity = GRAVITY;
    const up = JUMP_SPEED;
    const time = t * edge.duration;
    return {
      x: edge.from.x + (edge.to.x - edge.from.x) * t,
      z: edge.from.z + (edge.to.z - edge.from.z) * t,
      y: edge.jump
        ? edge.from.y + up * time - (gravity * time * time) / 2
        : edge.from.y,
    };
  }
  private walkable(from: Position, to: Position) {
    if (Math.abs(to.y - from.y) > 0.001) {
      return false;
    }
    const count = Math.max(2, Math.ceil(distance(from, to) / 0.05));
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      if (
        !this.supported({
          x: from.x + (to.x - from.x) * t,
          z: from.z + (to.z - from.z) * t,
          y: from.y,
        })
      ) {
        return false;
      }
    }
    return true;
  }
  private edge(from: Position, to: Position): Edge | undefined {
    if (!this.supported(from) || !this.supported(to)) {
      return undefined;
    }
    const rise = to.y - from.y;
    if (rise > this.tuning.jumpHeight || -rise > this.tuning.jumpHeight) {
      return undefined;
    }
    if (this.walkable(from, to)) {
      return {
        from,
        to,
        jump: false,
        duration: distance(from, to) / SPEED,
        apex: from.y,
      };
    }
    // Jump only over low solid geometry. Missing terrain is never a jumpable gap.
    let highest = Math.max(from.y, to.y);
    const samples = Math.ceil(distance(from, to) / 0.04);
    for (let i = 0; i <= samples; i++) {
      const t = i / samples,
        x = from.x + (to.x - from.x) * t,
        z = from.z + (to.z - from.z) * t;
      for (const dx of [-0.299, 0, 0.299]) {
        for (const dz of [-0.299, 0, 0.299]) {
          if (this.island.heightAt(x + dx, z + dz) < 1.2) {
            return undefined;
          }
          highest = Math.max(highest, this.surface({ x: x + dx, z: z + dz }));
        }
      }
    }
    if (highest - from.y > this.tuning.jumpHeight + 0.001) {
      return undefined;
    }
    const apex = from.y + (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY);
    const duration =
      (JUMP_SPEED + Math.sqrt(JUMP_SPEED * JUMP_SPEED - 2 * GRAVITY * rise)) /
      GRAVITY;
    if (distance(from, to) / duration > SPEED) {
      return undefined;
    }
    const edge = { from, to, jump: true, duration, apex };
    // Execute the real simulation for candidate jumps, including axis collision and landing.
    let state = { ...this.simulation.createState(), ...from, paused: false };
    for (let time = 0; time < duration + STEP * 2; time += STEP) {
      const remaining = Math.max(STEP, duration - time);
      const intent = {
        x: (to.x - state.x) / (remaining * SPEED),
        z: (to.z - state.z) / (remaining * SPEED),
      };
      state = this.simulation.advance(
        state,
        {
          direction: time < duration ? intent : { x: 0, z: 0 },
          jump: time === 0,
        },
        STEP
      );
      if (time > STEP && state.grounded) {
        return distance(state, to) < 0.04 &&
          Math.abs(state.y - to.y) < 0.001 &&
          this.supported(state)
          ? edge
          : undefined;
      }
    }
    return undefined;
  }
  private buildEdges() {
    this.edges.clear();
  }
  private outgoing(from: Position) {
    const id = key(from),
      existing = this.edges.get(id);
    if (existing && same(existing[0]?.from ?? from, from)) {
      return existing;
    }
    const edges: Edge[] = [];
    // Eight directions with swept body checks; diagonals cannot cut obstacle corners.
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ]) {
      if (dx === undefined || dz === undefined) {
        continue;
      }
      for (const length of [0.5, 1, 1.5, 2]) {
        const to = this.nodes.get(
          key({ x: from.x + dx * length, z: from.z + dz * length })
        );
        if (!to) {
          continue;
        }
        const edge = this.edge(from, to);
        if (edge && (length === 0.5 || edge.jump)) {
          edges.push(edge);
        }
        // If a supported walking step exists, walk closer before considering takeoff.
        if (length === 0.5 && edge && !edge.jump) {
          break;
        }
        // Land at the first supported surface that clears the obstruction.
        if (edge?.jump) {
          break;
        }
      }
    }
    this.edges.set(id, edges);
    return edges;
  }
  configure(tuning: Tuning) {
    this.tuning = { ...tuning };
    this.buildEdges();
    this.dirty = true;
  }
  cancelDestination() {
    this.destination = undefined;
    this.plan = undefined;
    this.dirty = false;
    if (this.phase === "walking" || this.phase === "setup") {
      this.motion = undefined;
      this.phase = "idle";
    }
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
    if (this.phase === "walking") {
      this.motion = undefined;
      this.phase = "idle";
    }
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
      if (this.phase === "walking") {
        this.motion = undefined;
        this.phase = "idle";
      }
      this.destination = undefined;
      this.plan = undefined;
      this.dirty = false;
    }
    const wasManual = this.manual !== undefined;
    const directionLength = direction
      ? Math.hypot(direction.x, direction.z)
      : 0;
    const normalized =
      direction && directionLength > 0
        ? { x: direction.x / directionLength, z: direction.z / directionLength }
        : undefined;
    const changed =
      !normalized || !this.manual || !same(normalized, this.manual);
    const length = direction ? Math.hypot(direction.x, direction.z) : 0;
    this.manual =
      direction && length > 0
        ? { x: direction.x / length, z: direction.z / length }
        : undefined;
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
    const start = { ...this.position };
    const entry = [...this.nodes.values()]
      .filter((p) => distance(p, start) < 1.1)
      .map((p) => this.edge(start, p))
      .filter(
        (e): e is Edge => e !== undefined && !e.jump && this.knownEdge(e)
      );
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
      for (const edge of same(node, start)
        ? [...entry, ...this.outgoing(node).filter((e) => same(e.from, start))]
        : this.outgoing(node)) {
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
      const dt = Math.min(remaining, STEP);
      remaining -= dt;
      this.step(dt);
    }
  }
  private move(direction: Point, dt: number, jump = false) {
    this.state = this.simulation.advance(this.state, { direction, jump }, dt);
    this.position = { x: this.state.x, y: this.state.y, z: this.state.z };
    if (this.state.exploration !== this.exploration) {
      this.exploration = this.state.exploration;
      this.dirty = true;
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
        const target = {
          x: this.position.x + direction.x * SPEED * dt,
          z: this.position.z + direction.z * SPEED * dt,
          y: this.position.y,
        };
        const ahead = {
          ...target,
          x: target.x + direction.x * 0.35,
          z: target.z + direction.z * 0.35,
        };
        if (this.walkable(this.position, ahead)) {
          this.move(direction, dt);
          this.phase = "walking";
          return;
        }
        // Stop at the solid edge, then find the first fully supported landing ahead.
        for (let length = 0.35; length <= 2.05; length += 0.05) {
          const p = {
            x: this.position.x + direction.x * length,
            z: this.position.z + direction.z * length,
          };
          const landing = { ...p, y: this.surface(p) };
          next = this.edge(this.position, landing);
          if (next?.jump) {
            break;
          }
          next = undefined;
        }
      } else if (this.destination) {
        const points = this.plan?.points ?? [];
        const target = points[0];
        if (target) {
          next = this.edge(this.position, target);
          // String-pull flat runs into a straight swept segment, not stair-step diagonals.
          for (let i = 1; i < points.length; i++) {
            const farther = points[i];
            if (!farther || !this.walkable(this.position, farther)) {
              break;
            }
            const direct = this.edge(this.position, farther);
            if (!direct || direct.jump || !this.knownEdge(direct)) {
              break;
            }
            next = direct;
            if (this.plan) {
              this.plan.points = points.slice(i);
            }
          }
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
    const remaining = Math.max(dt, motion.edge.duration - motion.time);
    const direction = {
      x: (motion.edge.to.x - this.position.x) / (remaining * SPEED),
      z: (motion.edge.to.z - this.position.z) / (remaining * SPEED),
    };
    if (motion.edge.jump && this.manual) {
      direction.x += this.manual.x * 0.12;
      direction.z += this.manual.z * 0.12;
    }
    this.move(direction, dt, motion.edge.jump && motion.time === 0);
    motion.time += dt;
    if (
      motion.edge.jump
        ? this.state.grounded
        : distance(this.position, motion.edge.to) < 0.001
    ) {
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
