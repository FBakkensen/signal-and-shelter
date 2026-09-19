# Wayfinder prototype handoff

Apply the experiment guidance to all prototypes in this project. Apply the branch and handoff workflow when a wayfinder map uses prototypes, including maps whose Notes authorize later implementation.

## Design a representative experiment

A prototype should be representative of the real implementation wherever that could change the conclusion, while doing only the work needed to answer the experiment's question. Aim for valid learning, not production readiness or a miniature rebuild of the whole product. Adapt generic prototype-skill artifact conventions to this requirement; a single-file demo or a fresh route is a possible format, not a reason to replace relevant existing logic.

Before implementing, record a short experiment plan in the prototype ticket or evidence document:

- **Question:** the uncertainty to resolve and the actions or observations that will let the user judge it.
- **Real foundations:** existing behavior, modules, interfaces, data characteristics and operating conditions that could affect the answer. Inspect and reuse these where available; extend them narrowly when needed for the experiment.
- **Controlled differences:** the behavior being varied, the purpose-built scenarios, and any fixtures, stubs or shortcuts. Explain material departures from reality and which conclusions they cannot support.

Preserve established behavior outside the experiment's intended changes. Choose the smallest harness that can exercise the relevant real paths: an isolated course, component playground, scratch environment or thin application integration may be more useful than the entire product. Custom scenarios should expose the decision clearly, including difficult cases; using the real logic does not require using the real world, full dataset or live service.

Prefer calling existing code over copying or recreating it. A standalone artifact is appropriate when it preserves the behavior relevant to the question. If no implementation exists yet, build the smallest plausible version using the intended interfaces and constraints. When a real dependency cannot be used, substitute it explicitly and limit the claims accordingly. Do not quietly replace the very behavior the experiment is meant to evaluate.

Keep unrelated work cheap: temporary controls, fixed fixtures, rough presentation, narrow error handling and limited scale are acceptable when they do not distort the result. Production hardening, general-purpose architecture, deployment and broad compatibility can wait unless they are the subject of the experiment. Follow the project's required tests and browser checks, focused on the paths and failure modes needed to trust the evidence. Throwaway code still needs to produce trustworthy observations.

Examples:

- **Movement or controls:** use custom obstacle courses with the game's real simulation, collision dimensions, input mapping and camera. Vary the proposed traversal behavior; retain established controls outside that change.
- **Interface or workflow:** reuse relevant components, interaction rules and surrounding layout. Controlled data is fine, but retain realistic lengths, density and states when they affect usability. A mocked success response can test presentation, not prove a transaction works.
- **State or business rules:** exercise existing domain logic with explicit fixtures and a thin experimental UI. Replace only the rules under investigation; cosmetic buttons around a separately invented state machine do not validate the actual model.
- **Performance or integration:** use representative execution paths, payloads, scale and dependencies. A stub that removes the bottleneck or protocol behavior cannot answer that question; label smaller-scale or simulated results as limited evidence.

Before handoff, check that the intended interaction executes the relevant implementation and that each claimed finding is supported under the recorded conditions. Keep observed results, user preferences and remaining hypotheses distinct.

## Branch and handoff workflow

1. **Before branching:** record the current working branch as the return branch, normally the wayfinder branch. If HEAD is detached, first create a named wayfinder branch there. Commit the pending task changes on that branch before creating the prototype branch. Verify `git status --short` is empty and record the starting commit. Preserve unrelated user changes separately with the user if necessary; never sweep them into a prototype commit or carry uncommitted changes across the branch boundary.
2. **Prototype ticket:** create a clearly named throwaway branch from that committed starting point. Keep experiment source, fixtures and experiment-specific validation on this branch. Record the question, return branch, starting commit and run command in the ticket. Prototype branches are permanent reference archives: never merge them or open a PR to merge them into the wayfinder or production branch.
3. **Archive and return:** keep the prototype branch checked out through human playtesting and requested revisions. A prepared build or passing checks do not finish the prototype. Only after the user explicitly accepts or finishes it, commit all experiment changes and push the prototype branch. Verify the remote contains the final commit and the working tree is clean, then switch back to the recorded return branch. Record the archive branch/commit, observed results and limitations in the ticket. An interrupted experiment may use an explicitly unfinished checkpoint; it must not be reported as validated or resolved. Report any failed push or branch switch instead of claiming the handoff is complete.
4. **Durable knowledge:** update local workflow instructions, accepted decisions and project knowledge on the return branch, after switching back. Commit those changes there. Queue instruction corrections until the accepted return, unless the user explicitly requests an earlier switch; instructions must not exist only on a branch that will never be merged. Link experiment evidence rather than copying prototype source onto the return branch.
5. **Design checkpoint:** carry the accepted behavior, constraints and evidence links into the design and implementation ticket. Resolve a human-in-the-loop prototype only after actual user feedback. Approval chooses behavior; it does not promote the comparison code into production.
6. **Implementation start:** branch from the production baseline and implement the accepted design. Never merge the prototype branch. If the current branch already inherited experiments, preserve their exact snapshot first, then remove experiment entry points, query routing, styles, comparison controls, sample state, render fixtures, tests and task-runner commands before continuing. Remove experiment imports and mode flags from shared production adapters as well. A development-only guard is not separation.
7. **Increment handoff:** inspect the changed-file list and search runtime source, entry HTML, scripts and tests for experiment references. Confirm only production dependencies remain and old experiment URLs open normal play. Run the production checks and focused integrated-browser checks required by docs/testing.md. Keep historical evidence clearly labeled with its archive branch/commit. Report unresolved validation separately.

Production camera, rendering and control code may implement the chosen behavior, with tests of that production code. Reusable test fixtures belong behind test boundaries, not in a public game route. Each implementation increment must meet this separation criterion; cleanup is not deferred to the final polish ticket.
