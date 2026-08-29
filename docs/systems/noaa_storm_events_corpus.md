# NOAA Storm Events & Disaster Incident Source Corpus

## 1. Overview & Purpose

The NOAA Storm Events source corpus is an authoritative historical calibration and reference substrate built from the **NOAA National Centers for Environmental Information (NCEI) Storm Events Database** (1950–2026).

It provides empirical baselines for future generated and seeded political incidents (e.g. disaster declarations, emergency management responses, infrastructure failures, legislative relief appropriations) without coupling historical event records directly into canonical simulation state.

```
┌──────────────────────────────────────────────────────────────────┐
│ NOAA NCEI Bulk Data (1950-2026)                                  │
│ (Raw StormEvents Details, Fatalities, Episodes)                 │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│ NOAA Storm Corpus Normalizer & Compiler                          │
│ • Unit safety (knots/mph, inches, F/EF, Saffir-Simpson)          │
│ • Historical era & collection procedure boundaries              │
│ • Missing != Zero casualty and damage qualifiers                 │
│ • Deterministic episode/event stable IDs                         │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Normalized       │    │ Derived          │    │ Coverage         │
│ Corpus           │    │ Aggregates       │    │ Manifest         │
│ (events/episodes)│    │ (decadal/damage/ │    │ (eras/caveats/   │
│                  │    │  seasonality)    │    │  jurisdictions)  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

---

## 2. Binding Governance & Game Constitution Invariants

1. **Strict Calibration Isolation**:
   - Historical reported damage and casualties are empirical calibration data. They are **never** directly turned into deterministic canonical game consequences or state mutations.
   - Simulation state (`src/simulation/`) remains pure, headless, and isolated from external data pipelines.

2. **No Climate Extrapolation**:
   - The derived frequency, damage, and seasonality distributions represent observed historical reports. They must **not** be extrapolated into speculative future climate models.

3. **Preservation of Empirical Nuances**:
   - **Missing != Zero**: Missing casualties or damage values are recorded as `null` with explicit qualifiers (`"missing"`), never collapsed into `$0` or `0` casualties.
   - **Historical Collection Eras**: The digital archive collection procedures changed across time; earlier eras naturally lack non-convective events.

---

## 3. Historical Periods of Record & Procedural Eras

| Era                                 | Date Range               | Primary Collection Procedure                            | Systematic Hazard Coverage       |
| ----------------------------------- | ------------------------ | ------------------------------------------------------- | -------------------------------- |
| **`1950-1954_tornado_only`**        | 1950-01-01 to 1954-12-31 | U.S. Weather Bureau Severe Local Storms Project archive | Tornado only                     |
| **`1955-1995_severe_convective_3`** | 1955-01-01 to 1995-12-31 | Severe Convective Storms archive                        | Tornado, Thunderstorm Wind, Hail |
| **`1996-present_nws_standard_48`**  | 1996-01-01 to Present    | NWS Instruction 10-1605 modernization across all WFOs   | 48 Standardized NWS event types  |

### Key Procedural Nuances:

- **Fujita to Enhanced Fujita Transition**: On **February 1, 2007**, tornado ratings transitioned from the Fujita Scale (F0–F5) to the Enhanced Fujita Scale (EF0–EF5).
- **County vs. Forecast Zone Reporting**: Localized convective phenomena (tornadoes, hail, flash floods) are indexed by County (`CZ_TYPE = 'C'`), while large-scale synoptic phenomena (winter storms, blizzards, excessive heat, hurricanes) are indexed by NWS Public Forecast Zone (`CZ_TYPE = 'Z'`).
- **Direct vs. Indirect Casualties**: NWS Instruction 10-1605 records direct casualties (caused immediately by hazard forces) separately from indirect casualties (secondary traffic accidents, carbon monoxide poisoning, heart attacks during cleanup).

---

## 4. Normalized Data Contracts

### 4.1 Storm Event Record (`StormEventRecord`)

- `id`: Deterministic stable ID (e.g. `storm-event:noaa:1000101`)
- `sourceEventId`: Integer NCEI event ID
- `episodeId`: Integer NCEI episode ID
- `eventType`: Canonical NWS string (e.g. `"Tornado"`, `"Flash Flood"`, `"Winter Storm"`)
- `eventFamily`: Mapped taxonomy family (`tornado`, `flood`, `winter_storm`, `tropical_hurricane`, `heat_cold`, `severe_storm`, `wildfire`, `drought_environment`, `marine_coastal`, `other`)
- `coverageEra`: Era identifier
- `beginDateTime` / `endDateTime`: ISO-8601 timestamps (validated `begin <= end`)
- `state` / `stateFips`: State name and 2-digit FIPS code
- `czType` / `czFips` / `czName` / `fullFips`: County / Zone identifier
- `magnitude`: Unit-safe magnitude (`knots`, `mph`, `inches`, `f_scale`, `ef_scale`, `category`, `feet`)
- `casualties`: Direct & indirect injuries and fatalities (preserving `null`)
- `damage`: Property & crop damages with qualifiers (`exact`, `kilo`, `mega`, `giga`, `unspecified`, `missing`)
- `narratives`: Episode and event narrative text
- `provenance`: Dataset source URL, vintage, and record checksum

### 4.2 Storm Episode Record (`StormEpisodeRecord`)

- `id`: Deterministic stable ID (e.g. `storm-episode:noaa:500010`)
- `sourceEpisodeId`: Integer episode ID
- `state` / `stateFips` / `wfo`: State and Weather Forecast Office
- `eventIds`: Array of child event IDs
- `totalDirectInjuries` / `totalDirectDeaths`: Synthesized direct casualty sums
- `totalPropertyDamageDollars` / `totalCropDamageDollars` / `totalEstimatedDamageDollars`: Synthesized damage totals

---

## 5. Derived Aggregates

The aggregation engine generates:

1. **Decadal Frequencies**: Annualized rates and event counts by Jurisdiction FIPS x Event Family x Decade (1950s through 2020s) with era caveats.
2. **Seasonality Profiles**: 12-month proportion distributions and peak hazard activity months.
3. **Observed Damage Distributions**: Empirical damage tiers ($0, <$10k, $10k-$100k, $100k-$1M, $1M-$10M, $10M-$100M, >$100M) and non-zero percentile curves (median, p75, p90, p99, max).

---

## 6. Commands & Verification

```bash
# Compile raw fixtures into normalized corpus, aggregates, and manifest
npm run compile:storm-corpus

# Validate corpus integrity rules (magnitude unit safety, date ordering, missing!=zero)
npm run validate:storm-corpus

# Inspect national and jurisdiction coverage manifest
npm run manifest:storm-corpus

# Run automated unit test suite
npm run test:storm-corpus
```
