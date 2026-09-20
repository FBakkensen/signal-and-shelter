import type { Actor, Command, Motion, Setup, State } from "./types.ts";
import { createSoloTraversal } from "./simulation.ts";
import { movingOverlap } from "./contact.ts";
import { body, groundPath, overlaps } from "./geometry.ts";

function continuation(start: Actor, next: Actor): Motion[] {
  const path = [start.motion, next.motion];
  if (next.phase === "flight" && next.plan) {
    path.push(...next.plan.ticks.slice(next.plan.remaining));
  }
  if (
    next.plan &&
    (next.phase === "preparation" || next.phase === "alignment")
  ) {
    path.push(...next.alignment);
    const launch = path.at(-1) ?? next.motion;
    const wait =
      next.phase === "alignment" ? next.capabilities.preparation : next.timer;
    for (let i = 0; i < wait; i++) {
      path.push(launch);
    }
    path.push(...next.plan.ticks);
  }
  return path;
}
function conflict(a: Actor, an: Actor, b: Actor, bn: Actor): boolean {
  const ap = continuation(a, an),
    bp = continuation(b, bn);
  const ae = ap.at(-1),
    be = bp.at(-1);
  if (!ae || !be) {
    throw new Error("Missing continuation endpoint");
  }
  for (let i = 1; i < Math.max(ap.length, bp.length); i++) {
    if (
      movingOverlap(
        ap[i - 1] ?? ae,
        ap[i] ?? ae,
        a.capabilities,
        bp[i - 1] ?? be,
        bp[i] ?? be,
        b.capabilities
      )
    ) {
      return true;
    }
  }
  return overlaps(body(ae, a.capabilities), body(be, b.capabilities));
}
function stop(start: Actor, proposed: Actor): Actor {
  if (start.phase === "recovery") {
    return structuredClone(proposed);
  }
  return {
    ...structuredClone(start),
    intent: proposed.intent,
    phase: "ground",
    timer: 0,
    plan: null,
    alignment: [],
    motion: {
      ...start.motion,
      rx: proposed.motion.x === start.motion.x ? proposed.motion.rx : 0,
      rz: proposed.motion.z === start.motion.z ? proposed.motion.rz : 0,
      velocity: 0,
    },
    blocked: "Movement declined: occupied or protected space",
  };
}
/** Bounded experiment arbitration only: it does not make job or route decisions. */
export function createTraversal(setup: Setup) {
  if (setup.actors.length > 16) {
    throw new Error("Experiment supports at most 16 actors");
  }
  const geometry = structuredClone(setup.boxes);
  const whole = createSoloTraversal(setup);
  const solos = new Map(
    setup.actors.map((a) => [
      a.id,
      createSoloTraversal({ boxes: geometry, actors: [a] }),
    ])
  );
  const initial = whole.initial();
  function step(input: State, commands: readonly Command[] = []): State {
    if (input.paused || input.fault) {
      return structuredClone(input);
    }
    const result = structuredClone(input);
    result.tick++;
    result.commands.push(
      ...commands.map((command, order) => ({
        tick: result.tick,
        order,
        command: { ...command },
      }))
    );
    const halt = (message: string): State => ({
      ...structuredClone(input),
      fault: message,
      diagnostic: {
        attemptedTick: result.tick,
        commands: structuredClone(commands),
        actors: structuredClone(result.actors),
      },
    });
    if (commands.some((c) => !solos.has(c.actor))) {
      return halt("Unknown command actor");
    }
    const starts = new Map(input.actors.map((a) => [a.id, a]));
    function advance(
      a: Actor,
      actorCommands: readonly Command[]
    ): Actor | null {
      const solo = solos.get(a.id);
      if (!solo) {
        throw new Error("Missing actor simulation");
      }
      const next = solo.step(
        { ...input, actors: [structuredClone(a)], commands: [], trials: 0 },
        actorCommands
      );
      result.trials += next.trials;
      if (next.fault) {
        return null;
      }
      return next.actors[0] ?? null;
    }
    const fallbacks = new Map<string, Actor>();
    for (let i = 0; i < result.actors.length; i++) {
      const start = input.actors[i];
      if (!start) {
        return halt("Missing actor");
      }
      const proposed = advance(
        start,
        commands.filter((c) => c.actor === start.id)
      );
      if (!proposed) {
        return halt(`${start.id}: invalid independent transition`);
      }
      result.actors[i] = proposed;
      if (start.phase === "flight" && start.plan) {
        const retained = advance(start, [
          { actor: start.id, heading: start.plan.heading },
        ]);
        if (!retained) {
          return halt(`${start.id}: invalid retained continuation`);
        }
        retained.intent = proposed.intent;
        fallbacks.set(start.id, retained);
      }
    }
    const startFor = (a: Actor) => {
      const start = starts.get(a.id);
      if (!start) {
        throw new Error("Missing tick-start actor");
      }
      return start;
    };
    const safeWithOthers = (candidate: Actor) =>
      result.actors.every(
        (other) =>
          other.id === candidate.id ||
          !conflict(startFor(candidate), candidate, startFor(other), other)
      );
    const priority = (a: Actor) => {
      if (startFor(a).phase === "flight") {
        return 0;
      }
      // Preparation is a revocable proposal: it never blocks ordinary movement.
      if (
        a.plan &&
        (a.phase === "preparation" ||
          a.phase === "alignment" ||
          a.phase === "flight")
      ) {
        return a.id === "player" ? 3 : 4;
      }
      return a.id === "player" ? 1 : 2;
    };
    // Every rejection either restores a fixed commitment or reduces a bounded
    // movement to an integer endpoint. Never publish an intermediate proposal.
    const cap = Math.max(1, result.actors.length * result.actors.length * 204);
    for (let iteration = 0; iteration < cap; iteration++) {
      let pair: [number, number] | null = null;
      const indicesById = result.actors
        .map((a, index) => ({ id: a.id, index }))
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      for (let i = 0; i < indicesById.length && !pair; i++) {
        for (let j = i + 1; j < indicesById.length; j++) {
          const ai = indicesById[i]?.index,
            bi = indicesById[j]?.index;
          if (ai === undefined || bi === undefined) {
            continue;
          }
          const a = result.actors[ai],
            b = result.actors[bi];
          if (a && b && conflict(startFor(a), a, startFor(b), b)) {
            pair = [ai, bi];
            break;
          }
        }
      }
      if (!pair) {
        const error = whole.inspect(result);
        return error ? halt(error) : result;
      }
      const indices = [...pair].sort((i, j) => {
        const a = result.actors[i],
          b = result.actors[j];
        if (!a || !b) {
          return 0;
        }
        return priority(b) - priority(a) || (a.id < b.id ? 1 : -1);
      });
      let changed = false;
      let deferred: { index: number; actor: Actor } | null = null;
      for (const index of indices) {
        const candidate = result.actors[index];
        if (!candidate) {
          continue;
        }
        const start = startFor(candidate),
          retained = fallbacks.get(candidate.id);
        if (retained) {
          if (JSON.stringify(candidate) !== JSON.stringify(retained)) {
            result.actors[index] = structuredClone(retained);
            changed = true;
            break;
          }
          continue;
        }
        const stopped = stop(start, candidate);
        if (start.phase === "ground" && candidate.phase === "ground") {
          const dx = candidate.motion.x - start.motion.x,
            dz = candidate.motion.z - start.motion.z;
          const length = Math.max(Math.abs(dx), Math.abs(dz));
          for (let n = length - 1; n > 0; n--) {
            const shorter = structuredClone(stopped);
            shorter.motion.x += Math.round((dx * n) / length);
            shorter.motion.z += Math.round((dz * n) / length);
            if (
              groundPath(
                start.motion,
                shorter.motion,
                start.capabilities,
                geometry
              ) &&
              safeWithOthers(shorter)
            ) {
              stopped.motion = {
                ...shorter.motion,
                rx:
                  shorter.motion.x === candidate.motion.x
                    ? candidate.motion.rx
                    : 0,
                rz:
                  shorter.motion.z === candidate.motion.z
                    ? candidate.motion.rz
                    : 0,
              };
              break;
            }
          }
        }
        if (JSON.stringify(candidate) !== JSON.stringify(stopped)) {
          if (safeWithOthers(stopped)) {
            result.actors[index] = stopped;
            changed = true;
            break;
          }
          deferred ??= { index, actor: stopped };
        }
      }
      if (!changed && deferred) {
        result.actors[deferred.index] = deferred.actor;
        changed = true;
      }
      if (!changed) {
        return halt("No safe joint transition preserves committed movement");
      }
    }
    return halt("Joint movement resolution exceeded its experiment work bound");
  }
  return {
    initial: () => structuredClone(initial),
    step,
    pause: whole.pause,
    inspect: whole.inspect,
    geometry: whole.geometry,
    preview: (
      state: State,
      commands: readonly Command[],
      ticks: number
    ): State[] => {
      const states: State[] = [];
      let next = structuredClone(state);
      for (let i = 0; i < ticks; i++) {
        next = step(next, i === 0 ? commands : []);
        states.push(next);
        if (next.fault) {
          break;
        }
      }
      return states;
    },
  };
}
