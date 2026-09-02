# U.S. Government-Universe Source Layer

## 1. Purpose & Authority

The **U.S. Government-Universe Source Layer** is the foundational, data-driven source layer for governmental entities that actually exist in the United States. It provides deterministic ingestion, normalization, Census Government ID decoding, qualitative structural classification, manifest generation, and integrity validation for local and state governments across all 50 states and the District of Columbia.

This corpus equips the Political Game with the authoritative knowledge that American local government is far more than simply "city / county / state"—encompassing independent special districts, civil townships, independent school districts, and distinct legal subclasses under individual state constitutions and statutes.

### Primary Sourced References

- **U.S. Census Bureau**: _Census of Governments, Organization Component_ (2022, 2017).
- **U.S. Census Bureau**: _Government Units Survey (GUS)_.
- **U.S. Census Bureau**: _2022 Census of Governments: Individual State Descriptions_ (Report G22-CG-ISD).
- **U.S. Census Bureau**: _Historical Statistics on Governments (1952–2022)_.

---

## 2. Architectural Boundary & Invariants

### Boundary Contract

1. **Source Layer, Not a Legal Engine**: This system is a searchable reference index and evidence layer. It does **not** implement a mutable legal engine, simulate government powers, or infer unprovided powers.
2. **Missing Authority Strictly Unknown**: If a specific statutory power or structure is not explicitly provided in the Census source data, it remains strictly marked **unknown**. No powers or rules are invented.
3. **Strict Subsystem Isolation**: Implementation is isolated in `src/government_universe/`, `scripts/government-universe/`, `data/government_universe/`, and `tests/government_universe.test.ts`. Current gameplay, `src/simulation/`, `src/player/`, and `src/presentation/` remain untouched.
4. **Preservation of Distinct Realities**:
   - **`Government != Geographic Place`**: A Census Designated Place (CDP) or physical locality is not an organized government unit.
   - **`Special District != Municipal Department`**: Independent special districts meeting Census criteria of corporate existence, governmental character, and substantial fiscal/administrative autonomy are distinct from subordinate city/county departments.
   - **`Independent School District != Dependent School System`**: Independent school districts with separate elected boards and tax-levying authority are distinguished from dependent municipal/county/township/state school systems.
   - **`Census Classification != Complete Legal Authority`**: Census classifications serve statistical comparability based on standardized criteria, while state law defines constitutional and statutory powers.
   - **`Absent Record != Nonexistent Government`**: An absent record is treated as unknown/unrecorded unless the universe scope explicitly bounds coverage.

---

## 3. Census Government Classification & 14-Digit Gov ID

The Census Bureau recognizes **5 basic local-government classes** (plus state and federal):

| Class              | Type Code | 2022 National Count | Definition & Autonomy Criteria                                                                                                       |
| :----------------- | :-------- | :------------------ | :----------------------------------------------------------------------------------------------------------------------------------- |
| `county`           | `2`       | 3,031               | General-purpose local governments for a county geographic area (parishes in LA, organized boroughs in AK).                           |
| `municipal`        | `3`       | 19,491              | General-purpose local governments incorporated for population concentrations (cities, boroughs, incorporated towns, villages).       |
| `township`         | `4`       | 16,214              | General-purpose local governments for civil sub-county areas in 20 states (New England towns, NY/WI towns, Midwest civil townships). |
| `special_district` | `5`       | 39,555              | Independent special-purpose entities with substantial fiscal and administrative autonomy.                                            |
| `school_district`  | `6`       | 12,546              | Independent public school districts with separate boards and independent tax-levying powers.                                         |
| `state`            | `1`       | 50                  | Sovereign constituent political entities under the Tenth Amendment.                                                                  |
| `federal`          | `0`       | 1                   | National constitutional government of the United States.                                                                             |

### 14-Digit Census Government Identification Code Format

$$\underbrace{\text{SS}}_{\text{State (01-51)}} \underbrace{\text{T}}_{\text{Type (1-6)}} \underbrace{\text{CCC}}_{\text{County Area (001-999)}} \underbrace{\text{UUU}}_{\text{Unit ID (001-999)}} \underbrace{\text{FFF}}_{\text{Function (000-099)}} \underbrace{\text{SS}}_{\text{Subunit (00)}}$$

