# National Names V2 Source Compiler

## 1. Overview and Purpose

The **National Names V2 Source Compiler** is an authoritative, reproducible data compilation system for U.S. first names and surnames. It ingests official public-domain records from the **U.S. Census Bureau** and the **Social Security Administration (SSA)** to produce normalized, deterministically sorted, cryptographically hashed, and sharded name datasets.

The compiled dataset supports rich historical and demographic person generation for future game systems, including:

- Contemporary nationwide first name and surname distributions;
- Empirical sex distributions (male count, female count, and empirical proportions without categorical binary pigeonholing);
- Cohort birth-year frequencies from 1880 through 2025;
- State-of-birth historical frequencies (50 states + District of Columbia, 1910–2025);
- U.S. territory birth frequencies (Puerto Rico and other U.S. territories, 1998–2025).

> [!IMPORTANT]
> **Separation of Source Data and Person Generator**:
> This compiler owns only source acquisition, normalization, sharding, manifest generation, integrity validation, and cohort query tools. It does **not** alter the runtime person generator in `src/simulation/`, which remains frozen on `names-v1` for current releases. Future generator PRs can consume `names-v2` through clean versioned loaders.

---

## 2. Authoritative Data Sources

### A. U.S. Census Bureau — 2020 Census Names Data

- **Official URL**: `https://www.census.gov/topics/population/genealogy/data/2020_names.html` / `https://www2.census.gov/topics/genealogy/2020surnames/`
- **Release Vintage**: April 2026 release of the 2020 Decennial Census Names tabulations.
- **First Names**: `Names2020_FirstNames_Sex.xlsx` — 53,615 frequently occurring given names (occurring 100+ times across the living U.S. population in the 2020 Census), broken down by recorded sex, proportion per 100,000, and cumulative national distribution.
- **Surnames**: `Names2020_LastNames_RaceHispanic.xlsx` — 156,621 frequently occurring last names (occurring 100+ times in the 2020 Census), with national rank, count, proportion per 100,000, cumulative proportion, and descriptive Census demographic breakdown counts.

### B. Social Security Administration (SSA) — Popular Names Research Data

- **Official URL**: `https://www.ssa.gov/oact/babynames/limits.html`
- **Methodology Reference**: `https://www.ssa.gov/OACT/babynames/background.html`
- **Release Vintage**: March 2026 data release.
- **National Series**: `names.zip` — 146 annual tables (`yob1880.txt` to `yob2025.txt`) recording every given name with at least 5 occurrences among Social Security card applications for births in the 50 states + DC.
- **State-Specific Series**: `namesbystate.zip` — 51 state tables (`AK.TXT` to `WY.TXT`, including `DC.TXT`) recording annual given name occurrences from 1910 through 2025.
- **Territory-Specific Series**: `namesbyterritory.zip` — Puerto Rico (`PR.TXT`) and U.S. Territories (`TR.TXT`: American Samoa, Guam, Northern Mariana Islands, U.S. Virgin Islands) from 1998 through 2025.

---

## 3. Census vs. SSA Methodological Differences

Understanding the differences between Census and SSA datasets is essential for sound demographic modelling:

| Dimension                    | U.S. Census Bureau (2020)                                            | Social Security Administration (1880–2025)                                            |
| :--------------------------- | :------------------------------------------------------------------- | :------------------------------------------------------------------------------------ |
| **Population Scope**         | Living U.S. resident population enumerated in April 2020 (all ages). | Cohort births in the U.S. applying for SSNs at or near birth (by birth year).         |
| **Time Horizon**             | Cross-sectional snapshot of contemporary living population.          | Longitudinal time series tracking 146 distinct birth-year cohorts.                    |
| **Geography**                | 50 States, DC, Puerto Rico (national living tally).                  | National series covers 50 states + DC; territories (PR, TR) are published separately. |
| **Threshold**                | Names occurring 100 or more times nationally.                        | Names occurring 5 or more times per year in the relevant geographic area.             |
| **Spelling / Normalization** | First name strings as written on Census questionnaire.               | First name field from SSN application (spaces and hyphens removed).                   |

---

## 4. Semantic Rules & Design Invariants

### 1. No Categorical "Male", "Female", or "Unisex" Hard-Coding

Names are not assigned rigid categorical binary labels. Instead, each record stores empirical counts and shares:

- `male_count`
- `female_count`
- `total_count`
- `male_share` (`male_count / total_count`)
- `female_share` (`female_count / total_count`)

Names that occur under both recorded sexes (e.g. _Alexis_, _Avery_, _Jordan_, _Micah_, _Taylor_) naturally reflect their empirical distributions. A future person generator draws probabilistically from these continuous shares rather than forcing an artificial binary or ternary label.

### 2. Race / Ethnicity Guardrail

