export interface Point {
  x: number;
  y: number;
  z: number;
}
export interface Box {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}
export interface Capabilities {
  support: number;
  width: number;
  height: number;
  speed: number;
  jump: boolean;
  elevation: number;
  apex: number;
  gravity: number;
  preparation: number;
  recovery: number;
  alignment: number;
  steering: number;
}
export const HUMANOID: Readonly<Capabilities> = {
  support: 440,
  width: 600,
  height: 1800,
  speed: 70,
  jump: true,
  elevation: 1000,
  apex: 1250,
  gravity: 7,
  preparation: 7,
  recovery: 7,
  alignment: 250,
  steering: 1024,
};
export interface Motion extends Point {
  rx: number;
  rz: number;
  velocity: number;
}
export interface Flight {
  launchVelocity: number;
  heading: number;
  speed: number;
  delay: number;
  remaining: number;
  targetY: number;
  originY: number;
  ticks: Motion[];
}
export interface Actor {
  id: string;
  capabilities: Capabilities;
  motion: Motion;
  intent: number | null;
  phase: "ground" | "alignment" | "preparation" | "flight" | "recovery";
  timer: number;
  alignment: Motion[];
  plan: Flight | null;
  blocked: string | null;
}
export interface State {
  tick: number;
  actors: Actor[];
  paused: boolean;
  fault: string | null;
  trials: number;
  commands: { tick: number; order: number; command: Command }[];
  diagnostic: {
    attemptedTick: number;
    commands: readonly Command[];
    actors: Actor[];
  } | null;
}
export interface Command {
  actor: string;
  heading: number | null;
}
export interface Setup {
  boxes: readonly Box[];
  actors: readonly {
    id: string;
    position: Point;
    capabilities: Capabilities;
  }[];
}
