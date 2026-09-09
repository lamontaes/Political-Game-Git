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

- The independently reproducible E-1 symptom—undated normal context exposing a
  2026-retrieved artifact in a 2024 simulation—is covered and repaired. The full
  finding text is still unavailable, so the delivery must not claim every
  clause of E-1 is closed until that exact ledger is recovered.
- The dated source repair was published separately at `c2eda37`.
- The all-corpus browser provider, typed graphs, LEG adapter, explicit FISCAL/GDP
  unavailability, accessible feature-local panel, and deterministic replay proof
  are implemented locally pending a frozen extension checkpoint.
- UI-core published the normal-player mount and combined prose regeneration at
  `b4910c09ff33f9098592df0f44e0a375cd98e973` on PR #144. Its reported proof is
  11 focused checks, typecheck, and 2/2 normal-browser tests covering Begin →
  Personal, exact saved home-place/date binding, pointer/keyboard disclosures,
  non-Lexington absence, and save/reload read purity.
