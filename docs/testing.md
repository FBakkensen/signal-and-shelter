# Testing workflow

User requirement, accepted 2026-09-19: all logic requires real automated tests; gameplay and UI require real tests in the integrated browser.

## Choose checks from the change

Before testing, write a short validation plan naming the changed behaviors and likely failure modes. For each check, specify the action, expected result, observable evidence, and whether it belongs in automated tests or the browser. Scale the plan to the change: deterministic logic gets production-code tests; browser checks establish integration, interaction, and visual behavior.

Run the smallest set of checks that resolves those risks. Reuse existing evidence for unaffected behavior. Extend testing only when a failure, further change, or unresolved risk justifies another check. Full-world traversal belongs to changes affecting world reachability or discovery; a resume-button fix needs a focused pause/resume check.

If a tool cannot exercise a behavior faithfully, record the exact limitation and stop that check. Avoid prolonged substitute interactions such as thousands of discrete presses standing in for a held key. Once the planned checks pass or have explicit blockers, stop testing and report the evidence and remaining gaps.

## Implement and test logic

1. Identify changed behavior and edge cases. Keep world and gameplay logic independently executable, separated from DOM and rendering adapters.
2. Add automated tests that import and execute the production implementation. Assert observable outcomes, not copied algorithms, placeholder assertions, or mocked replacements for the logic under test.
3. Cover normal behavior and relevant boundaries: terrain edges, collision, frame timing, input combinations, and state transitions. Add regression coverage when fixing a bug.
4. Run `npm run check`: strict TypeScript, type-aware ESLint with zero warnings, automated tests, formatting, and the production build. Fix failures before proceeding. Tests or build success alone do not establish gameplay correctness.

## Test gameplay and UI in the integrated browser

1. Start the app with `npm run dev -- --port 5173` and open its printed local URL in the Codex integrated browser.
2. Inspect the initial scene and UI. Perform real keyboard, mouse, and button interactions using browser tools. Do not substitute internal state mutations or synthetic calls to game functions for user interaction.
3. Execute the planned checks for affected flows. For input/lifecycle changes, verify paused states stop movement and held inputs clear. For visual changes, inspect the affected view.
4. Inspect screenshots where visual evidence is needed. Check desktop and narrow layouts when the change can affect layout. Read browser errors relevant to the exercised flow and resolve application failures.
5. Record the actual environment, actions, observable results, automated test outcome, and limitations in `docs/testing/`. Distinguish automated logic tests from browser interaction checks. If an essential browser capability is unavailable, report the missing validation explicitly; do not call that flow verified.

## Completion

Every new or changed logic behavior has passing automated coverage, the build passes, and affected gameplay/UI flows have been exercised in the integrated browser. Update the relevant project documents and link the test record in the handoff. Performance and audio quality claims require actual measurement or listening; screenshots cannot establish them.
