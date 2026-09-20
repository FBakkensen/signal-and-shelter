import { clipGround } from "./contact.ts";
import type { Actor, Box, Command, Flight, Setup, State } from "./types.ts";
import {
  body,
  clear,
  envelope,
  groundPath,
  overlaps,
  supported,
} from "./geometry.ts";
import { validMotion } from "./numeric.ts";
import { flightStep, horizontal, trial } from "./motion.ts";
import { planJump } from "./planning.ts";
function others(actor: Actor, actors: readonly Actor[]): Box[] {
  const boxes: Box[] = [];
  for (const other of actors) {
    if (other.id === actor.id) {
      continue;
    }
    boxes.push(body(other.motion, other.capabilities));
    if (
      other.plan &&
      (other.phase === "flight" ||
        (actor.id !== "player" &&
          other.id === "player" &&
          (other.phase === "preparation" || other.phase === "alignment")))
    ) {
      let previous = other.motion;
      for (const step of other.plan.ticks.slice(other.plan.remaining)) {
        boxes.push(envelope(previous, step, other.capabilities));
        previous = step;
      }
    }
  }
  return boxes;
}
function reset(a: Actor) {
  a.phase = "ground";
  a.timer = 0;
  a.plan = null;
  a.alignment = [];
}
function fault(state: State, boxes: readonly Box[]): string | null {
  if (!Number.isSafeInteger(state.tick) || state.tick > 2 ** 48 - 1) {
    return "Tick counter overflow";
  }
  for (const a of state.actors) {
    if (!validMotion(a.motion)) {
      return `${a.id}: invalid integer motion`;
    }
    if (!clear(a.motion, a.motion, a.capabilities, boxes)) {
      return `${a.id}: body intersects static geometry`;
    }
    if (a.phase !== "flight" && !supported(a.motion, a.capabilities, boxes)) {
      return `${a.id}: unsupported grounded actor`;
    }
    if (a.phase === "flight" && !a.plan?.ticks[a.plan.remaining]) {
      return `${a.id}: missing committed continuation`;
    }
    for (const b of state.actors) {
      if (
        a.id !== b.id &&
        overlaps(body(a.motion, a.capabilities), body(b.motion, b.capabilities))
      ) {
        return `${a.id}: overlapping actor ${b.id}`;
      }
    }
  }
  return null;
}
export function createSoloTraversal(setup: Setup) {
  const boxes = structuredClone(setup.boxes);
  const ids = new Set<string>();
  for (const b of boxes) {
    if (
      ![b.minX, b.maxX, b.minY, b.maxY, b.minZ, b.maxZ].every(
        (v) => Number.isSafeInteger(v) && Math.abs(v) <= 1000000
      ) ||
      b.minX >= b.maxX ||
      b.minY >= b.maxY ||
      b.minZ >= b.maxZ
    ) {
      throw new Error("Invalid bounded integer geometry");
    }
  }
  const initial: State = {
    tick: 0,
    paused: false,
    fault: null,
    trials: 0,
    commands: [],
    diagnostic: null,
    actors: setup.actors.map((a) => {
      const c = a.capabilities;
      if (ids.has(a.id)) {
        throw new Error("Duplicate actor");
      }
      ids.add(a.id);
      for (const [key, value] of Object.entries(c)) {
        if (
          typeof value === "number" &&
          (!Number.isSafeInteger(value) || value < 0 || value > 10000)
        ) {
          throw new Error(`Invalid capability ${key}`);
        }
      }
      if (
        c.support <= 0 ||
        c.support % 2 !== 0 ||
        c.width < c.support ||
        c.width % 2 !== 0 ||
        c.height <= 0 ||
        c.speed < 1 ||
        c.speed > 100 ||
        c.gravity < 1 ||
        c.gravity > 20 ||
        c.apex > 2000 ||
        c.elevation > 2000 ||
        c.alignment > 500 ||
        c.preparation < 1 ||
        c.recovery < 1
      ) {
        throw new Error("Unsupported experiment capability range");
      }
      return {
        id: a.id,
        capabilities: { ...c },
        motion: { ...a.position, rx: 0, rz: 0, velocity: 0 },
        intent: null,
        phase: "ground",
        timer: 0,
        alignment: [],
        plan: null,
        blocked: null,
      };
    }),
  };
  initial.fault = fault(initial, boxes);
  function step(input: State, commands: readonly Command[] = []): State {
    if (input.paused || input.fault) {
      return structuredClone(input);
    }
    const state = structuredClone(input);
    state.tick++;
    const halt = (message: string): State => ({
      ...structuredClone(input),
      fault: message,
      diagnostic: {
        attemptedTick: state.tick,
        commands: structuredClone(commands),
        actors: structuredClone(state.actors),
      },
    });
    state.commands.push(
      ...commands.map((command, order) => ({
        tick: state.tick,
        order,
        command: { ...command },
      }))
    );
    for (const command of commands) {
      if (
        command.heading !== null &&
        (!Number.isInteger(command.heading) ||
          command.heading < 0 ||
          command.heading >= 65536)
      ) {
        return halt("Invalid resolved heading");
      }
      const a = state.actors.find((actor) => actor.id === command.actor);
      if (!a) {
        return halt("Unknown command actor");
      }
      if (
        a.intent !== command.heading &&
        (a.phase === "alignment" || a.phase === "preparation")
      ) {
        reset(a);
      }
      a.intent = command.heading;
    }
    const tickStarts = new Map(
      state.actors.map((a) => [a.id, { ...a.motion }])
    );
    const orderedActors = [...state.actors].sort((a, b) =>
      a.id === "player"
        ? -1
        : b.id === "player"
          ? 1
          : a.id < b.id
            ? -1
            : a.id > b.id
              ? 1
              : 0
    );
    for (const a of orderedActors) {
      if (a.intent !== null || a.phase !== "ground") {
        a.blocked = null;
      }
      const occupancy = others(a, state.actors);
      for (const other of state.actors) {
        const start = tickStarts.get(other.id);
        if (other.id !== a.id && start) {
          occupancy.push(envelope(start, other.motion, other.capabilities));
        }
      }
      if (a.phase === "recovery") {
        a.timer--;
        if (a.timer === 0) {
          reset(a);
        }
        continue;
      }
      if (a.phase === "flight" && a.plan) {
        const plan = a.plan;
        // Steering can atomically replace the remaining straight continuation.
        if (a.intent !== null && a.intent !== plan.heading) {
          const delta = ((a.intent - plan.heading + 98304) % 65536) - 32768;
          const steeredHeading =
            (plan.heading +
              Math.max(
                -a.capabilities.steering,
                Math.min(a.capabilities.steering, delta)
              ) +
              65536) %
            65536;
          const replacement: Flight = {
            ...plan,
            heading: steeredHeading,
            delay: Math.max(0, plan.delay - plan.remaining),
            remaining: 0,
            ticks: [],
          };
          const path = trial(
            a.motion,
            replacement,
            a.capabilities,
            boxes,
            occupancy
          );
          const end = path?.at(-1);
          if (
            path &&
            end &&
            Math.abs(end.y - plan.originY) <= a.capabilities.elevation
          ) {
            replacement.ticks = path;
            a.plan = replacement;
          }
        }
        const active = a.plan;
        const next = flightStep(
          a.motion,
          { ...active, delay: Math.max(0, active.delay - active.remaining) },
          a.capabilities,
          boxes,
          occupancy
        );
        const expected = active.ticks[active.remaining];
        if (
          !next ||
          !expected ||
          JSON.stringify(next.motion) !== JSON.stringify(expected)
        ) {
          return halt(
            `${a.id}: committed path became invalid at tick ${String(state.tick)}`
          );
        }
        a.motion = next.motion;
        active.remaining++;
        if (next.landed) {
          a.phase = "recovery";
          a.timer = a.capabilities.recovery;
          a.plan = null;
        }
        continue;
      }
      if (a.phase === "alignment") {
        const next = a.alignment.shift();
        if (
          next &&
          groundPath(a.motion, next, a.capabilities, boxes) &&
          clear(a.motion, next, a.capabilities, occupancy)
        ) {
          a.motion = { ...a.motion, ...next };
        } else if (next) {
          reset(a);
          a.blocked = "Alignment blocked";
          continue;
        }
        if (a.alignment.length === 0) {
          a.phase = "preparation";
          a.timer = a.capabilities.preparation;
        }
        continue;
      }
      if (a.phase === "preparation" && a.plan) {
        const launch = { ...a.motion, velocity: a.plan.launchVelocity };
        const path = trial(launch, a.plan, a.capabilities, boxes, occupancy);
        if (!path) {
          reset(a);
          a.motion.velocity = 0;
          a.blocked = "Yielding: landing or flight occupied";
          continue;
        }
        a.timer--;
        if (a.timer === 0) {
          a.plan.ticks = path;
          a.motion = launch;
          a.phase = "flight";
        }
        continue;
      }
      if (a.intent === null) {
        continue;
      }
      const intended = horizontal(a.motion, a.intent, a.capabilities.speed);
      const canWalk =
        validMotion(intended) &&
        groundPath(a.motion, intended, a.capabilities, boxes) &&
        clear(a.motion, intended, a.capabilities, occupancy);
      const plan = planJump(a, a.intent, boxes, occupancy, !canWalk);
      if (plan) {
        state.trials += plan.trials;
        a.plan = plan.flight;
        a.alignment = plan.alignment;
        if (a.alignment.length > 0) {
          a.phase = "alignment";
        } else {
          a.phase = "preparation";
          a.timer = a.capabilities.preparation;
        }
        continue;
      }
      if (canWalk) {
        a.motion = intended;
        continue;
      }
      const accepted = clipGround(a.motion, intended, a.capabilities, boxes);
      const moved = accepted.x !== a.motion.x || accepted.z !== a.motion.z;
      a.motion = accepted;
      if (!moved) {
        a.blocked = "No safe movement in the supported candidate family";
      }
    }
    const error = fault(state, boxes);
    return error ? halt(`${error} at tick ${String(state.tick)}`) : state;
  }
  return {
    initial: () => structuredClone(initial),
    step,
    pause: (state: State, paused: boolean): State => ({
      ...structuredClone(state),
      paused,
    }),
    inspect: (state: State) => fault(state, boxes),
    geometry: () => structuredClone(boxes),
    // Trials exercise the same complete tick interface without touching live state.
    preview: (
      state: State,
      commands: readonly Command[],
      ticks: number
    ): State[] => {
      const result: State[] = [];
      let next = structuredClone(state);
      for (let i = 0; i < ticks; i++) {
        next = step(next, i === 0 ? commands : []);
        result.push(next);
        if (next.fault) {
          break;
        }
      }
      return result;
    },
  };
}
