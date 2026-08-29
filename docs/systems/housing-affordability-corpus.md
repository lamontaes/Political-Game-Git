# National Housing & Affordability Source Corpus System

## 1. Overview & Purpose

The **National Housing & Affordability Source Corpus** is the foundational, data-driven housing source and calibration layer for the Political Game. It provides deterministic ingestion, normalization, cross-table linking, multi-vintage isolation, and validation tooling for:

1. **HUD USER Fair Market Rents (FMR)** (gross rent payment standards by bedroom count);
2. **HUD USER Section 8 Income Limits (IL)** (median family incomes and 30%/50%/80% AMI thresholds for 1–8 person households);
3. **Comprehensive Housing Affordability Strategy (CHAS)** (custom HUD tabulations of U.S. Census Bureau ACS 5-year microdata, currently based on the 2018–2022 ACS).

This system provides the empirical calibration substrate for housing affordability, rent burdens, housing problems, and federal housing policy across metropolitan areas, non-metropolitan rural counties, states, and territories (including Puerto Rico).

---

## 2. Architectural Boundaries & Product Principles

### Boundary Contracts

- **Source Layer Only**: This system is a pure calibration and starting-data source subsystem. In accordance with **Game Constitution Principle 25** ("Real-world starting data and simulated save-world history are distinct data domains"), it does **not** implement an individual household simulator, dynamic rental market mechanics, NPC landlord/tenant interaction loops, or player-facing housing UI.
- **HUD API Token Protection**: Certain HUD APIs require an access token. The system strictly forbids fabricating or hard-coding API tokens. It provides a token-ready API client that operates if `HUD_API_TOKEN` is supplied in the environment, while degrading gracefully to offline downloadable datasets and benchmark fixtures when no token is present.
- **FMR != Observed Median Rent**: Fair Market Rent is a gross rent standard (typically the 40th percentile of standard-quality, recent-mover rental units by bedroom count), whereas observed median rent is the 50th percentile across all existing occupied rental units. The compiler explicitly tags FMR records with `isObservedMedianRent: false`.
- **FMR vs Income Limit Distinction**: FMR specifies gross rental price standards ($/month) by bedroom count (0BR–4BR), while Income Limits specify annual household income thresholds ($/year) by family size (1–8 persons). They are modeled as distinct schemas.
- **Table Universe Preservation**: CHAS tabulations use distinct universes across tables (e.g. `occupied_housing_units` [households], `rental_housing_units`, `all_housing_units` [including vacant], and `households_cost_burden_computable`). The compiler preserves the exact table universe for every observation.
- **Suppression != Zero Invariant**: Data suppressed by the Census Bureau or HUD for disclosure avoidance or sample size thresholds are represented with `householdCount: null` and `status: "suppressed"`. They are never converted to zero counts.

---

## 3. Data Sources & Methodology

### 1. HUD USER Fair Market Rents (FMR)

- **Authority**: U.S. Department of Housing and Urban Development (HUD USER).
- **Vintages**: Fiscal Year annual releases (e.g. `FY2024`, `FY2023`).
- **Geographies**: HUD Metropolitan Fair Market Rent Areas (HMFAs), Non-metropolitan Counties, and Puerto Rico Municipios.
- **Bedroom Count Tiers**: 0BR (Studio / Efficiency), 1BR, 2BR, 3BR, 4BR.
- **Standard**: 40th percentile (or 50th percentile in designated metropolitan areas / SAFMRs).

### 2. HUD USER Income Limits (IL)

- **Authority**: HUD Office of Policy Development and Research (PD&R).
- **Vintages**: Fiscal Year annual releases (e.g. `FY2024`, `FY2023`).
- **Median Family Income (MFI / AMI)**: 4-person Area Median Family Income base.
- **Threshold Categories**:
  - **30% AMI (Extremely Low Income - ELI)**: Higher of 30% AMI or federal poverty guideline, capped at 50% VLI limit.
  - **50% AMI (Very Low Income - VLI)**: 50% of 4-person MFI with standard family-size adjustments.
  - **80% AMI (Low Income - LI)**: 80% of 4-person MFI with standard family-size adjustments.
