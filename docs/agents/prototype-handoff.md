# Wayfinder prototype handoff

Apply this workflow when a wayfinder map uses prototypes, including maps whose Notes authorize later implementation.

1. **Prototype ticket:** work on a clearly named throwaway branch. Record the design question, branch and commit, run command, observed results and limitations in the ticket. Preserve the source on that branch before closing the ticket; publish the archive when the effort already authorizes publishing branches.
2. **Design checkpoint:** carry the accepted behavior, constraints and evidence links into the design and implementation ticket. Approval chooses behavior; it does not promote the comparison code into production.
3. **Implementation start:** branch from the production baseline and implement the accepted design. If the current branch inherited experiments, preserve their exact snapshot first, then remove experiment entry points, query routing, styles, comparison controls, sample state, render fixtures, tests and task-runner commands before continuing. Remove experiment imports and mode flags from shared production adapters as well. A development-only guard is not separation.
4. **Increment handoff:** inspect the changed-file list and search runtime source, entry HTML, scripts and tests for experiment references. Confirm only production dependencies remain and old experiment URLs open normal play. Run the production checks and focused integrated-browser checks required by docs/testing.md. Keep historical evidence clearly labeled with its archive branch/commit. Report unresolved validation separately.

Production camera, rendering and control code may implement the chosen behavior, with tests of that production code. Reusable test fixtures belong behind test boundaries, not in a public game route. Each implementation increment must meet this separation criterion; cleanup is not deferred to the final polish ticket.
