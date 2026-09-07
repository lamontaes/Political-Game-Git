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
