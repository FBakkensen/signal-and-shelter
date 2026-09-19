import { ControlSession } from "./session.ts";
import {
  canUseTerminal,
  checkDataLink,
  look,
  transition,
  viewPosition,
} from "./game.ts";
import { createSimulation } from "../simulation.ts";
import { mouseLook } from "./controls.ts";
import type { GameState } from "./game.ts";
import type { Island } from "../../island/index.ts";

export type PlayState = Readonly<
  Pick<
    GameState,
    | "x"
    | "y"
    | "z"
    | "yaw"
    | "pitch"
    | "distance"
    | "grounded"
    | "crouching"
    | "paused"
    | "overview"
    | "linkChecked"
  >
> & { readonly discovered: readonly string[] };

export type ResumeResult =
  | { kind: "ignored" }
  | { kind: "keyboard" }
  | { kind: "capture"; generation: number };

// Owns game/session/menu transitions. Browser adapters only apply DOM and capture effects.
export class GameApplication {
  private readonly session = new ControlSession();
  private simulation: ReturnType<typeof createSimulation>;
  private currentIsland: Island;
  private currentState: GameState;
  private hasStarted = false;
  private terminal = false;
  private captureGeneration: number | null = null;

  constructor(island: Island) {
    this.currentIsland = island;
    this.simulation = createSimulation(island);
    this.currentState = this.simulation.createState();
  }
  get island() {
    return this.currentIsland;
  }
  get state(): PlayState {
    return this.currentState;
  }
  get started() {
    return this.hasStarted;
  }
  get terminalOpen() {
    return this.terminal;
  }

  get keyboardPreferred() {
    return this.session.keyboardPreferred;
  }
  get controlMode() {
    return this.session.mode;
  }
  get canUseTerminal() {
    return (
      this.started &&
      !this.currentState.paused &&
      canUseTerminal(this.currentState, this.island)
    );
  }
  get viewPosition() {
    return viewPosition(this.currentState);
  }
  press(code: string) {
    return this.session.press(code);
  }
  release(code: string) {
    this.session.release(code);
  }
  mouseMoved(dx: number, dy: number, sensitivity: number, invertY: boolean) {
    if (this.session.mode !== "locked") {
      return;
    }
    const delta = mouseLook(dx, dy, sensitivity, invertY);
    this.look(delta.yaw, delta.pitch);
  }

  pause(overview = false) {
    this.terminal = false;
    this.captureGeneration = null;
    this.session.pause();
    this.currentState = transition(
      this.currentState,
      overview ? "overview" : "pause"
    );
  }
  resume(source: "button" | "canvas" | "terminal" = "button"): ResumeResult {
    if (
      source === "canvas" &&
      (!this.started || !this.currentState.paused || this.currentState.overview)
    ) {
      return { kind: "ignored" };
    }
    if (source === "terminal") {
      if (!this.terminal) {
        return { kind: "ignored" };
      }
      this.terminal = false;
    }
    if (this.terminal) {
      return { kind: "ignored" };
    }
    if (this.session.mode === "capturing" || this.session.active) {
      return { kind: "ignored" };
    }
    this.hasStarted = true;
    this.currentState = transition(this.currentState, "return");
    const generation = this.session.resume();
    this.captureGeneration = generation;
    if (generation === null) {
      this.currentState = transition(this.currentState, "capture");
      return { kind: "keyboard" };
    }
    return { kind: "capture", generation };
  }
  start(island: Island, keyboard: boolean): ResumeResult {
    this.pause();
    this.currentIsland = island;
    this.simulation = createSimulation(island);
    this.currentState = this.simulation.createState();
    this.session.keyboardPreferred = keyboard;
    return this.resume();
  }
  restart(): ResumeResult {
    this.pause();
    this.currentState = this.simulation.createState();
    return this.resume();
  }
  chooseSeed() {
    this.pause();
    this.hasStarted = false;
    this.currentState = this.simulation.createState();
  }
  switchControls(): ResumeResult {
    const keyboard = !this.session.keyboardPreferred;
    this.pause();
    this.session.keyboardPreferred = keyboard;
    return this.resume();
  }
  openTerminal(): boolean {
    if (
      !this.started ||
      this.currentState.paused ||
      !canUseTerminal(this.currentState, this.island)
    ) {
      return false;
    }
    this.pause();
    this.terminal = true;
    return true;
  }
  checkLink() {
    if (this.terminal) {
      this.currentState = checkDataLink(this.currentState, this.island);
    }
  }
  captureSucceeded(): boolean {
    if (!this.started || this.terminal || !this.session.captureSucceeded()) {
      return false;
    }
    this.captureGeneration = null;
    this.currentState = transition(this.currentState, "capture");
    return true;
  }
  captureFailed(generation = this.captureGeneration): boolean {
    if (generation === null || !this.session.captureFailed(generation)) {
      return false;
    }
    this.pause();
    return true;
  }
  captureLost(): boolean {
    if (
      this.currentState.overview ||
      this.terminal ||
      this.session.mode === "keyboard"
    ) {
      return false;
    }
    this.pause();
    return true;
  }
  private look(yaw: number, pitch: number) {
    this.currentState = look(this.currentState, yaw, pitch);
  }
  tick(seconds: number) {
    const rotation = this.session.look(seconds);
    this.look(rotation.yaw, rotation.pitch);
    this.currentState = this.simulation.advance(
      this.currentState,
      this.session.readInput(),
      seconds
    );
  }
}
