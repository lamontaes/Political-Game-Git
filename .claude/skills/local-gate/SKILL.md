---
name: local-gate
description: >
  Use before every merge. Validation is typecheck/eslint/prettier on changed
  files, release:check --mode pr, and the tests for changed files (plus
  browser specs only if screens changed); never the full suite, never
  force-push, never a permanent delete.
---

# Local gate, not the full suite

Validation scope is bounded on purpose: typecheck, eslint and prettier on the
files you changed, `npm run release:check -- --mode pr`, and the unit tests
for the files you touched — add browser/E2E specs only when you changed a
screen. A failure that also fails on a clean `main` doesn't block your merge;
note it, don't chase it. Never run the full suite as a gate — it's slow
enough that people route around it, and merging keeps priority over
completeness. Never force-push, and never permanently delete: Trash (or the
repo's own reversible removal), never a delete that can't be undone, never
`git push --force` on a shared branch.

## Check your own work

Before saying a change is validated, list the exact commands you ran and
confirm each covered only the changed files — not bare `npm run test`, not
`npm run validate`, unless the task specifically requires the full gate. If a
check fails, reproduce it against a clean `main` checkout; if it's already red
there, say so and proceed instead of chasing an unrelated failure.
