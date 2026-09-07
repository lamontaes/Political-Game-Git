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
- PR #98 was inspected only as salvage/history. Its single source-domain commit
  was applied without its stale generated manifest, then is being reconciled
  against D-074/D-077, current source routing, the 2026 statute text, and the
  verified 92I cargo.
- Active PR #85 and #79 paths are out of bounds. This run owns only
  `src/source/domains/municipal-governance/**`, its fixture/tests, its own source
  manifest entry, and municipal-specific documentation.

## Plan

- [ ] Replace the narrow PR #98 record with a dated, source-state-preserving
      municipal institution schema covering identity, body/elections,
      administration, enumerated powers and conditions, procedure, budget,
      consolidation/overlap, and meeting places.
- [ ] Compile all three 92I jurisdictions through the source capability boundary;
      keep the corpus non-production while the secondary cargo and cited
      first-party instruments await independent artifact acquisition/audit.
- [ ] Correct cargo conflicts found against current first-party material and
      keep any unresolved or only generically supported field `UNKNOWN`.
- [ ] Add adversarial tests for forbidden strength scalars, actor conflation,
      invented thresholds, missing source/effective dates, time-varying rules,
      deterministic replay, and cross-jurisdiction asymmetry.
- [ ] Update the source-system contract, acceptance tests, architecture audit,
      and generated source manifest without changing simulation or player code.
- [ ] Run focused tests, full source verification/compile/validation/replay,
      full CI validation, art gates required by repository policy, and a small
      LEARN pass.
- [ ] Re-fetch `main`, reconcile if needed, commit, push, and leave one draft PR
      unmerged with the audit state `READY FOR INDEPENDENT MUNICIPAL
SOURCE/ARCHITECTURE AUDIT`.

## Explicit exclusions

- No `src/simulation/**`, player, presentation, environment, or persistence
  changes.
- No municipal law, governing, election, budget, or administration gameplay
  engine.
- No cross-domain import from government-units; Census identifiers remain an
  unresolved adapter/crosswalk concern.
- No source claim is promoted because it is plausible or appears in the
  candidate JSON. The research cargo is secondary evidence until an independent
  audit acquires and locks the cited first-party bytes.
