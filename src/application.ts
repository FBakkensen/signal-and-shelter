import { ControlSession } from "./session.ts";
import {
  advance,
  canUseTerminal,
  checkDataLink,
  createGame,
  look,
  transition,
} from "./game.ts";
import type { Obstacle } from "./collision.ts";
import type { Island } from "./world.ts";

export type ResumeResult =
  | { kind: "ignored" }
  | { kind: "keyboard" }
  | { kind: "capture"; generation: number };

// Owns game/session/menu transitions. Browser adapters only apply DOM and capture effects.
export class GameApplication {
  readonly session = new ControlSession();
  private currentIsland: Island;
  private currentState: ReturnType<typeof createGame>;
  private hasStarted = false;
  private terminal = false;
  private captureGeneration: number | null = null;

  constructor(island: Island) {
    this.currentIsland = island;
    this.currentState = createGame(island);
  }
  get island() {
    return this.currentIsland;
  }
  get state() {
    return this.currentState;
  }
  get started() {
    return this.hasStarted;
  }
  get terminalOpen() {
    return this.terminal;
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
      (!this.started || !this.state.paused || this.state.overview)
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
    this.currentState = createGame(island);
    this.session.keyboardPreferred = keyboard;
    return this.resume();
  }
  restart(): ResumeResult {
    this.pause();
    this.currentState = createGame(this.island);
    return this.resume();
  }
  chooseSeed() {
    this.pause();
    this.hasStarted = false;
    this.currentState = createGame(this.island);
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
      this.state.paused ||
      !canUseTerminal(this.state, this.island)
    ) {
      return false;
    }
    this.pause();
    this.terminal = true;
    return true;
  }
  checkLink() {
    if (this.terminal) {
      this.currentState = checkDataLink(this.state, this.island);
    }
  }
  captureSucceeded(): boolean {
    if (!this.started || this.terminal || !this.session.captureSucceeded()) {
      return false;
    }
    this.captureGeneration = null;
    this.currentState = transition(this.state, "capture");
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
      this.state.overview ||
      this.terminal ||
      this.session.mode === "keyboard"
    ) {
      return false;
    }
    this.pause();
    return true;
  }
  look(yaw: number, pitch: number) {
    this.currentState = look(this.state, yaw, pitch);
  }
  tick(seconds: number, obstacles: readonly Obstacle[]) {
    const rotation = this.session.look(seconds);
    this.look(rotation.yaw, rotation.pitch);
    this.currentState = advance(
      this.state,
      this.session.readInput(),
      seconds,
      this.island.heightAt,
      obstacles,
      this.island
    );
  }
}
