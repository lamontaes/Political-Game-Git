# PR #102 Origination Replay Integrity Repair

Status: Completed

## Scope

- Re-enforce stored-origin agreement and sourced subject-specific origination
  rules while replaying an `introduced` legislative action.
- Add persisted-world adversarial regressions for Minnesota, Kentucky, and
  Illinois without changing rule-pack data or adjacent legislative semantics.
- Merge accepted `origin/main` into the same PR branch, validate, and publish
  without rebasing, force-pushing, opening a new PR, or merging PR #102.

## Verified starting state

- PR #102 remote head: `b255022e2236ef2abc6c2e683cabc8d174ae2f31`
- Live `origin/main`: `01089d34dcaf18623f7ccd3be0e02be25eac5fe1`
- PR #95 merge `1159da749682cf5eb1dd7ac929fddea58f79485f`
  is an ancestor of live main.
- PR #97 merge `01089d34dcaf18623f7ccd3be0e02be25eac5fe1`
  is live main.

## Repair

Replay now requires an introduction action's chamber to exactly match the
measure's stored origin, then applies the same subject-specific origination
rule as the writer. Persisted-world tests cover Minnesota and Kentucky revenue
tampering, stored/action origin disagreement, legal Minnesota House revenue,
ordinary Minnesota Senate introduction under an unknown general rule, and
Illinois either-house ordinary introduction.

## Reconciliation

Accepted `origin/main` at `01089d34dcaf18623f7ccd3be0e02be25eac5fe1`
was integrated by ordinary merge. There were no conflicts and no player/browser
source files changed by the reconciliation.

## Validation

- Focused legislative rule-pack, legislation, presentation-integrity, route,
  projection, world-bridge, and architecture-integrity tests: 7 files, 98 tests
  passed.
- `npm run validate`: passed, including 125 test files and 2,137 tests.
- Standalone `npm run source:replay`: passed byte-identically.
- `npm run inventory:art`: 322 items up to date.
- `npm run qa:art`: contact sheet and QA report regenerated with no diff.
- `git diff --check`: passed.
