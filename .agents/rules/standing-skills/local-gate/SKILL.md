---
name: local-gate
description: >
  Lists the bounded checks an Our Civic Duty PR runs on its changed files:
  typecheck, eslint and prettier, release:check --mode pr, zero-dice, the
  pool check and the changed tests, plus browser checks only for screens and
  test:skill-ops for instruction files. Use before marking a PR ready and
  when merging; never the full suite.
---

# Local gate, not the full suite

Validation is bounded on purpose, and the full suite is never the gate.

## What to run

Run typecheck, eslint and prettier on the files you changed. Then run `npm run release:check -- --mode pr`, `npm run zero-dice`, `npm run pool -- --check` and the unit tests for the files you touched (`npm run agent:test-cadence` lists them). Add the screen's `src/bench/*.browser.mjs` check only when you changed a screen, and `npm run test:skill-ops` when you changed `AGENTS.md`, `CLAUDE.md`, `.agents/`, `.claude/`, `.codex/` or `.cursor/`.

A failure that also fails on a clean `main` doesn't block; note it, don't
chase it. Never run the full suite as a gate: it's slow enough that people
route around it, and merging keeps priority over completeness. Never
force-push, and never permanently delete anything outside your own branch's
changes.

## Release and push rules

- Add a release declaration in `docs/release/changes/`. Its `id` must equal
  the filename stem, and the file must change within the PR's range.
- `npm run report:check` limits sentences in docs; run it on docs you change.
- Push with plain `git push` from a shell. Pushes made through the API start
  no CI.
- A merged PR cannot carry new work. Open a new branch and PR.

## Check your own work

Before saying a change is validated, list the exact commands you ran and
confirm each covered only the changed files — not bare `npm run test`, not
`npm run validate`, unless the task specifically requires the full gate. If a
check fails, reproduce it against a clean `main` checkout; if it's already red
there, say so and proceed instead of chasing an unrelated failure.
