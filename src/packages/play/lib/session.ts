import { inputFromKeys, keyboardLook, MOVEMENT_KEYS } from "./controls.ts";

// Browser-independent input lifecycle. DOM adapters only report real events.
export class ControlSession {
  mode: "paused" | "capturing" | "locked" | "keyboard" = "paused";
  private generation = 0;
  keyboardPreferred = false;
  useKeyboard() {
    this.pause();
    this.keyboardPreferred = true;
    this.mode = "keyboard";
  }
  resume() {
    if (this.keyboardPreferred) {
      this.useKeyboard();
      return null;
    }
    return this.requestCapture();
  }
  look(seconds: number) {
    return keyboardLook(this.active ? this.keys : new Set<string>(), seconds);
  }
  private readonly keys = new Set<string>();
  clearInput() {
    this.keys.clear();
  }
  pause() {
    this.mode = "paused";
    this.generation++;
    this.keys.clear();
  }
  requestCapture() {
    this.keyboardPreferred = false;
    this.pause();
    this.mode = "capturing";
    return this.generation;
  }
  captureSucceeded() {
    if (this.mode !== "capturing") {
      return false;
    }
    this.mode = "locked";
    return true;
  }
  captureFailed(generation: number) {
    if (generation !== this.generation || this.mode !== "capturing") {
      return false;
    }
    this.pause();
    return true;
  }
  get active() {
    return this.mode === "locked" || this.mode === "keyboard";
  }
  press(code: string) {
    if (!this.active || !MOVEMENT_KEYS.has(code)) {
      return false;
    }
    this.keys.add(code);
    return true;
  }
  release(code: string) {
    this.keys.delete(code);
  }
  readInput() {
    const input = inputFromKeys(this.keys);
    return input;
  }
}
