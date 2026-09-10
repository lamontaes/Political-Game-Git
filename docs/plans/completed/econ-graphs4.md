# ECON-GRAPHS4 delivery plan

Date: 2026-09-09  
Owner: existing ECON-CONTEXT2 owner  
Carrier: PR #148, branch `codex/econ-context2`

## Authority and boundaries

- Execute section J of FINISH-WAVE4 while preserving the complete ECON-CONTEXT2 contract.
- Recover the exact ACCEPT-WAVE3 E-1 text and reproducer before claiming its repair.
- Keep observation period, observation vintage, source release date, validity and simulation date distinct.
- Never infer geography by name, manufacture missing values, policy effects, forecasts, personal finances or a second economy.
- This branch owns source/read-model and feature-local presentation code. UI-core alone edits `PlayerGame.tsx` and navigation. LEG and FISCAL retain their rule and estimate writers.

## Work

1. Add a failing date-cutoff control reproducing future-observation leakage, then make source and browser projections require an explicit simulation/as-of date.
2. Replace the Lexington-only generated projection with a browser-safe provider covering every exact geography actually represented by the declared BEA, LAUS and HUD corpora, including explicit unavailable results and source disclosure.
3. Add typed graph read models and native accessible chart components for supported observed history. Preserve sparse/missing breaks and explicit record classes.
4. Consume frozen LEG/FISCAL inputs only through typed adapters. A missing producer remains unavailable; proposals, drafts, forecasts, simulated history and outturn must remain visibly different.
5. Supply UI-core an exact normal-player registration patch and browser checks; do not edit the shared root here.
6. Validate changed seams, source replay, full repository gates and required art commands. Regenerate prose artifacts if player-facing strings change.
7. Publish a narrow repaired-source checkpoint before optional presentation extension when the source repair is independently useful.

## Completion evidence

- Exact E-1 text/reproducer and passing regression.
- Browser-safe all-corpus provider coverage with exact identifiers, units, periods and missingness.
- Accessible chart proof with gaps and record-class labels.
- LEG/FISCAL interface evidence and explicit unavailable behavior.
- UI-core handoff and frozen checkpoint.
- Exact SHA, clean state, tests, CI, remaining defects and acceptance state.

## Current status

- The authoritative full ledger was recovered at Drive document
  `1GTRZOYjt9W8s7AdsxI0pRqiZ8w1fLz9TVlJjOxgsxWc`. E-1 is only the unmarked
  mixed-vintage comparison endpoint defect. The source comparison now carries
  nullable `earlierRelease` and `laterRelease` from the two observation
  vintages; the generated Lexington comparison proves the LAUS endpoints are
  `FINAL` and `PRELIMINARY`.
- The dated source repair was published separately at `c2eda37`.
- The all-corpus browser provider, typed graphs, LEG adapter, explicit FISCAL/GDP
  unavailability, accessible feature-local panel, and deterministic replay proof
  are published on the draft carrier PR with the exact E-1 repair.
- UI-core published the normal-player mount and combined prose regeneration at
  `b4910c09ff33f9098592df0f44e0a375cd98e973` on PR #144, then consumed the final
  HUD date-field separation at `2fe0b0908085f87dddef3cbcf7352e3c06e31d87`.
  Its reported ECON proof is 11 focused checks, typecheck, and 2/2 normal-browser
  tests covering Begin → Personal, exact saved home-place/date binding,
  pointer/keyboard disclosures, non-Lexington absence, and save/reload read
  purity.
- The original committed-artifact control is retained: before repair, none of
  the three generated comparisons had endpoint release fields. After repair,
  both BEA comparisons are `FINAL` → `FINAL`, and the LAUS comparison is
  `FINAL` → `PRELIMINARY`. A synthetic two-vintage HUD control proves null
  remains null on both endpoints.
- The coordinated serial suite passed 182 files / 3,233 tests with 2 skipped.
  Five localhost dev-wrapper timeouts from the original sandbox run passed 5/5
  unchanged with port permission. UI-core explicitly authorized isolated
  feature-branch prose regeneration; the four stale corpus/anchor results then
  passed, and corpus check reports byte-identical generated artifacts.
- The exact E-1 change additionally passed 57 focused tests, typecheck, lint,
  deterministic source replay, prose regeneration, formatting and production
  build. The carrier remains draft, open and unmerged.
