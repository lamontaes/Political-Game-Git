# PR114 fiscal compiler fail-closed repair

Status: completed

Scope is limited to the four independently audited compiler blockers on PR #114.
The production gate remains closed; this repair adds no production records,
legal-source acquisition, gameplay, UI, or fiscal scoring.

## Work

- Reconcile current `main` into the existing PR branch without rebase.
- Make matrix control vocabularies exact and closed.
- Require positive legal-artifact identity and structured searched scope.
- Require explicit row value kinds, enforce all field level scopes, and validate
  dependent rules against their underlying tax authority.
- Preserve local-government level in the anti-universal sales-tax check.
- Add adversarial regressions and retain positive controls.
- Run focused fiscal tests, source substrate/oracle tests, full validation,
  source validation/replay, diff check, and exact-head CI.

## Stop conditions

- Do not open or weaken `FISCAL_AUTHORITY_PRODUCTION_GATE`.
- Do not add fiscal facts or acquire primary legal sources.
- Do not add simulation, scoring, or presentation behavior.
- Leave PR #114 draft and unmerged.

## Verification

- The focused fiscal suite passes all 68 cases; the 12 initial audit probes
  failed against the pre-repair compiler.
- Source substrate/oracle selection passes all 177 cases.
- The full 2,356-test suite passes with serialized workers and a diagnostic
  timeout. Two exact `npm run validate` attempts reached the same suite but the
  host exhausted its 5-second test budget under parallel load; the second also
  exhausted host disk in temporary Vitest output. No unrelated test or timeout
  was changed.
- `source:validate` and `source:replay` pass; replay is byte-identical and the
  production gate remains present and unchanged.
- Type checking, lint, production build, deterministic demo, art validation,
  art inventory, art QA, and `git diff --check` pass.

## Architecture integrity audit

- Source evidence remains outside simulation and presentation code.
- The matrix schema now refuses unsupported controls, units, levels, evidence
  identities, searched scopes, and dependency states before they can become
  plausible records.
- The production compiler still throws, the acquisition plan is still empty,
  and no production corpus, source bytes, gameplay, UI, or score field was
  added.
- Existing balanced-budget derivation and unresolved-value behavior are
  unchanged.

## LEARN

Closed control vocabularies must be validated before trimming or defaulting.
Evidence admission should use positive typed identity and lineage, not mutable
publisher-name blocklists. Cross-record validation must retain every identity
dimension that changes the meaning of a fact; state alone was insufficient for
local-level comparison.
