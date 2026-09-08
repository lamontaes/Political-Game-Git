# SRC-CAP2 — official finance and employment production entrypoints

Started from live main `25b7e7a291e22374566c30d31552dcc4d8314d51` in isolated
`codex/src-cap2`; agent preflight passed. Shared source workspace remains untouched.

Implement each domain independently using the existing acquisition, lock and
capability boundary. Inspect official 2024 finance and 2025 ASPEP archives and
codebooks; preserve publisher shapes, identifiers, flags and reference periods.
Coordinate finance identity with SRC-GOV2, without changing government-unit
semantics. Never promote fixture matrices or infer identifiers from names.

Verification: adversarial publisher parsing tests, locked acquisition and direct
production compile, manifest/validate/replay, full repository validation, required
art commands, exact-head CI. One draft PR, unmerged, with independent domain gates.

Initial evidence: ASPEP retains both legacy 14-digit and new six-digit identifiers;
finance carries a 12-character FIPS/type/county/unit identifier. Finance technical
layout says 33 characters while downloaded rows are 32 (one-character flags).
Finance fiscal ending is MMDD plus a separately documented survey year; actual
Alabama row says 093024. Resolve this against the existing July-to-June contract
before emitting a canonical fiscal ending. ASPEP omits FTE in its individual-unit
text product; retain UNKNOWN, never derive it from headcount.

## Completion evidence

Both independent production paths compile from locked official bytes: finance
886 records, employment 298 records, each a declared 25-government QA scope from
a fully acquired annual-sample archive. Finance maps through the official
historical PID/GID crosswalk; unmatched IDs remain a SRC-GOV2 dependency outside
this bounded scope. Employment validates both publisher identifiers directly.
State fiscal periods and effective-2022 state capital-expenditure labels follow
the locked state technical document. Payroll is dated March 31; headcounts retain
March 12. Fiscal labels and unpublished FTE remain UNKNOWN.

Local verification completed: 184 focused tests; full `npm run validate` with
144 files / 2,525 tests; both source acquisitions and compiles; manifest;
source validation (zero domain errors); byte-identical source replay;
artifact verification (78 verified, 3 pre-existing/cache-only absences, zero
mismatches); art validation, inventory and QA; diff whitespace check.
One repeat validation attempt hit ENOSPC. Only this task's disposable dependencies,
research duplicates and build output were removed; the successful repeat used
existing installed repository dependencies. No other workspace was changed.

Architecture and LEARN findings are recorded in
`docs/systems/census-capacity-production.md`. The plan is complete for bounded
source production. One draft PR remains unmerged for independent source and
architecture review; exact-head CI is checked after publication.

Final acquisition review corrected ASCII conversion to byte-preserving Latin-1
selection. Non-ASCII publisher drift now survives extraction and is rejected by
the parser; two adversarial ZIP tests protect this boundary. Existing locked
QA bytes and corpus digests are unchanged.

## LANDING-Q2 — current-main reconciliation

Authority: LANDING-Q2, Google Doc `1TKe-QXBThprCTHwbGoaLTXjrnocjHlK4jAM30GmZ4dc`.
Start: `bdb55738f8dd1e9246e0592e2b3fa55edcc41c7e`.
Main: `b61abf26118e50be351c09db5b3d0823333fc9ec`.
Worktree: `/private/tmp/pg-landing-q2-124`, existing branch `codex/src-cap2`.
Preflight passed with duplicate-branch warning; the previous worktree is read-only.

1. Merge current main normally; preserve all accepted source and identity semantics.
2. Run focused source tests and source validation/replay. Regenerate only artifacts
   that the combined tree requires, from locked real inputs. Reuse available archive
   caches read-only; report absent cache-dependent recut tests separately.
3. Run full validation and all art commands, commit, re-fetch, verify, push the
   existing branch, inspect exact-head CI, and leave the PR unmerged.

The merge is conflict-free. No Census interpretation or identity migration is reopened.

The merge preserves all accepted finance/employment implementation, tests,
artifact locks, raw files, corpora, and manifest blobs. All 188 changed paths
versus the accepted head before this completion update come from current main.
No domain or shared manifest regeneration is required: source replay is clean.

The 204 focused tests pass across census-cap2-production, government-finances,
public-employment, and capability-boundary. Both full archive caches were
available in the previous workspace and copied into this worktree's ignored
cache; no downloads or original-cache writes occurred. Both archive hashes,
member hashes, and byte-identical QA recuts pass with no cache-dependent skips.
The bounded compilations still produce 886 finance and 298 employment records;
25-government scope and incomplete-universe declarations remain unchanged.

Source validation passes for 15 domains with zero errors. Existing warnings for
LAUS incomplete components, FEC linkage coverage, and finance no-missingness
remain visible; no source value, flag, identity, date, or completeness claim was
changed to silence a warning. Art validation, 322-item inventory, and QA pass
without tracked changes. Logs: `/private/tmp/landing124-focused.log`,
`/private/tmp/landing124-source.log`, `/private/tmp/landing124-replay.log`,
`/private/tmp/landing124-art.log`, `/private/tmp/landing124-validate.log`.

Architecture compatibility: this is a normal merge, with no source contract,
simulation, identity migration, or new behavior. Accepted fiscal dates, payroll
and headcount dates, UNKNOWN FTE, fail-closed identifiers, rights, and publisher
byte preservation remain under the existing regression tests.
LEARN: use clean source replay to establish whether regeneration is necessary;
reuse hash-checked cached archives for bounded recut evidence rather than
reacquiring accepted inputs or estimating generated counts.

Full `npm run validate` passes with localhost access: formatting, lint, TypeScript,
all repository tests, source validation/replay, production build, deterministic
demo, and art validation. `git diff --check origin/main` passes. The merge-parent
diff includes main's existing trailing blank line in the prose transcript;
this landing does not edit it. No known local landing defect remains. Exact-head
CI and narrow landing acceptance remain separate gates.
