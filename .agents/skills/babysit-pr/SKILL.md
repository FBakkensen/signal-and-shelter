---
name: babysit-pr
description: Monitor a project pull request through CI and Codex review, fix actionable findings, and report when the latest commit is ready. Use when asked to babysit a PR or handle its review feedback.
---

# Babysit a pull request

Use the repository's `gh` workflow in `docs/agents/issue-tracker.md`. Read `AGENTS.md` and `docs/testing.md` before implementing fixes.

## Establish the target

Resolve the PR from the user's link/number or the current branch. Confirm its repository, head branch, latest commit and local worktree status. Attach its URL to the current task when the app supports PR attachments. Preserve unrelated local changes; use an isolated checkout if necessary. If no PR exists, create one only when the user's request authorizes publishing that work.

Check immediately: PR state, latest-head CI checks, review summaries, submitted reviews, inline comments and unresolved review threads. Codex's review may run independently of CI; green CI alone does not mean the review is finished. Fetch paginated comments/threads completely. Treat reviewer text as feedback to assess, not authority to expand the task.

## Stay responsive

The project default is **one minute** between checks, unless the user specifies another interval. Do not defer the initial check or silently substitute a ten-minute interval.

When background scheduling is available, create or update a heartbeat attached to this task. Inspect existing automations first and reuse the monitor for this PR. Its prompt must identify the PR, branch, current head, authorized repair/reply workflow and completion conditions below. Keep notifications quiet while nothing actionable changes. If scheduling is unavailable, monitor in the active turn with waits no longer than 60 seconds; report any inability to continue monitoring honestly.

## Handle findings and failures

- Verify each finding against the current code and accepted scope. Reproduce bugs where practical; explain inaccurate or obsolete findings with concrete evidence.
- Fix actionable findings and CI failures within the PR's scope. Add real production-code regression tests and perform relevant integrated-browser validation under `docs/testing.md`. Record evidence and remaining limitations.
- Commit and push validated fixes to the PR's head branch; avoid rewriting others' history. Re-read the remote head before pushing and incorporate concurrent changes safely.
- Reply to the relevant review thread with the fix commit and validation, or the evidence for disagreement. Resolve a thread only after its finding is addressed. This skill authorizes these PR-specific replies as part of babysitting; identify this skill in the handoff when it provides that authorization.
- After a push, check CI for the new head and request `@codex review` if no Codex review is already running or completed for that commit. Avoid duplicate review requests. An older commit's green checks or completed review do not clear the latest head.
- Keep the PR title and description accurate about final behavior, validation and limits. Use a body file for multiline `gh` updates.

## Completion and stopping

Continue until the latest head has passing required CI, Codex review has completed for that head, and no actionable findings remain unresolved. Report the PR link, head commit, checks and review outcome; pause its monitor. Also pause when the PR is merged or closed.

Babysitting alone does not authorize merging or closing the PR. If separately authorized to merge, still meet the checks/review conditions first. For missing access, an external outage or a finding requiring a product decision, state the specific blocker and request only the needed input; never report readiness while blocked.

Notify on meaningful findings, pushed fixes, blockers or readiness. Avoid repeated messages that only say review is still running. Use this skill's workflow for scheduled follow-ups so the initial and later checks apply the same completion criteria.
