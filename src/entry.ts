// The camera study is opt-in and development-only; normal play keeps its entry.
if (
  import.meta.env.DEV &&
  new URLSearchParams(location.search).has("variant")
) {
  await import("./camera-prototype.ts");
} else {
  await import("./main.ts");
}
export {};
