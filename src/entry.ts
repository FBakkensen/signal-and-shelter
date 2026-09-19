if (
  import.meta.env.DEV &&
  new URLSearchParams(location.search).has("variant")
) {
  await import("./visual-prototype.ts");
} else {
  await import("./main.ts");
}
export {};
