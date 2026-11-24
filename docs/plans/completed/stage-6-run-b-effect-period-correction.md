# Stage 6 Run B Effect Period Correction

## Status

Completed 2026-08-24 — narrow correction of the rejected Run B candidate's
generic effect magnitude and target-period timing semantics.

## Scope

Give interval-target effect magnitudes a durable, typed period basis and evaluate
all causal phase against the historical point or interval being changed rather
than a later calculation frontier. Preserve the accepted causal, economy, fiscal,
Run A, and Stage 5 foundations; do not begin Run C.

## Checklist

- [x] Inspect the governing contracts, Run B implementation, integration tests,
      JSON/SQLite persistence, and candidate schema policy.
- [x] Define the smallest exact JSON-safe magnitude basis and deterministic
      point/interval target-period timing rule.
- [x] Enforce compatible magnitude/target periods at writer and integrity/load
      boundaries without hidden cadence conversion.
- [x] Add retroactivity, ramp/expiry, overlap, cross-duration, aggregate,
      cutoff, persistence, SQLite, and maximum-current integration coverage.
- [x] Update D-043, architecture/contracts, acceptance, audit, and completed
      Run B evidence.
- [x] Create one bounded commit, preserve existing ZIPs,
      create a fresh review ZIP, and stop before Run C.

## Completion evidence

- `magnitudeBasis` is `point-at-target` for point metrics or `interval-total`
  with one exact persisted interval for interval metrics. No cadence conversion
  or implicit rate exists.
- Point phase uses the target point; interval phase uses the earlier inclusive
  midpoint. `evaluatedAt` is a cutoff/recording frontier and must not precede
  the target period end.
- Focused corrective/integration/persistence/boundary gate: 5 files / 40 tests.
  Full suite: 18 files / 189 tests. Format, lint, typecheck, build, deterministic
  demo, high-severity audit, and diff check passed.
- World schema 11, generator `demo-world-v11`, snapshot format 10, metric catalog
  v2, causal catalog v1, and materializer v4 remain unchanged because the prior
  candidate was not accepted and no migration contract is introduced.