- **Family Sizes**: 1-person through 8-person limits.

### 3. Comprehensive Housing Affordability Strategy (CHAS)

- **Authority**: HUD / U.S. Census Bureau ACS 5-Year custom tabulations (2018–2022 ACS).
- **Core Tables**:
  - **Table 1**: Housing Problems by tenure and HAMFI income bracket.
  - **Table 7**: Housing Problems by household type, tenure, and HAMFI income bracket.
  - **Table 8**: Housing Cost Burden by household type, tenure, and HAMFI income bracket.
  - **Table 9**: Housing Cost Burden by tenure and HAMFI income bracket.
- **HAMFI Brackets (HUD Area Median Family Income)**:
  - `<= 30% HAMFI` (Extremely Low Income)
  - `> 30% to <= 50% HAMFI` (Very Low Income)
  - `> 50% to <= 80% HAMFI` (Low Income)
  - `> 80% to <= 100% HAMFI` (Moderate Income)
  - `> 100% HAMFI` (Above Area Median Income)
  - `all_income_levels` (Aggregate total)
- **Housing Cost Burden Categories**:
  - `<= 30%`: Not cost burdened
  - `> 30% to <= 50%`: Cost burdened
  - `> 50%`: Severely cost burdened
  - `not_computed`: Zero or negative income, or no cash rent
- **Housing Problems**:
  - 1+ of 4 problems: Incomplete kitchen, incomplete plumbing, overcrowding (>1.01 persons/room), or cost burden (>30%).
  - 1+ of 4 severe problems: Incomplete kitchen, incomplete plumbing, severe overcrowding (>1.50 persons/room), or severe cost burden (>50%).

---

## 4. Benchmark Calibration Profiles

The corpus incorporates grounded benchmark profiles across four distinct geographic classifications:

| Benchmark Archetype    | Jurisdiction             | FIPS / CBSA       | FY24 FMR 2BR | FY24 MFI | Total Households | Severe Cost Burden Rate (>50%) |
| :--------------------- | :----------------------- | :---------------- | :----------- | :------- | :--------------- | :----------------------------- |
| **Lexington Baseline** | Fayette County, KY       | 21067 / 30460     | $1,158       | $94,900  | 139,450          | 19.2%                          |
| **Expensive Metro**    | San Francisco County, CA | 06075 / 41860     | $3,271       | $182,800 | 373,200          | 26.4%                          |
| **Low-Cost Rural**     | Owsley County, KY        | 21189 / Non-metro | $828         | $44,800  | 1,735            | 22.2%                          |
| **Territory**          | San Juan Municipio, PR   | 72127 / 41980     | $637         | $30,800  | 135,120          | 39.1%                          |

---

## 5. CLI Tooling & Commands

| Command                    | Action                                                                                                                          |
| :------------------------- | :------------------------------------------------------------------------------------------------------------------------------ |
| `npm run compile:housing`  | Ingests and normalizes raw HUD and CHAS datasets into `data/housing_affordability/corpus/normalized_housing_corpus.json`.       |
| `npm run manifest:housing` | Builds national coverage and benchmark manifest `data/housing_affordability/manifests/national_housing_coverage_manifest.json`. |
| `npm run validate:housing` | Runs full corpus integrity, schema, universe, and cross-table validation.                                                       |
| `npm run test:housing`     | Executes the Vitest test suite (`tests/housing_affordability_corpus.test.ts`).                                                  |

---

## 6. Deterministic Provenance & Cryptographic Verification

All compiled corpus and manifest artifacts include SHA-256 checksums computed via canonical, sorted-key JSON serialization (`canonicalJsonStringify`). Re-running compilation produces byte-for-byte identical output.
