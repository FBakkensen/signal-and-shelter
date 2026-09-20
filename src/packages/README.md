# TypeScript packages

Each reusable package is a deep module with a small interface and a hidden implementation. Copy `example/` as a starting point; run `npm run lint:boundaries` to check package imports.

```text
src/packages/<name>/
├── index.ts       # public entry point; additional root files may also be entry points
├── lib/           # private implementation
└── tests/         # private tests and fixtures
```

1. **Entry-point imports:** Import only through a package's entry points (its root files); anything in any subfolder is private to that package. Prefer several small entry points to one barrel that re-exports an entire implementation subtree.
2. **Intra-package imports:** A package's implementation may import its own internals freely, but cross-package imports go through the other package's entry points.
3. **Tests through the interface:** Tests exercise packages through their entry points; they may also use their own package's `tests/` fixtures, but not implementation internals. Tests may integrate several packages through their entry points.
4. **No cycles:** Keep the dependency graph acyclic.

## Implemented modules

- `island/index.ts`: seeded island generation with matching `solids`.
- `island/geometry.ts`: pure render/authoring descriptions and terrain geometry.
- `play/index.ts`: browser-facing play actions and read-only observations.
- `play/simulation.ts`: deterministic headless simulation bound to one island, also used by the play implementation and traversal scenarios.

`lib/` files are private. Keep Three.js and DOM effects in the application adapters. The simulation entry point deliberately supports controlled terrain and solid geometry without exposing the collision helpers, session, or input mapping. Tests cross those same entry points. Entry-point checks include top-level `tests/` as well as package tests.

- `numeric/index.ts`: checked region/local coordinates, Q24 direction lookup, target conversion and displacement/residue arithmetic.
- `numeric/random.ts`: versioned canonical encoding and addressed/stateful integer randomness.
- `numeric/capabilities.ts`: effective movement units and accepted humanoid defaults.

The numeric package is implemented for the foundation migration but is not yet connected to normal play. Its Node-only `generate.ts` entry point is offline tooling; see [numeric interface documentation](numeric/README.md).
