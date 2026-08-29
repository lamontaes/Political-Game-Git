# Local Economy and Labor-Market Source Corpus

## 1. Overview and Purpose

The **Local Economy and Labor-Market Source Corpus** provides standardized, normalized, and immutable source observations from official federal economic statistical agencies:

1. **U.S. Bureau of Economic Analysis (BEA)** — Regional Economic Accounts (County/State GDP, Personal Income, Total/Wage/Proprietor Employment, Industry Earnings).
2. **U.S. Bureau of Labor Statistics (BLS)** — Quarterly Census of Employment and Wages (QCEW) (Establishments, Employment, Total Wages, Average Weekly Pay by NAICS industry and ownership).

These records serve as the authoritative empirical baseline for calibrating local economic conditions across diverse jurisdictions—including core Lexington/Fayette County, KY and contrasting economic archetypes (e.g., Appalachian coal transition in Martin County KY, automotive manufacturing in Wayne County MI, high-tech/information dominance in Santa Clara County CA, Permian Basin oil extraction in Midland County TX, and tourism/services in Miami-Dade County FL).

---

## 2. Strict Architectural Invariants

### 2.1 Explicit Price Basis and Unit Safety

- **Rule**: Never mix nominal and real dollars silently.
- **Implementation**: Every monetary observation carries a strictly typed `MoneyValueUnit` object with explicit `priceBasis` (`"nominal"` or `"real"`). Real series (such as BEA CAGDP9 Real GDP) must specify their `referenceYear` (e.g. `chained 2017 dollars`).
- **Enforcement**: Any comparison, arithmetic subtraction, or growth calculation across differing price bases without an explicit price index / deflator will fail validation (`assertUnitCompatibility`).

### 2.2 Period Truthfulness and Cadence Integrity

- **Rule**: Do not create fake monthly values from annual data.
- **Implementation**: Observations strictly preserve genuine source reporting frequencies:
  - `annual`: Entire calendar year observations (e.g., BEA CAINC1, QCEW annual average).
  - `quarterly`: Genuine quarterly observations (e.g., QCEW Q1–Q4).
  - `monthly`: Genuine monthly employment levels (`month1_emplvl`, `month2_emplvl`, `month3_emplvl`) reported in quarterly QCEW filings.
- Annual totals are never interpolated, smoothed, or subdivided into artificial monthly values.

### 2.3 Surviving Confidentiality and Suppression Codes

- **Rule**: QCEW and BEA confidentiality flags must survive with non-zero handling.
- **Implementation**: When an employer count or single-firm dominance triggers federal disclosure suppression (e.g., `disclosure_code = "N"`, `"C"`, `"(D)"`), the record is marked `isSuppressed = true`, `suppressionStatus = "suppressed_confidential"`, and `value = null`.
- Suppressed values are never coerced to zero in aggregate calculations or Location Quotient calculations.

### 2.4 Distinct Vintage and Revision Identity

- **Rule**: Never treat revised BEA vintages as identical to earlier publications.
- **Implementation**: Every dataset ingestion requires a `SourceVintageMetadata` identifier, recording release dates, revision tags (`preliminary`, `revised`, `comprehensive_benchmark`), and `supersedesVintageId` lineage. Observations from different publication vintages for the same calendar year retain distinct synthetic IDs and do not silently overwrite earlier releases.

### 2.5 NAICS Taxonomy Safety

- **Rule**: Strict validation against NAICS structures.
- **Implementation**: NAICS codes are validated against 2017/2022 classifications, supporting hierarchy rollups from 6-digit industries to 3-digit subsectors, 2-digit sectors, and Goods-producing vs Service-providing supersectors.

---

## 3. Data Model Summary

### Primary Structures (`src/local_economy_corpus/types.ts`)

- `EconomyObservationRecord`: Normalized individual time-series observation.
- `EconomySeriesSummary`: Time-span and metadata summary for a unique geographic series.
- `LocalEconomyManifest`: Coverage manifest detailing jurisdictions, vintages, and series counts.
- `NormalizedEconomyCorpusPackage`: Full deterministic checksummed corpus.

---

## 4. Calibration & Analytical Seam (`src/local_economy_corpus/calibration.ts`)

The `EconomyCorpusQueryEngine` provides pure query utilities over normalized observations:

1. **Location Quotients (LQs)**:
   $$\text{LQ}_{i,\text{local}} = \frac{E_{i,\text{local}} / E_{\text{total},\text{local}}}{E_{i,\text{bench}} / E_{\text{total},\text{bench}}}$$
2. **Economic Structure Profiles**:
   - Transfer receipts share of personal income: $\frac{\text{Transfer Receipts}}{\text{Personal Income}}$
   - Proprietor share of jobs: $\frac{\text{Proprietor Jobs}}{\text{Total Employment}}$
   - Goods vs Services employment shares.
   - Government vs Private employment shares.
   - Average annual pay and weekly wage relativities.
3. **Real GDP and Earnings Growth Rates**: Year-over-year percentage change with unit safety verification.

---

## 5. Tooling and Commands

- `npm run compile:economy` — Compiles raw BEA and QCEW source fixtures into `normalized_economy_corpus.json`.
- `npm run manifest:economy` — Generates `local_economy_manifest.json`.
- `npm run validate:economy` — Validates corpus integrity, geography, NAICS safety, price bases, and suppression flags.
- `npm run test:economy` — Runs automated test suite.
- `node --import tsx scripts/local-economy-corpus/cli-calibrate.ts` — Prints calibration diagnostic reports.
