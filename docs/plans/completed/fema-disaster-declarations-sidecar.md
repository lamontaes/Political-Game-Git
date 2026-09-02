# FEMA Disaster Declarations Historical Corpus Sidecar Plan

## Goal

Build a truthful historical disaster-declaration identity/timeline corpus from official FEMA/OpenFEMA data for later external-event adapters. Do not implement event probabilities or gameplay.

## Requirements

1. Sidecar directory structure:
   - `src/fema_disasters/` for core types, schemas, and adapter contracts.
   - `data/fema-disasters/` for raw pinned datasets, acquisition manifest, compiled output, and dataset README.
   - `scripts/fema-corpus/` for download/fetch script, compiler script, validator script, and script README.
   - `docs/fema-disasters-adapter-note.md` for future simulation adapter consumption.
   - `tests/fema_disasters.test.ts` for comprehensive test coverage.
2. Disjoint from PR #62:
   - Do NOT touch `src/source` or `data/source`.
   - Do NOT import PR #62 files or packages.
3. Truthful field preservation:
   - Preserve missing dates/areas as missing/null (never fabricate).
   - Missing != zero: boolean or numeric flags missing in source must stay `null`/`undefined`, not coerced to `false` or `0`.
   - Explicitly separate physical hazard (`underlying_physical_hazard`) from administrative declaration (`administrative_declaration_or_response`).
4. Strict prohibition on gameplay probability modeling:
   - NO occurrence rates, probabilities, severity scores, or casualties.
5. Provenance & Refresh Strategy:
   - Decouple online API fetching from offline deterministic runtime compilation.
