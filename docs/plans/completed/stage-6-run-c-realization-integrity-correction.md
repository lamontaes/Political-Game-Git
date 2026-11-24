# Stage 6 Run C Realization Integrity Correction

## Status

Completed 2026-08-24 — contained correction of the unaccepted Run C candidate's
policy realization linkage, freshness, uniqueness, and policy due-item
semantics; awaiting external re-audit.

## Scope

Bind every effect-producing realization to the exact canonical Run B cause and
effect records produced by its policy operations. Prevent stale/repeated
implementation and duplicate realization due items while preserving policy math,
the generic Run A scheduler, causal/economy foundations, Stage 4 adapters, and
the current maximum integration scenario. Do not begin Run D.

## Checklist

- [x] Inspect governing authority, Run C implementation/tests, persistence, and
      candidate version policy.
- [x] Enforce canonical actual-cause/effect linkage and one effect-producing
      realization per alternative.
- [x] Enforce estimate-series freshness and policy-realization due-item
      uniqueness/integrity with truthful jurisdiction metadata.
- [x] Add realization, corruption, scheduler, revision, SQLite, and
      maximum-current integration coverage.
- [x] Update D-044, contracts, acceptance, architecture audit, and completed
      Run C evidence.
- [x] Run required validation, preserve all ZIPs, and stop before Run D.
- [x] Create one bounded commit and fresh review ZIP.

## Validation evidence

- Focused implementation/integration/persistence/architecture gate: 5 files /
  41 tests passed.
- Full Vitest suite: 19 files / 205 tests passed.
- Prettier, ESLint, TypeScript, production build, deterministic headless demo,
  and `git diff --check` passed.
- Online audit could not reach `registry.npmjs.org`; cached offline
  `npm audit --offline --audit-level=high` reported 0 vulnerabilities, and
  `npm ls --all` completed.

## Final lifecycle correction

A due item that passed scheduling validation remains legitimate history if later
estimate revision or alternative implementation makes it obsolete. The Run C
handler now terminally cancels it at its due frontier with
`policy:superseded-estimate` or `policy:alternative-already-realized`, without
substituting an estimate or creating a realization, causal process, activation,
or outcome event. Direct stale/double public writers remain strict, and the
generic Run A scheduler remains policy-agnostic.

## Creation-frontier correction

A policy due item must also have been possible at its own append sequence.
Integrity reconstructs its same-series current estimate and, when it would
produce effects, the absence of an earlier full/partial realization for the
alternative. This rejects fabricated generic and corrupted persisted due work
without making later supersession or later alternative implementation corrupt
otherwise-valid historical schedules. The existing typed cancellation handler
continues to resolve those later-obsolete items at the due frontier.
