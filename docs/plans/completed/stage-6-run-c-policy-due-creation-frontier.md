# Stage 6 Run C Policy Due Creation-Frontier Correction

## Status

Completed 2026-08-24 — contained final integrity correction for policy
realization due items that were impossible at their own historical creation
frontier; awaiting external re-audit.

## Scope

Reconstruct same-series estimate freshness and alternative effect-producing
realization state at each policy due item's sequence. Preserve execution-time
obsolete cancellation, strict domain writers, and the generic Run A scheduler.
Do not start Run D.

## Checklist

- [x] Inspect the final lifecycle candidate and policy due integrity seam.
- [x] Add sequence-aware historical creation-frontier validation.
- [x] Add generic-writer, corrupted JSON, valid-later-obsolete, and persistence
      regression coverage.
- [x] Update D-044/contracts/audit evidence and completed correction plan.
- [x] Validate, commit, archive, and stop before Run D.

## Completion evidence

- Integrity reconstructs current-estimate and prior effect-producing
  realization state at the policy due record's own append sequence. It rejects
  impossible generic and corrupted persisted records, but preserves later
  supersession/implementation as execution-time cancellation only.
- Focused lifecycle, Stage 5 maximum-current integration, architecture,
  boundary, and SQLite tests: 5 files / 46 tests passed.
- Full Vitest suite: 19 files / 210 tests passed. Prettier, ESLint,
  TypeScript, production build, deterministic `validation-seed` replay,
  `git diff --check`, and the online high-severity npm audit passed.
- No serialized shape/version changed: schema 12, `demo-world-v12`, snapshot
  11, metric catalog v2, causal catalog v1, and materializer v4 remain.
