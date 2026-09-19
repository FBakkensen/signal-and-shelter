# Whole-codebase review — 2026-09-19

## Scope and method

User requested review of everything because no earlier code had been reviewed. Reviewed the entire current working implementation, including uncommitted arrival changes and the new world-visuals module, its tests, and `docs/testing/experiment-004.md`. Read current source, tests, configuration, asset-generation scripts and project requirements. Archived/deleted comparison implementations are historical context, not live code. Authored binary assets were covered by the existing real GLTFLoader geometry/collision test; Blender source scenes were not re-opened during this review.

Baseline: Git empty tree `4b825dc642cb6eb9a060e54bf8d69288fbee4904`. Review command: `git diff 4b825dc642cb6eb9a060e54bf8d69288fbee4904 -- .`, supplemented with the untracked files above. This explicitly includes working-tree changes; a three-dot HEAD-only diff would omit the latest implementation. HEAD was `8df36f952dac32a1185a574097423cdad680e057`; history also includes `b44b5cf`, `17d320e`, and `fd70e00`.

Separate parallel standards and spec reviewers reported independently. Standards: AGENTS.md, testing workflow, architecture, decisions and the code-review skill's smell baseline. Spec: user requests, vision, controls plan and accepted decisions. No issue-tracker configuration exists; local requirements supplied the spec.

## Standards

1. **P2 — Missing automated coverage for application lifecycle orchestration.** `src/main.ts` owns real terminal/menu/pointer-lock/world-replacement transitions, but no automated test executes this orchestration. Unit tests of game/session logic do not exercise their browser-adapter integration. This conflicts with AGENTS.md's requirement that all application logic have production-code automated tests and testing.md's separation requirement. Extract a testable lifecycle controller or exercise the actual adapter, including terminal-background clicks, capture cancellation and seed replacement.
2. **P3 — Possible Duplicated Code (judgment call).** Resource base dimensions and crystal width/elevation are separately specified in `src/scene.ts:178–187` and `src/collision.ts:168–181`. Current values agree, but changes can create invisible walls. Share resource part definitions as already done for ships and vents. This is a maintenance risk, not a current observed collision mismatch.

## Spec

1. **P2 — Clicking the world resumes gameplay under the terminal.** `src/main.ts:301–304` checks only `started`, `paused` and `!overview`; it does not exclude `terminalOpen`. `resume()` activates play without clearing the terminal panel. This violates architecture.md's paused-terminal contract and can request capture in a menu, contrary to controls-plan.md.

Actual browser reproduction on a fixed test seed, keyboard controls: Keep wandering → E → click exposed canvas at desktop coordinates (1420,700) → Space. The accessibility state simultaneously showed the terminal/check-connection button, active-play pause button/resource journal and **Airborne**. The world had resumed while the terminal remained open. Escape restored the ordinary pause state. Mouse-mode consequence is inferred from the shared resume path, not browser-verified.

## Verification and disposition

`npm run check` passed: strict TypeScript, zero-warning lint, all six test files, formatting and production build. Existing approximately 631 kB bundle warning remains. Passing tests did not detect the browser-confirmed terminal defect.

No implementation fixes were made during this review. All three findings were subsequently fixed and validated in the [review-fix follow-up](review-fixes.md). Standards: 2 findings (worst: P2 lifecycle coverage); Spec: 1 finding (worst: P2 terminal pause violation). No other concrete spec discrepancies identified. Previously documented full browser traversal and pointer-lock limitations remain; this review does not validate those flows.