- **Digits 1–2 (`SS`)**: Census State Code (e.g., `18` for Kentucky, `44` for Texas, `14` for Illinois).
- **Digit 3 (`T`)**: Government Type Code (`1`=State, `2`=County, `3`=Municipal, `4`=Township, `5`=Special District, `6`=School District).
- **Digits 4–6 (`CCC`)**: County Area Code within the state.
- **Digits 7–9 (`UUU`)**: Unique Unit Identifier within the county area.
- **Digits 10–12 (`FFF`)**: Census Functional Classification Code (`000`=General, `024`=Fire, `044`=Education, `050`=Housing, `052`=Drainage, `059`=Conservation, `060`=Parks, `061`=Libraries, `062`=Hospitals, `080`=Sewerage, `091`=Water, `094`=Transit, `099`=Multi-function).
- **Digits 13–14 (`SS`)**: Subunit / Campus Code (`00` for primary independent entity).

---

## 4. Data Models

Normalized data models in `src/government_universe/types.ts`:

1. **`GovernmentSourceRecord`**:
   - `stableSourceId`: Deterministic stable key (e.g. `gov-src-census-18203400100000`).
   - `censusGovId`: 14-digit Census Gov ID.
   - `officialName`: Official title of the governmental entity.
   - `state` / `stateFips`: 2-letter postal code and 2-digit FIPS.
   - `countyAssociation` / `placeAssociation`: Associated county and municipal names/FIPS.
   - `governmentType`: `GovernmentClass`.
   - `governmentSubtype`: Specific state statutory form (e.g. `urban_county_government`, `home_rule_class_city`, `civil_township`).
   - `functionCategory`: `GovernmentFunctionCategory`.
   - `activeStatus`: `"active" | "inactive" | "unknown"`.
   - `geographicIdentifiers`: Census state/type/county/unit codes, FIPS codes, GEOID, GNIS ID.
   - `sourceVintage`: "2022 Census of Governments".
   - `sourceProvenance`: Source agency, URL, retrieval date, content hash, public domain license.

2. **`GovernmentTypeAuthorityRecord`**:
   - `authorityId`: Stable authority ID (e.g. `gov-auth-ky`).
   - `state` / `stateName`: State code and name.
   - `sourceDescription`: Authoritative qualitative overview from Census Individual State Descriptions.
   - `authorizedClasses`: Detailed array of authorized classes, statutory legal bases, governing body titles, selection methods (`elected`, `appointed`, `mixed`), and independence notes.
   - `censusClassificationNotes`: Specific Census classification criteria and dependent agency treatment.
   - `sourceCitation`: Publication, report number (`G22-CG-ISD`), page range, and official URL.
   - `unprovidedPowersStrictlyUnknown`: Explicit invariant (`true`) ensuring no unprovided powers are fabricated.

---

## 5. Authoritative Manifests

The compiler produces 6 authoritative summary manifests in `data/government_universe/manifests/`:

1. **`national_universe_manifest.json`**: National totals across all 50 states + DC ($90,888$ total federal, state, and local units: $1$ federal, $50$ state governments, and $90,837$ local governments).
2. **`state_universe_manifest.json`**: Comprehensive 51-jurisdiction matrix with exact county, municipal, township, special district, and school district counts derived directly from Census Table 2 and Table 9.
3. **`type_classification_manifest.json`**: Definitions, independent status criteria, and national counts by class.
4. **`special_districts_functional_manifest.json`**: Functional categorization of all 39,555 special districts ($32,768$ single-function and $6,787$ multi-function) from Census Table 8.
5. **`school_systems_manifest.json`**: National and state-by-state matrix of $12,546$ independent school districts ($90.5\%$) versus $1,313$ dependent school systems ($9.5\%$) from Census Table 9.
6. **`historical_count_series_manifest.json`**: 70-year historical series from 1952 to 2022 documenting the $81.4\%$ drop in school districts through consolidation and the tripling of special districts.

---

## 6. CLI Commands

| Command                                | Action                                                                              |
| :------------------------------------- | :---------------------------------------------------------------------------------- |
| `npm run compile:government-universe`  | Compiles raw source inputs into deterministic normalized corpus files.              |
| `npm run manifest:government-universe` | Generates all 6 summary manifests with SHA-256 integrity checksums.                 |
| `npm run validate:government-universe` | Executes full integrity validation: ID uniqueness, duplicate names, and invariants. |
| `npm run test:government-universe`     | Runs automated Vitest test suite (`tests/government_universe.test.ts`).             |
