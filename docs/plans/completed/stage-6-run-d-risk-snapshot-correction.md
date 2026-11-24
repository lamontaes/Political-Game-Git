# Stage 6 Run D Risk-Snapshot Integrity Correction

## Status

Completed — contained integrity correction to the completed Run D incident
boundary. Persisted occurrence snapshots are reconstructed from one canonical
evaluator and incident follow-on due work is valid only at its own creation
frontier. Run E was not begun.

## Checklist

- [x] Extract one non-recursive canonical incident evaluator for writers and integrity.
- [x] Reconstruct every persisted occurrence snapshot at its stored cutoff.
- [x] Enforce plan-source-state equality at incident due-item creation.
- [x] Add corruption, JSON/SQLite, due-lifecycle, and integration regression coverage.
- [x] Update D-045 and affected architecture/contracts/audit evidence.
- [x] Validate, commit, archive, and stop before Run E.

## Completion evidence

- The public evaluator retains world integrity validation; the core evaluator is
  reused by the occurrence writer and persisted snapshot integrity without a
  recursive integrity call.
- Focused Run D tests prove JSON rejection for altered likelihood, rule,
  modifier, RNG, outcome, and cutoff evidence, plus stale-plan writer, generic
  writer, and persisted due-item rejection. Existing actor JSON/SQLite and the
  permanent maximum-current integration remain in the focused gate.
- The focused boundary gate passed 5 files / 45 tests. The full suite passed 20
  files / 222 tests; format, lint, typecheck, production build, deterministic
  `validation-seed` replay, `npm audit --audit-level=high`, and `git diff --check`
  passed. The corrective source archive accompanies the single bounded commit.
