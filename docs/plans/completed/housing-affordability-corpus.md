# National Housing / Affordability Source Compiler

## Objective

Build a deterministic, data-driven national housing and affordability source compilation subsystem for the Political Game. Ingests, validates, normalizes, and packages HUD USER Fair Market Rents (FMR), HUD USER Income Limits (IL), and Comprehensive Housing Affordability Strategy (CHAS 2018-2022 ACS) data across county, metropolitan/HMFA, state, and territory geographies.

## Invariants

- Source layer only: no individual household simulator, dynamic rental market engine, or player UI.
- Never fabricate or commit API tokens. Pluggable token-ready adapter degrades gracefully to offline files/fixtures when `HUD_API_TOKEN` is unset.
- Table universe preservation (`occupied_housing_units` vs `all_housing_units` vs `rental_housing_units`).
- Suppression preservation (`suppressed != 0`).
- FMR != observed median rent.
- FMR ($/mo by bedroom count) vs IL ($/yr by family size) distinction.
- Multi-vintage isolation and support (HUD FY2024, FY2023, CHAS 2018-2022 ACS 5-year).
- Deterministic, reproducible compilation with cryptographic SHA-256 provenance.
- Required benchmark fixtures: Lexington-Fayette KY, San Francisco CA, Owsley County KY, San Juan Municipio PR.

## Deliverables

- `src/housing_affordability_corpus/`
  - `types.ts`
  - `ids.ts`
  - `provenance.ts`
  - `normalizer.ts`
  - `compiler.ts`
  - `manifest_builder.ts`
  - `validator.ts`
  - `index.ts`
  - `adapters/hud_user_api.ts`
  - `adapters/hud_user_download.ts`
  - `adapters/chas_file_adapter.ts`
- `data/housing_affordability/`
  - `fixtures/`
  - `raw/`
  - `manifests/`
  - `corpus/`
- `scripts/housing-corpus/`
  - `cli-compile.ts`
  - `cli-manifest.ts`
  - `cli-validate.ts`
- `docs/systems/housing-affordability-corpus.md`
- `tests/housing_affordability_corpus.test.ts`
- `package.json` scripts: `compile:housing`, `manifest:housing`, `validate:housing`, `test:housing`
