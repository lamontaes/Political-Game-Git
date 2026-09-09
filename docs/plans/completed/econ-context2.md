# ECON-CONTEXT2 — Economic and housing context consumer

Status: complete — candidate ready for draft-PR review

Owner: Codex, exclusive ECON-CONTEXT2 writer

Branch: `codex/econ-context2`

Base: `origin/main` at `1eb0b0d09be40e3e10bedd2a1d9fa301eae47f4b`

## Delivery boundary

Turn the already locked BEA regional, BLS LAUS, and HUD housing products into
typed, read-only context. No acquisition is authorized. A source observation
remains dated reference evidence and never becomes simulated truth, a forecast,
a policy effect, a personal outcome, a rent offer, or a fictional publication.

## Reuse and ownership map

- `src/source/domains/bea-regional`, `bls-laus`, and `hud-housing` continue to
  own parsing, normalization, missingness, exact product geography, vintages,
  and source evidence.
- A new source adapter may read those independent corpora and an explicit
  geography binding. It may not join on a display name or import one source
  domain from another.
- Existing `WorldMetricObservationRecord` inputs are the only route by which a
  compatible observation can later enter a save. The adapter prepares inputs;
  reading context writes nothing.
- Existing quantitative-policy and causal/economy records remain authoritative
  for forecasts, realization, and simulated consequences. The adapter supplies
  reference inputs only and creates no estimate or effect.
- Stage 5 resources, work, housing, and affordability remain authoritative for
  a person's cash, job, dwelling, tenure, and obligations.
- NEWS-HELP2 owns publication. This work supplies a disclosure candidate with
  an explicit `not-published` state and never publishes on read.
- UI-core owns `PlayerGame` and production navigation. This work supplies a
  browser-safe generated snapshot, projection, and the smallest documented
  registration patch; it does not race the active owner.

## Implementation checkpoints

1. Extend BEA compilation from locked bytes with a small declared comparison
   window while preserving every measure, unit, geography, and missing value.
2. Add the typed economic-context adapter with exact-code bindings, readable
   observations, historical comparisons, analyst inputs, NEWS candidates,
   known/unavailable results, and immutable reads.
3. Generate one reviewed browser-safe Lexington/Fayette projection from exact
   BEA, LAUS, and HUD identifiers, then provide the presentation projection and
   named UI-core registration handoff.
4. Prove deterministic compilation/replay, geography and period refusal,
   unit/vintage continuity, no source or World mutation, save/replay boundary,
   and no silent forecast/personal/publication conversion.
5. Run the architecture integrity audit for the touched boundaries, focused
   tests, full validation, art gates required by repository policy, exact-head
   CI observation, and publish one unmerged draft PR.

## Explicit remainder

- Only source products present in the three locked corpora are consumable.
- HUD has one acquired vintage, so it supports a dated benchmark but no
  historical HUD comparison.
- The committed LAUS product is the declared 2024+ slice of the seasonally
  adjusted file; other LAUS products and earlier periods remain unavailable.
- Geography coverage is limited by explicit bindings. No place/county/metro
  relationship is inferred from names.
- UI-core integration remains a named handoff until its owner lands the small
  production registration patch.

## Completion evidence

- BEA production coverage remeasured at 35,496 observations: the existing
  11,832-row latest-year product now retains 2019, 2023, and 2024 from the same
  locked artifacts. LAUS remains 13,082 and HUD remains 9,528.
- Focused ECON source/presentation proof: 2 files, 10 tests passed.
- Complete repository test set in single-worker mode: 177 files and 3,214
  non-port tests passed, 2 skipped. The five port-binding tests were then run
  with port-binding permission and passed 5/5.
- Formatting, lint, typecheck, source validation, byte-identical source replay,
  production build, deterministic demo, art validation, 329-item art inventory,
  and art QA all passed.
- Default parallel `npm run validate` remains unsuitable on the shared host: it
  hit seven unchanged five-second test timeouts. Their serial rerun passed; no
  timeout bound or unrelated test was changed.
- Human visual acceptance is not claimed. UI-core still owns the two-line
  `PlayerGame.tsx` registration and its normal-player pointer/keyboard proof.
