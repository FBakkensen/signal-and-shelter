import { ControlSession } from "./session.ts";
import {
  canUseTerminal,
  checkDataLink,
  look,
  transition,
  viewPosition,
  renderPose,
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
    | "traversal"
    | "paused"
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

  get exploration() {
    return this.currentState.exploration;
  }
  private facingAngle = 0;
  private selected: string | null = null;
  private readonly orbitSources = new Set<string>();
  constructor(
    island: Island,
    private readonly thirdPerson = false
  ) {
    this.currentIsland = island;
    this.simulation = createSimulation(island);
    this.currentState = this.simulation.createState();
  }
  get facing() {
    return this.facingAngle;
  }
  get selection() {
    return this.selected;
  }
  select(id: string | null) {
    if (!this.started || this.state.paused || this.terminal) {
      return;
    }
    this.selected =
      id === "ship" || this.island.resources.some((r) => r.id === id)
        ? id
        : null;
  }
  get canUseSelection() {
    return (
      (this.selected === null || this.selected === "ship") &&
      this.canUseTerminal
    );
  }
  useSelection() {
    return this.canUseSelection && this.openTerminal();
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
      !this.terminal &&
      canUseTerminal(this.currentState, this.island)
    );
  }
  get renderPose() {
    return renderPose(this.currentState);
  }
  get viewPosition() {
    return viewPosition(this.currentState);
  }
  press(code: string) {
    if (this.terminal) {
      return false;
    }
    if (
      this.session.active &&
      ["KeyW", "KeyA", "KeyS", "KeyD"].includes(code)
    ) {
      this.currentState = { ...this.currentState, preservePreparation: false };
    }
    if (this.thirdPerson) {
      if (
        this.session.active &&
        ["KeyQ", "KeyE", "ArrowLeft", "ArrowRight"].includes(code)
      ) {
        this.orbitSources.add(code);
      }
      if (code === "Home" && this.session.active) {
        this.look(-this.state.yaw, 0);
        return true;
      }
      if (code === "ArrowUp" || code === "ArrowDown") {
        return false;
      }
      code =
        code === "KeyQ" ? "ArrowLeft" : code === "KeyE" ? "ArrowRight" : code;
    }
    return this.session.press(code);
  }
  release(code: string) {
    if (!this.state.paused && ["KeyW", "KeyA", "KeyS", "KeyD"].includes(code)) {
      this.currentState = { ...this.currentState, preservePreparation: false };
    }
    if (this.thirdPerson) {
      this.orbitSources.delete(code);
      const mapped =
        code === "KeyQ" ? "ArrowLeft" : code === "KeyE" ? "ArrowRight" : code;
      if (
        (mapped === "ArrowLeft" &&
          (this.orbitSources.has("KeyQ") ||
            this.orbitSources.has("ArrowLeft"))) ||
        (mapped === "ArrowRight" &&
          (this.orbitSources.has("KeyE") ||
            this.orbitSources.has("ArrowRight")))
      ) {
        return;
      }
      this.session.release(mapped);
    } else {
      this.session.release(code);
    }
  }
  mouseMoved(dx: number, dy: number, sensitivity: number, invertY: boolean) {
    if (this.session.mode !== "locked") {
      return;
    }
    const delta = mouseLook(dx, dy, sensitivity, invertY);
    this.look(delta.yaw, delta.pitch);
  }

  focusLost() {
    this.orbitSources.clear();
    this.session.clearInput();
  }
  pause() {
    this.orbitSources.clear();
    this.terminal = false;
    this.captureGeneration = null;
    this.session.pause();
    this.currentState = transition(this.currentState, "pause");
  }
  resume(source: "button" | "canvas" | "terminal" = "button"): ResumeResult {
    if (source === "canvas" && (!this.started || !this.currentState.paused)) {
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
    const heading = this.state.yaw;
    this.pause();
    this.selected = null;
    this.facingAngle = 0;
    this.currentIsland = island;
    this.simulation = createSimulation(island);
    this.currentState = this.simulation.createState();
    if (this.thirdPerson) {
      this.currentState = { ...this.currentState, yaw: heading };
    }
    this.session.keyboardPreferred = this.thirdPerson || keyboard;
    return this.resume();
  }
  restart(): ResumeResult {
    const heading = this.state.yaw;
    this.pause();
    this.selected = null;
    this.facingAngle = 0;
    this.currentState = this.simulation.createState();
    if (this.thirdPerson) {
      this.currentState = { ...this.currentState, yaw: heading };
    }
    return this.resume();
  }
  chooseSeed() {
    const heading = this.state.yaw;
    this.pause();
    this.selected = null;
    this.hasStarted = false;
    this.currentState = this.simulation.createState();
    if (this.thirdPerson) {
      this.currentState = { ...this.currentState, yaw: heading };
    }
  }
  switchControls(): ResumeResult {
    const keyboard = !this.session.keyboardPreferred;
    this.pause();
    this.session.keyboardPreferred = this.thirdPerson || keyboard;
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
    this.orbitSources.clear();
    this.session.pause();
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
    if (this.terminal || this.session.mode === "keyboard") {
      return false;
    }
    this.pause();
    return true;
  }
  private look(yaw: number, pitch: number) {
    this.currentState = look(this.currentState, yaw, pitch);
  }
  tick(seconds: number) {
    const previous = this.currentState;
    const rotation = this.session.look(seconds);
    this.look(rotation.yaw, rotation.pitch);
    this.currentState = this.simulation.advance(
      this.currentState,
      this.session.readInput(),
      seconds
    );
    const dx = this.state.x - previous.x,
      dz = this.state.z - previous.z;
    if (dx * dx + dz * dz > 0.000001) {
      this.facingAngle = Math.atan2(-dx, -dz);
    }
  }
}
