# Generated simulation tables

These eight JSON snapshots preserve every runtime export of the corresponding
TypeScript module. Export names are the top-level keys. Compact row strings,
metadata, arrays, numeric values, nulls, and missing-field conventions are kept
exactly as exported. This is a storage conversion, not a data refresh.

The existing game still imports the original generated TypeScript files. Nothing
in its read path changes. New consumers can import the asynchronous loaders from
`data/tables/index.ts`; each loader reads its corresponding JSON file on demand
and returns the original module's TypeScript shape. The original modules are used
only for types in the loader and are not loaded at runtime.

```ts
import { loadTownPay } from "./data/tables";

const pay = await loadTownPay();
// pay.TOWN_PAY_META, pay.TOWN_PAY_PERCENTILES, and all other original exports.
```

## Sources and vintages

Paths below are relative to the repository root. Provenance is inherited from the
original generated modules and their generators; existing source hashes and
metadata remain in the JSON. The snapshots were extracted on October 11, 2026.

| JSON file / loader                                       | Original TypeScript module                                      | Source and vintage                                                                                                                                                                                                                                                                                                                                                                                                   | Original generator                                              |
| -------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `town-pay.json` / `loadTownPay`                          | `src/simulation/living-world/town-pay.generated.ts`             | BLS OEWS, May 2025, area/state/national annual wage percentiles; BLS CES pay-period shares, February 2023; U.S. Department of Labor minimum wages as of July 1, 2026, from `data/research/money/minimum-wage-2026.json`. OEWS inputs: `data/source/career-occupations/raw/`; area links: `data/source/cbsa-delineations/regional-corpus.json.gz`; pay periods: `data/source/bls-pay-period/regional-corpus.json.gz`. | `scripts/source/regional-money/export-town-pay.ts`              |
| `town-rent.json` / `loadTownRent`                        | `src/simulation/living-world/town-rent.generated.ts`            | HUD FY2025 Fair Market Rents and Section 8 income limits, from `data/source/hud-housing/corpus.json`. Includes the original population-weighted state estimates.                                                                                                                                                                                                                                                     | `scripts/source/regional-money/export-town-rent.ts`             |
| `town-employment.json` / `loadTownEmployment`            | `src/core2/reference/town-employment.generated.ts`              | Census County Business Patterns 2023, March private employment; BLS OEWS May 2025 state totals and public-ownership research estimates. Locked corpus metadata is dated September 26, 2026.                                                                                                                                                                                                                          | `scripts/source/regional-money/export-town-employment.ts`       |
| `town-bank-shapes.json` / `loadTownBankShapes`           | `src/simulation/living-world/town-bank-shapes.generated.ts`     | [FDIC BankFind financial call reports](https://banks.data.fdic.gov/api/financials), June 30, 2026, for institutions with assets under $1 billion. Ratios read September 28–29, 2026; asset/certificate records recovered October 1, 2026. All 3,194 original ratio rows and associated records are retained.                                                                                                         | `scripts/research/compile-fdic-town-banks.py`                   |
| `town-deposits.json` / `loadTownDeposits`                | `src/simulation/living-world/town-deposits.generated.ts`        | [FDIC Summary of Deposits](https://api.fdic.gov/banks/sod?filters=YEAR:2026), June 30, 2026, read September 29, 2026. County branch deposits in thousands of dollars; preserves the exclusion of main offices of banks with assets over $10 billion.                                                                                                                                                                 | `scripts/research/compile-fdic-county-deposits.py`              |
| `local-business-counts.json` / `loadLocalBusinessCounts` | `src/simulation/local-business-counts.generated.ts`             | Census County Business Patterns 2023 (NAICS 2022 four-digit establishments and employment), Economic Census 2022 (sales and employees), and BEA CAINC1 line 2 population for 2024. Inputs: `data/source/county-business-patterns/raw/cbp-county-2023.zip`, `data/source/economic-census-2022/raw/business-receipts.csv`, and `data/source/bea-regional/raw/CAINC1.zip`.                                              | `scripts/source/regional-money/export-local-business-counts.ts` |
| `county-home-value.json` / `loadCountyHomeValue`         | `src/simulation/county-home-value.generated.ts`                 | Census 2024 ACS five-year Detailed Tables, B25077, observation period 2020–2024; locked September 26, 2026. Input: `data/source/acs-county-housing-commute/regional-corpus.json.gz`.                                                                                                                                                                                                                                 | `scripts/source/regional-money/export-county-home-value.ts`     |
| `place-population.json` / `loadPlacePopulation`          | `src/simulation/nationwide-world/place-population.generated.ts` | [Census Vintage 2025 subcounty population estimates](https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/cities/totals/sub-est2025.csv), July 1, 2025. Verified input: `docs/research/chatgpt-answers/2026-09-23-cto-handoff-2230/DATA-Census-Vintage-2025-places-50-states-DC.csv`. Preserves the original coverage and exclusions.                                                                  | `scripts/world/compile-place-population.ts`                     |

## Value conventions

Do not reinterpret these snapshots during loading. Wage, rent, and employment
strings retain empty fields where the publisher withheld or omitted figures.
Minimum-wage nulls remain null. Missing home-value counties stay absent. Business
rows retain their original zero conventions, including withheld sales, and the
existing reader's fallback behavior. Population rows keep the four published
zero estimates. Bank ratios, record order, and deposit units remain unchanged.

## Regeneration and verification

After an intentional update to the original TypeScript tables, regenerate from
the repository root:

```sh
node --import tsx scripts/source/export-data-tables.ts
node --import tsx scripts/source/export-data-tables.ts --check
npm run storage -- run test -- npx --no-install vitest run tests/data-tables.test.ts
```

The exporter snapshots the complete module namespace and formats JSON with the
repository's Prettier dependency. It never executes the original upstream
generators. `--check` reads without writing and fails on a stale snapshot.
The test compares each parsed JSON object to every current TypeScript export,
then compares the corresponding loader result to that JSON object.

The JSON files retain compact row strings rather than expanding them into rows.
The largest snapshot is `town-pay.json` at 1,487,760 bytes. Each file is below
1.5 MB and well below GitHub's 100 MiB file limit; no large-file exception or
LFS pointer is needed.
