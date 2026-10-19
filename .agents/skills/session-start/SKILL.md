---
name: session-start
description: >
  Use first in every cloud session, before changing anything: the opening
  order, push rules and limits that every session follows.
---

# Session start

Every cloud session opens the same way, so no one builds on a broken game or a wrong guess. Do these in order.

## Opening order

1. Read `AGENTS.md`, `CLAUDE.md`, `docs/coordination/OWNER-DECISIONS.md` and `docs/coordination/DECISION-REGISTER.md`. Read your package or `docs/coordination/<session>.md`.
2. Set `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"` in every shell.
3. Install with `npm install`. Never `npm ci`. Never clone the repository or add a worktree.
4. Run `node --import tsx tests/golden-path/runner.mjs` before changing anything.
5. Branch from `origin/main`, then open a draft PR at once with the contract: what you will build and how it will be checked (a test in a random place). Start building right away.
6. The top of the PR body is the status, newest first. Add one line per event at the top. If you cannot write the Drive log, this is the log.

Every cloud session opens the same way, so no one builds on a broken game or a wrong guess. This skill is the order, the push rules and the limits.

Do these in order.

## Rules

- One writer per area. Write only in your own area, on your own branch. Never push to another session's branch.
- Never call `send_message`, `send_later` or any trigger. The PR body is your only channel.
- Treat every permission prompt as denied. Do not retry it. Work around it or note it in the PR body and continue.
- Push with plain `git push -u origin <branch>` from a shell. API pushes start no CI.
- Never force-push.
- A merged PR cannot carry new work. Open a new branch and a new PR.
- Sub-agents: at most three Haiku, or two Sonnet, or one Opus. Use them for parallel work or reading, never to hand off your own job. Give each an objective, an output format, allowed paths and tools; read-only unless the package says otherwise. Audits are the exception (see `trace-audit`).
- Owner decisions are flagged, never waited on: build the simplest version, register a stopgap of kind `owner-decision`, and write the question under **OWNER DECISIONS NEEDED** at the top of the PR body.
- Before asking any question, search `docs/` and quote the register.

## Finish

Run the local gate (typecheck, eslint and prettier on changed files, `npm run release:check -- --mode pr`, `npm run zero-dice`, tests for changed files). Update your progress file.
