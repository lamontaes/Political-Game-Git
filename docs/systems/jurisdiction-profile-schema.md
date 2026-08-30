# Jurisdiction Profile Schema & Validation Foundation

## Purpose & Scope

This domain specification defines the versioned, source-grounded national **Jurisdiction Profile Schema + Validator Foundation**.

It establishes the contract that future parallel state workers (or Jules workers) must follow to populate jurisdictional facts (for U.S. states, territories, counties, and municipalities) without hard-coding assumptions or inventing ungrounded facts.

**Key Design Principles:**

1. **No Hard-coded State Fact Databases:** Zero Kentucky, Nebraska, or 50-state fact data is hardcoded in this foundation task.
2. **Strict Provenance:** Every substantive value requires complete provenance metadata.
3. **Explicit State Discrimination:** Values must explicitly distinguish `KNOWN`, `UNKNOWN`, `NOT_APPLICABLE`, `CONFLICTING`, and `HISTORICAL`.
4. **Unknown Cannot Become False or Zero:** `UNKNOWN` is an explicit uncoerced state object. It must never evaluate to `false`, `0`, `""`, or `null`.
5. **Pure TypeScript Engine Boundary:** Fits entirely within `src/simulation/` as pure TypeScript, runnable without DOM, React, UI, or external dependencies.

---

## Schema Architecture (`src/simulation/jurisdiction-profile-types.ts`)

### 1. `SourcedValue<T>` Provenance Wrapper

Every substantive field in a Jurisdiction Profile is wrapped in a `SourcedValue<T>`:

```typescript
export type SourcedValue<T> =
  | KnownValue<T>
  | UnknownValue
  | NotApplicableValue
  | ConflictingValue<T>
  | HistoricalValue<T>;
```

#### States:

- **`KNOWN`**: The value is verified and grounded in an authoritative source.
  - Requires: `value: T`, `provenance: ProvenanceRecord`.
- **`UNKNOWN`**: Unresearched or unverified value.
  - Requires: `state: "UNKNOWN"`, optional `reason?: string`.
  - **CRITICAL:** Must remain `{ state: "UNKNOWN" }`. Do NOT populate default `false` or `0`.
- **`NOT_APPLICABLE`**: The field does not apply to this jurisdiction type or governance model.
  - Requires: `state: "NOT_APPLICABLE"`, `reason: string`.
- **`CONFLICTING`**: Multiple authoritative sources contradict each other.
  - Requires: `state: "CONFLICTING"`, `claims: readonly ConflictingSourceClaim<T>[]` (minimum 2 claims with independent provenance), optional `conflictNotes?: string`.
- **`HISTORICAL`**: Value was superseded by a constitutional, statutory, or charter reform.
  - Requires: `state: "HISTORICAL"`, `value: T`, `effectiveStart: IsoDate`, `effectiveEnd: IsoDate`, `provenance: ProvenanceRecord`, optional `supersedingReason?: string`.

### 2. Provenance Record (`ProvenanceRecord`)

```typescript
export interface ProvenanceRecord {
  readonly sourceId: string;
  readonly authoritativeUrl: string; // Must be valid http, https, urn, or file URL
  readonly publisher: string;
  readonly effectiveDate: IsoDate; // YYYY-MM-DD
  readonly locator: string; // Article, section, table, or record locator
  readonly sourceClassification: SourceClassification;
  readonly retrievedAt?: IsoDate;
  readonly notes?: string;
}
```

Allowed `SourceClassification` values:

- `CONSTITUTIONAL_PROVISION`
- `STATUTORY_CODE`
- `ADMINISTRATIVE_RULE`
- `JUDICIAL_OPINION`
- `OFFICIAL_ELECTION_AUTHORITY`
- `CENSUS_FEDERAL_RECORD`
- `EMPIRICAL_ACADEMIC`
- `HISTORICAL_ARCHIVAL`

---

## Profile Structure

A complete `JurisdictionProfile` contains 5 core domain sections + metadata:

1. **`IDENTITY`**:
   - `jurisdictionId`, `officialName`, `jurisdictionType` (FEDERAL, STATE, TERRITORY, TRIBAL, COUNTY_EQUIVALENT, MUNICIPALITY, TOWNSHIP, SPECIAL_DISTRICT), `postalAbbreviation`, `censusFips`, `parentJurisdictionId`, `effectiveDate`, `vintageDate`.
2. **`INSTITUTIONS`**:
   - `executiveStructure` (ExecutiveModel, head of government title, plural executive boolean), `legislativeChamberStructure` (BICAMERAL, UNICAMERAL, COMMISSION, TOWN_MEETING; chamber seat counts and apportionment), `judicialStructuralSummary` (High court name, court tiers), `constitutionalStatutoryOfficeTypes`.
