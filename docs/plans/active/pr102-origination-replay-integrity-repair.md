# PR #102 Origination Replay Integrity Repair

Status: Active

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

## Validation

- Focused legislative rule-pack, legislation, and integrity tests.
- `npm run validate`
- `npm run source:replay`
- `git diff --check`
- Relevant browser suites only if reconciliation changes player/browser files.
