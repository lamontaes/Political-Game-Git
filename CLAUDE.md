# Our Civic Duty — Claude Code session bridge

@AGENTS.md

This file only routes a session onto the real authority chain. It is not the
project's instruction set — do not grow it into one.

## Authority

1. Repository `AGENTS.md` (imported above) and the repo documents it ranks:
   `docs/GAME-CONSTITUTION.md`, `docs/decisions/DECISION-LOG.md`,
   `ARCHITECTURE.md`, `docs/systems/`.
2. For current product/ownership/task truth, read the project's canonical
   Google Drive chain in this order:
   - `00_READ_FIRST — CANONICAL READ-WRITE PROTOCOL`
   - `01_CURRENT_CANONICAL_INDEX — PROJECT STATE AND SOURCE PRIORITY`
   - `04_CURRENT_DECISION_CHANGE_AND_TRACEABILITY_REGISTER`
   - `00_CURRENT_ASSIGNMENT_BOARD`
   - `00_STAGING_INDEX`
   - the current handoff named by the canonical index, only when a
     continuation-level read is necessary.
3. **Live GitHub and the live repository outrank remembered or local state.**
   `git fetch` and read `origin/main`, open PR heads, and actual CI before
   acting. Never trust a SHA, PR number, or status you merely remember, and
   never treat a stale local branch as current. When canonical Drive controls
   and an old repository document disagree, current Drive plus live GitHub win.

The repository keeps no "current handoff" file. Continuation state lives in the
Drive chain and in the owning plan under `docs/plans/`. Files under
`docs/agent/evidence/`, `docs/agent/history/`, `docs/plans/completed/`, and
dated audits are historical provenance — read them as history, never as the
current instruction.

## Before substantial work

- `npm run agent:preflight`, then `git fetch`, then verify absolute workspace,
  branch, local SHA, and upstream SHA.
- One writer per overlapping branch, PR, or surface. Use an isolated worktree
  for concurrent work or a takeover; never stash, reset, clean, or force-push
  another agent's workspace.
- Consume the owning packet or domain authority instead of rediscovering the
  project. Do not merge your own consequential PR.
- Never duplicate the World, simulation, source, or art systems to make a task
  easier. Reuse the accepted seams; fail closed when required truth, art, or
  source is missing.

## Validation

- `npm run validate` is the full gate (format, lint, typecheck, test,
  `source:validate`, `source:replay`, build, demo, `validate:art`).
- Focused checks: `npm run format`, `npm run lint`, `npm run typecheck`,
  `npm run test`, `npm run test:e2e`, plus the `test:run-*` suites.
- Green tests and green CI are never human visual or play acceptance. Visual and
  interaction work needs a real pointer/keyboard review at representative
  viewports (`.agents/workflows/pg-visual-review.md`); a human-visible failure
  is not overridden by a passing suite.
- Completion reports carry exact SHA, git state, tests actually run, remaining
  defects, and acceptance state.

When an overnight-audit or narrative-corpus lane lands `docs/overnight-audit/`
and its corpus tooling on `main`, use those outputs and commands as they are
defined there; do not assume them from this file.

## Recurring problems

Encode a recurring process failure in the smallest durable mechanism — a hook
for a must-happen-every-time step, a skill for sometimes-relevant knowledge, or
a config/test change. Do not solve it by making prompts or this file larger.
Domain detail belongs in packets, `docs/`, `.agents/`, and skills.