3. **`OFFICES`**:
   - Array of `JurisdictionOfficeProfile`: `officeId`, `officeType`, `selectionMethod`, `termLengthYears`, `termLimits`, `staggerRules`, `eligibilityRules` (minimum age, residency, citizenship, legal citations).
4. **`ELECTION_STRUCTURE`**:
   - `ordinaryCycleCadence`, `primaryElectionType`, `generalElectionType`, `structuralTimingRules` (e.g. 1st Tuesday after 1st Monday in Nov), `ruleSourceReferences`.
5. **`LOCAL_GOVERNMENT_STRUCTURE`**:
   - `countyModel`, `municipalClassifications`, `townshipStructure`, `homeRuleConcepts`, `stateSpecificClassifications`.

---

## Validator (`src/simulation/jurisdiction-profile-validator.ts`)

Call `validateJurisdictionProfile(profile)` to deterministically validate any jurisdiction profile object.

The validator checks:

- Profile structure & `schemaVersion === "1.0.0"`.
- `isSynthetic` explicit boolean flag.
- Valid `SourcedValue` state discrimination (`KNOWN`, `UNKNOWN`, `NOT_APPLICABLE`, `CONFLICTING`, `HISTORICAL`).
- Rejection of coerced `UNKNOWN` values (`value: false` or `value: 0`).
- Valid ISO dates (`YYYY-MM-DD`) via `makeIsoDate`.
- Valid authoritative URLs (scheme check).
- Non-empty provenance locators (exact article/section/table/record).
- Minimum 2 claims for `CONFLICTING` states.
- Legislative chamber model consistency (BICAMERAL = 2 chambers, UNICAMERAL = 1 chamber).

---

## Synthetic Fixtures (`src/simulation/jurisdiction-profile-fixtures.ts`)

Four tiny synthetic fixtures are provided for testing and validation. All fixtures are explicitly marked `isSynthetic: true` and contain `SYNTHETIC` labels:

1. **`SYNTHETIC_BICAMERAL_STATE_PROFILE`**: Fictional bicameral state ("Synthetic Commonwealth of Alpha") with Governor, Senate (30 seats), and House (60 seats).
2. **`SYNTHETIC_UNICAMERAL_STATE_PROFILE`**: Fictional unicameral state ("Synthetic State of Beta") with nonpartisan 49-seat Senate and staggered 4-year terms.
3. **`SYNTHETIC_ABSENT_UNKNOWN_PROFILE`**: Fictional county ("Synthetic County of Gamma") demonstrating `UNKNOWN` postal abbreviations, court structures, office stagger rules, and `NOT_APPLICABLE` legislative chambers.
4. **`SYNTHETIC_HISTORICAL_TRANSITION_PROFILE`**: Fictional city ("Synthetic City of Delta") demonstrating `HISTORICAL` superseded bicameral municipal council structure replaced by unicameral council-manager charter in 2010.

---

## Instructions for Future State-Population Jules Workers

When assigned to populate real jurisdictional facts for a state (e.g. Kentucky, Ohio, Texas, Nebraska):

1. **Do NOT modify simulation core or UI presentation.**
2. **Create a separate data file** under `data/jurisdictions/<state_slug>.ts` or `src/simulation/jurisdictions/<state_slug>.ts`.
3. **Set `isSynthetic: false`**.
4. **Research Authoritative Legal & Empirical Sources:**
   - State Constitution citations for executive/legislative/judicial structure.
   - Statutory codes for election timing, term limits, and local government classifications.
   - Census/FIPS codes from official U.S. Census Bureau records.
5. **Every `KNOWN` value MUST include complete provenance:**
   - `sourceId`: Unique source identifier.
   - `authoritativeUrl`: Direct URL to statutory code, state constitution, or census portal.
   - `publisher`: Official government publisher (e.g., "Kentucky General Assembly", "Nebraska Legislature").
   - `effectiveDate`: Vintage or enactment ISO date (`YYYY-MM-DD`).
   - `locator`: Exact article, section, chapter, table, or record number (e.g., "Ky. Const. § 69").
   - `sourceClassification`: Valid classification enum.
6. **Preserve Unknowns Honestly:**
   - If an office eligibility rule or local township classification is unresearched or absent, use `{ state: "UNKNOWN", reason: "..." }`.
   - **NEVER** substitute `0`, `false`, `""`, or `null` for an unresearched value.
7. **Use `NOT_APPLICABLE` for non-existent structures:**
   - E.g. Township structure in states without townships must be `{ state: "NOT_APPLICABLE", reason: "State does not establish township governments." }`.
8. **Run the Validator:**
   - Run `validateJurisdictionProfile(myNewStateProfile)` in your state unit test and verify `isValid === true` with 0 errors.
