# Numeric primitives validation

2026-09-20. Validation plan for the standalone production numeric package.

- Compare division, centered residues, region normalization and rebasing with BigInt references; assert negative crossings, extrema, ties and rejection before unsafe arithmetic.
- Regenerate the versioned Q24 table and checksum. Exercise every heading for symmetry, inward norm bounds and deterministic target conversion. Test long turning/stopping/reversing sequences and axis-specific contact projection.
- Lock byte encoding and random output to golden vectors, including Unicode, field separation, counter carry, stream isolation, rejection sampling and exhaustion.
- Validate individual capability units and accepted humanoid defaults; reject fractional/out-of-range values.
- Run the complete project check and verify no existing game entry point imports the new package. No gameplay/UI change is intended, so browser interactions are not required for this increment. Cross-runtime replay and scale acceptance remain later tasks.

## Results

- Environment: Linux, Node 26.5.0, locked npm dependencies. No browser runtime or second machine was exercised.
- `npm run check`: passed table reproduction, strict types, package dependency rules (58 modules), zero-warning ESLint, all 15 test-file suites, formatting and production build. Existing Vite chunk-size warning remains (647.86 kB JavaScript); it is unrelated to this package.
- `node --import tsx --test --test-isolation=none --test-reporter spec src/packages/numeric/tests/*.test.ts`: all ten named numeric/random cases passed, including the final unsupported-version case.
- `npm run numeric:generate` followed by `npm run numeric:verify`: passed; formatting also accepts the regenerated source. SHA-256 over signed-32 LE table bytes: `51536c7e41109875da68c138322b4b6692ba98509db8d5024b3708b94cd40b80`.
- Every heading has an inward norm with deficit less than sqrt(2) Q24 units; the 60-/90-place recipes agree entry for entry. BigInt dot comparisons establish selected headings beat or tie all other headings for the tested targets and use the lowest-index tie rule.
- Signed quotient/rounding references include safe-integer extrema; region tests include negative normalization, signed-32 limits, distant-query rejection and the exact 1 km rebase boundary. 100,000 free-motion steps preserve the exact accumulated position/residue identity. Contact projection tests only verify arithmetic clearing; no collision solver is implemented.
- Random tests lock UTF-8 bytes and wide-counter vectors, independently compare modular hashing with BigInt, and exercise rejection consumption, exhaustion, immutable state and separate entity/purpose streams. Capability tests cover accepted defaults and invalid units.
- The first full-check attempts found a generated-source formatting mismatch, an ES2024 string API incompatible with the ES2023 target, and strict lint violations. All were corrected without changing compiler/lint settings. Dependency installation initially failed under restricted DNS; installing locked dependencies with network access succeeded.
- Production-baseline comparison and import inspection show no changes to existing runtime entry points, gameplay/UI or assets. No prototype routes/source were copied or merged. Browser checks are not required for this standalone library increment.

## Limits

The numeric package is not wired into normal play. This evidence does not establish generation migration, collision/support predicates, authoritative ticks/replay, cross-runtime determinism, target-heading throughput or normal-speed actor capacity. Those remain owned by downstream implementation tickets. The table check uses reproducible high-precision generation and full-table properties; it is not a formal proof of the Taylor recipe's error bound.

## PR review regression — 2026-09-20

CodeRabbit identified that truncation could expose trailing whitespace, making a normalized seed fail the stream constructor's canonicality check. Validation plan: exercise normalization followed by stream creation for space, tab, newline and nonbreaking space at the truncation boundary, assert idempotence, then run the full checks. Also compare 100 draws and final states from independent same-key streams through rejection sampling.

The new production-interface regression failed before the fix with `Seed must be resolved and canonical`. A final trim after truncation/surrogate repair makes the result canonical. Existing canonical seed/hash vectors remain unchanged; this corrects the unmerged seed-v1 implementation. The old live-game normalizer is untouched. No gameplay/UI change or browser validation is involved.

After the fix, `npm run check` passed all stages, including both new regressions. The existing Vite bundle-size warning remains.
