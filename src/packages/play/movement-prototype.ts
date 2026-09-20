// THROWAWAY experiment. Baseline physics, not the accepted integer foundation.
import { DEFAULT_ISLAND } from "../island/index.ts";
import type { Island } from "../island/index.ts";
import { createSimulation } from "./simulation.ts";
import type { GameState, Input } from "./simulation.ts";
import { RADIUS, STANDING_HEIGHT, terrainHeights } from "./lib/collision.ts";
import { inputFromKeys } from "./lib/controls.ts";

export const studyDimensions = { radius: RADIUS, height: STANDING_HEIGHT };
export const STUDY_STEP = 1 / 120;
export type Policy = "immediate" | "protected";
export type Scenario = "crossing" | "landing" | "steering" | "yielding";
export type Phase = "idle" | "preparing" | "airborne" | "recovery";
export interface StudyActor {
  name: string;
  state: GameState;
  phase: Phase;
  remaining: number;
  path: GameState[];
  direction: Input;
}
export const studyIsland: Island = {
  ...DEFAULT_ISLAND,
  spawn: { x: 0, z: 0 },
  heightAt: () => 3,
  solids: [],
  resources: [],
  vents: [],
};
const simulation = createSimulation(studyIsland);
export function fullySupported(state: GameState, island = studyIsland) {
  // Deliberately keep the entire existing square footprint. No smaller feet implied.
  return terrainHeights(state, island.heightAt).every(
    (height) => Math.abs(height - state.y) < 1e-7
  );
}
export function bodyConflict(a: GameState, b: GameState) {
  return (
    Math.abs(a.x - b.x) < RADIUS * 2 - 1e-7 &&
    Math.abs(a.z - b.z) < RADIUS * 2 - 1e-7 &&
    Math.abs(a.y - b.y) < STANDING_HEIGHT - 1e-7
  );
}
// Relative linear swept boxes between the two real physics samples.
export function sweptConflict(a: GameState, next: GameState, b: GameState) {
  let enter = 0,
    leave = 1;
  for (const axis of ["x", "y", "z"] as const) {
    const extent = axis === "y" ? STANDING_HEIGHT : RADIUS * 2;
    const start = a[axis] - b[axis];
    const delta = next[axis] - a[axis];
    if (Math.abs(delta) < 1e-12) {
      if (Math.abs(start) >= extent - 1e-7) {
        return false;
      }
    } else {
      const times = [
        (-extent + 1e-7 - start) / delta,
        (extent - 1e-7 - start) / delta,
      ];
      enter = Math.max(enter, Math.min(...times));
      leave = Math.min(leave, Math.max(...times));
    }
  }
  return enter < leave;
}
export function flight(state: GameState, direction: Input, takeoff: boolean) {
  const samples: GameState[] = [];
  let next = state;
  for (let i = 0; i < 240; i++) {
    next = simulation.advance(
      next,
      { ...direction, jump: takeoff && i === 0 },
      STUDY_STEP
    );
    samples.push(next);
    if (next.grounded) {
      return fullySupported(next) ? samples : [];
    }
  }
  return [];
}
function actor(name: string, x: number, z: number): StudyActor {
  const state = { ...simulation.createState(), x, z, y: 3, paused: false };
  state.previousPosition = { x, y: 3, z };
  return { name, state, phase: "idle", remaining: 0, path: [], direction: {} };
}
export class MovementStudy {
  player = actor("You", 0, 1.4);
  robot = actor("Robot", -1.4, 0);
  tick = 0;
  paused = false;
  fault = "";
  message = "Choose a walkthrough or move with WASD.";
  history: string[] = [];
  robotLanding = { x: 0, z: 0 };
  constructor(
    public policy: Policy,
    public scenario: Scenario
  ) {
    const path = flight(this.robot.state, { right: true }, true);
    const end = path.at(-1);
    if (!end) {
      throw new Error("Fixture has no supported landing");
    }
    this.robotLanding = { x: end.x, z: end.z };
    if (scenario === "landing" || scenario === "yielding") {
      this.player = actor("You", end.x, scenario === "yielding" ? 0.9 : 1.3);
    }
    if (scenario === "steering") {
      this.player = actor("You", -1.4, 0);
      this.robot = actor("Robot", end.x - 0.5, -1.2);
    }
  }
  note(message: string) {
    this.message = message;
    if (this.history.at(-1) !== message) {
      this.history.push(message);
      this.history = this.history.slice(-8);
    }
  }
  other(actor: StudyActor) {
    return actor === this.player ? this.robot : this.player;
  }
  protectedBy(other: StudyActor, before: GameState, next: GameState) {
    return (
      this.policy === "protected" &&
      other.phase === "airborne" &&
      other.path.some((sample) => sweptConflict(before, next, sample))
    );
  }
  pathClear(actor: StudyActor, path: GameState[]) {
    const other = this.other(actor);
    let before = actor.state;
    for (const sample of path) {
      if (
        sweptConflict(before, sample, other.state) ||
        this.protectedBy(other, before, sample) ||
        (actor === this.robot &&
          other.phase === "preparing" &&
          other.path.some((planned) => sweptConflict(before, sample, planned)))
      ) {
        return false;
      }
      before = sample;
    }
    return true;
  }
  jump(who: "player" | "robot") {
    if (this.paused || this.fault) {
      return;
    }
    const actor = this[who];
    if (actor.phase !== "idle") {
      return;
    }
    const direction =
      who === "robot" || this.scenario === "steering"
        ? { right: true }
        : { forward: true };
    const path = flight(actor.state, direction, true);
    if (
      !path.length ||
      (this.policy === "protected" && !this.pathClear(actor, path))
    ) {
      this.note(
        `${actor.name}: takeoff declined — another body or protected flight occupies the path.`
      );
      return;
    }
    if (
      this.policy === "protected" &&
      actor === this.player &&
      this.robot.phase === "preparing"
    ) {
      let before = actor.state;
      const conflicts = path.some((sample) => {
        const blocked = this.robot.path.some((planned) =>
          sweptConflict(before, sample, planned)
        );
        before = sample;
        return blocked;
      });
      if (conflicts) {
        this.yieldRobot();
      }
    }
    actor.path = path;
    actor.direction = direction;
    actor.remaining = 14;
    actor.phase = "preparing";
    this.note(
      `${actor.name}: preparing; ${this.policy === "protected" ? "not committed until takeoff" : "no future space protected"}.`
    );
  }
  yieldRobot() {
    this.robot.phase = "idle";
    this.robot.path = [];
    this.robot.remaining = 0;
    this.note(
      "Robot: yielded before takeoff. You keep priority; request its jump again when clear."
    );
  }
  step(keys: ReadonlySet<string> = new Set(), heading = 0) {
    if (this.paused || this.fault) {
      return;
    }
    const mapped = inputFromKeys(keys);
    const input: Input = {
      forward: mapped.forward === true,
      back: mapped.back === true,
      left: mapped.left === true,
      right: mapped.right === true,
    };
    const moving = Object.values(input).some(Boolean);
    // Stable player-first order is a fixture choice, not a fairness design.
    for (const actor of [this.player, this.robot]) {
      if (actor.phase === "preparing") {
        if (this.policy === "protected" && !this.pathClear(actor, actor.path)) {
          if (actor === this.robot) {
            this.yieldRobot();
          } else {
            actor.phase = "idle";
            actor.path = [];
            actor.remaining = 0;
            this.note(
              "You: takeoff cancelled because its completion is no longer clear."
            );
          }
          continue;
        }
        actor.remaining--;
        if (actor.remaining === 0) {
          actor.phase = "airborne";
          this.note(
            `${actor.name}: jump underway${this.policy === "protected" ? "; safe completion protected" : "; immediate contact only"}.`
          );
        }
        continue;
      }
      if (actor.phase === "recovery") {
        actor.remaining--;
        if (actor.remaining === 0) {
          actor.phase = "idle";
          actor.path = [];
        }
        continue;
      }
      if (actor.phase === "airborne") {
        if (actor === this.player && moving && !actor.state.grounded) {
          const steered = flight(
            { ...actor.state, yaw: heading },
            input,
            false
          );
          if (
            steered.length &&
            (this.policy === "immediate" || this.pathClear(actor, steered))
          ) {
            actor.path = steered;
            this.note("You: airborne steering accepted.");
          } else {
            this.note(
              "You: steering declined — the replacement flight has no clear supported completion."
            );
          }
        }
        const next = actor.path[0];
        if (!next) {
          throw new Error("Airborne actor has no trajectory");
        }
        if (sweptConflict(actor.state, next, this.other(actor).state)) {
          this.fault = `${actor.name}: immediate contact cannot complete this flight safely. Experiment halted before overlap; airborne freezing is NOT a valid solution.`;
          this.note(this.fault);
          return;
        }
        actor.state = next;
        actor.path.shift();
        if (next.grounded) {
          actor.phase = "recovery";
          actor.remaining = 14;
          actor.path = [];
          this.note(
            `${actor.name}: landed; remains here after recovery until given movement.`
          );
        }
        continue;
      }
      if (actor === this.player && moving) {
        const next = simulation.advance(
          { ...actor.state, yaw: heading },
          input,
          STUDY_STEP
        );
        const other = this.other(actor);
        if (
          !fullySupported(next) ||
          sweptConflict(actor.state, next, other.state)
        ) {
          this.note(
            "You: movement blocked by occupied space or missing full support."
          );
        } else if (this.protectedBy(other, actor.state, next)) {
          this.note(
            "You: movement temporarily blocked by the robot's protected flight corridor."
          );
        } else {
          actor.state = next;
        }
      }
    }
    this.tick++;
  }
}
