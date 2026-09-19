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