Census demographic breakdown counts (e.g. `white_alone_count`, `black_alone_count`, `hispanic_origin_count`) are preserved strictly as **passive source metadata** from the official Census table.

**Strict Prohibition**:

- No race inference functions (`guessRaceFromName()`, `inferEthnicity()`, or equivalents) exist or may be created.
- Name strings must never be used to impute a simulated or real person's race or ethnicity.

### 3. Missing and Suppressed Data Handling

- SSA privacy policies suppress names occurring fewer than 5 times in a given state/territory and year.
- Suppressed or absent data points are preserved as absent (`undefined` / omitted keys), **never** coerced to zero or fabricated probabilities.

### 4. Cohort Isolation

- National frequencies, state-level frequencies, and territory frequencies remain strictly separated in their respective records (`ssa_national`, `ssa_state`, `ssa_territory`).
- State data cannot leak across state lines.
- Territory births (e.g. Puerto Rico) are kept separate from the 50-state national series.

---

## 5. Normalized Record Schemas

### `GivenNameSourceRecord`

```typescript
export interface GivenNameSourceRecord {
  readonly key: string; // normalized lowercase (e.g. "aaron", "alexis")
  readonly display_name: string; // canonical Title Case (e.g. "Aaron", "Alexis")
  readonly census: {
    readonly male_count: number;
    readonly female_count: number;
    readonly total_count: number;
    readonly male_share: number;
    readonly female_share: number;
    readonly rank?: number;
    readonly proportion_per_100k?: number;
  } | null;
  readonly ssa_national: {
    readonly total_male: number;
    readonly total_female: number;
    readonly total: number;
    readonly male_share: number;
    readonly female_share: number;
    readonly first_year: number;
    readonly last_year: number;
    readonly peak_year: number;
    readonly yearly: Record<string, { male: number; female: number }>;
  } | null;
  readonly ssa_state: Record<
    string,
    {
      readonly total_male: number;
      readonly total_female: number;
      readonly total: number;
      readonly yearly: Record<string, { male: number; female: number }>;
    }
  >;
  readonly ssa_territory: Record<
    string,
    {
      readonly total_male: number;
      readonly total_female: number;
      readonly total: number;
      readonly yearly: Record<string, { male: number; female: number }>;
    }
  >;
  readonly provenance: readonly string[];
}
```

### `SurnameSourceRecord`

```typescript
export interface SurnameSourceRecord {
  readonly key: string; // normalized lowercase (e.g. "smith", "garcia")
  readonly display_name: string; // canonical Title Case (e.g. "Smith", "Garcia")
  readonly census: {
    readonly count: number;
    readonly rank: number;
    readonly proportion_per_100k: number;
    readonly cumulative_proportion: number;
    readonly demographic_metadata?: {
      readonly white_alone_count?: number;
      readonly black_alone_count?: number;
      readonly aian_alone_count?: number;
      readonly api_alone_count?: number;
      readonly two_or_more_races_count?: number;
      readonly hispanic_origin_count?: number;
    };
  };
  readonly provenance: readonly string[];
}
```

---

## 6. Sharding and Storage Layout

Outputs are located in `data/names-v2/` partitioned alphabetically:

```text
data/names-v2/
├── manifest.json              # Full cryptographic manifest and provenance
├── index.json                 # Fast summary index (counts, year ranges, geography)
├── given-names/
│   ├── given_names_a.json     # Shard 'a' given name records
│   ├── ...
│   └── given_names_z.json     # Shard 'z' given name records
└── surnames/
    ├── surnames_a.json        # Shard 'a' surname records
    ├── ...
    └── surnames_z.json        # Shard 'z' surname records
```

---

## 7. Tooling & CLI Commands

- `npm run acquire:names` — Downloads raw authoritative datasets from official federal endpoints and verifies SHA-256 hashes.
- `npm run compile:names` — Compiles raw datasets into deterministic normalized JSON shards and regenerates `manifest.json`.
- `npm run validate:names` — Validates all shards against schemas, cryptographic hashes, and count reconciliation invariants.
- `npm run test` — Runs full test suite including `tests/names-compiler.test.ts`.

---

## 8. Consumer Integration Guide (`names-v2`)

When a future PR integrates `names-v2` into the simulation person generator:

1. Load shards on demand or pre-compile compact frequency maps for the active game era and jurisdiction.
2. For character generation with a known birth year (e.g. 1968) and state of birth (e.g. `"KY"`):
   - Query `ssa_state["KY"]?.yearly["1968"]` if available;
   - Fall back gracefully to `ssa_national.yearly["1968"]` or Census contemporary weights;
   - Draw given name probabilistically according to sex-conditioned counts without fabricating missing data.
3. Surnames are drawn according to national Census frequency ranks or localized distributions.
4. Keep the simulation layer pure TypeScript without coupling to raw archive file formats.
