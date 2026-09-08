# 92I municipal-governance source implementation

## Objective

Compile the largest truthful, headless municipal-governance source substrate
that the verified 92I Kentucky cargo supports for Lexington-Fayette,
Louisville-Jefferson Metro, and Bowling Green. Preserve uncertainty, effective
dates, actor separation, and institutional asymmetry without creating gameplay
or a universal mayor-strength score.

## Grounding and branch state

- Started from freshly fetched accepted `origin/main` at `48e217c` in the
  isolated `codex/92i-municipal-governance-implementation` worktree.
- Reconciled twice during the run and finally against accepted `origin/main` at
  `850048d` before the draft pull request was opened.
- PR #98 was inspected only as salvage/history. Its source-domain shape was
  rebuilt against D-074/D-077, current source routing, current first-party
  checks, and the verified 92I cargo; its stale generated manifest was not
  adopted.
- PR #85 and #79 paths remained out of bounds. The final branch diff owns only
  `src/source/domains/municipal-governance/**`, its fixture/tests, its source
  manifest entry, and municipal-specific documentation.

## Completed work

- [x] Replaced the narrow PR #98 record with a dated,
      source-state-preserving municipal institution schema covering identity,
      body/elections, administration, enumerated powers and conditions,
      procedure, budget, consolidation/overlap, and meeting places.
- [x] Compiled all three 92I jurisdictions through the source capability
      boundary and kept the corpus non-production while the secondary cargo and
      cited first-party instruments await independent artifact
      acquisition/audit.
- [x] Corrected cargo conflicts found against current first-party material and
      kept unresolved or only generically supported fields `UNKNOWN`.
- [x] Added adversarial tests for forbidden strength scalars, actor conflation,
      impossible thresholds, missing evidence, time-varying rules,
      deterministic replay, and cross-jurisdiction asymmetry.
- [x] Updated the source-system contract, acceptance tests, architecture audit,
      and generated source manifest without changing simulation or player code.
- [x] Ran focused tests, full source verification/compile/validation/replay,
      full semantic/browser validation, all required art gates, asset-readiness,
      and a LEARN pass recorded in the source-system contract.
- [x] Re-fetched and reconciled `main`, pushed the branch, and opened draft PR
      #120 without merging it.

## Validation outcome

- Municipal suite: 33/33.
- Full semantic suite before final reconciliation: 2,328/2,328 with contention-
  controlled worker/time limits.
- Post-reconciliation suite: 2,382/2,383. The sole failure is an accepted-main
  92H ownership-boundary test whose frozen base counts an accepted-main
  `package.json` change; this branch has no `package.json` delta and leaves that
  out-of-scope test untouched.
- Browser proof: 248/249 in one controlled full run; the remaining multi-DPR
  case was interrupted by filesystem exhaustion while Playwright wrote a trace
  and passed 1/1 after disposable reports were removed.
- Source verification: 51 verified, one intentionally cache-only absent, zero
  mismatches. Compile, manifest, validation, and replay pass byte-identically.
- Format, lint, typecheck, build, deterministic demo, art validation, 322-item
  art inventory, art QA, and asset-readiness reconciliation pass.

## Explicit exclusions preserved

- No `src/simulation/**`, player, presentation, environment, or persistence
  changes.
- No municipal law, governing, election, budget, or administration gameplay
  engine.
- No cross-domain import from government-units; Census identifiers remain an
  unresolved adapter/crosswalk concern.
- No source claim was promoted because it was plausible or appeared in
  candidate JSON. The research cargo remains secondary evidence until an
  independent audit acquires and locks the cited first-party bytes.

Draft PR: https://github.com/lamontaes/Political-Game-Git/pull/120

READY FOR INDEPENDENT MUNICIPAL SOURCE/ARCHITECTURE AUDIT
