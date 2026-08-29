# Election Administration and Participation Source Corpus

## 1. Overview & Purpose

The **Election Administration and Participation Source Corpus** (`src/election_admin/` and `data/election_administration/`) is the foundational observational evidence layer for election administration, procedures, voting technology, and voter participation in the Political Game.

This system ingests, normalizes, validates, and indexes primary data from:
1. **U.S. Election Assistance Commission (EAC)**:
   - **Election Administration and Voting Survey (EAVS)** (national, state, and local administrative counts).
   - **EAVS Policy Survey** (state election statutes, administration structures, rules, and procedures).
2. **U.S. Census Bureau**:
   - **Current Population Survey (CPS) Voting and Registration Supplement** (demographic sample estimates, reported registration/voting rates, voting methods, reasons for not voting).
   - **Historical Turnout Time Series (1964–2024)** (longitudinal administrative vs. survey turnout comparison).

This system provides the empirical benchmark layer for future **Stage 7 Jurisdiction Packs**, **Stage 8 Quantitative Policy**, and **Stage 11 General Election Administration**.

---

## 2. Architectural Boundary & Product Principles

### Boundary Contract

- **Observational Evidence, Not a Simulator**: This system does not implement mutable election contests, candidate campaigns, voter behavior simulation, or outcome generation. The existing `src/simulation/election-contests.ts` substrate remains strictly untouched.
- **Principle 25 Adherence ("Real-world starting data and simulated save-world history are distinct data domains")**: Real-world election administration data and survey benchmarks are captured with explicit provenance, as-of timestamps, and source URLs. Simulated worlds consume or calibrate against these records without confusing historical survey estimates for mutable simulation state.
- **Strict Decoupling**: All compiler logic resides in pure TypeScript modules under `src/election_admin/` and CLI tooling in `scripts/election-admin/`. Zero imports from `src/simulation/` or React UI components.
- **No Individual Voter Inferences**: No party preferences, candidate choices, or ideological attributions are imputed into demographic participation benchmarks.

---

## 3. Critical Semantic Invariants

### Invariant 1: EAVS Administrative Counts != CPS Survey Estimates

Administrative counts and survey estimates represent fundamentally different data domains:

| Dimension | EAC EAVS Administrative Counts | Census CPS Survey Estimates |
| :--- | :--- | :--- |
| **Source Type** | `administrative_official` | `survey_sample_estimate` |
| **Data Universe** | Official records of registered voters and certified ballots cast / counted | Weighted sample of the civilian non-institutional voting-age population (`VAP` / `CVAP`) |
| **Error Modes** | Administrative nonresponse, reporting differences across jurisdictions | Sampling error, nonresponse bias, social desirability overreporting |
| **Representation** | Exact tallies (e.g. 1,502,420 ballots counted in KY) | Estimated rates with Standard Error & 90% Margin of Error (e.g. 52.2% ± 0.43% nationally) |

**Rule**: Administrative counts and survey estimates are stored in distinct record structures (`EavsJurisdictionRecord` vs `CpsCalibrationRecord`). They are never coerced, merged, or forced to match.

### Invariant 2: No Missing-as-Zero Preservation

- Missing values, uncollected metrics, or jurisdictions that did not report must remain `null` (or `undefined`), accompanied by explicit `SourceCompletenessFlag` values (`"complete"`, `"partial"`, `"item_nonresponse"`, `"unreported"`, `"not_applicable"`).
- Missing data is never silently converted to `0`.

### Invariant 3: Preservation of Survey Methodology

CPS calibration records preserve:
- Survey weights (`PWSSWGT` / supplement person weights).
- Universe specification (`voting_age_population` vs `citizen_voting_age_population`).
- Unweighted sample size ($N$).
- Standard Errors (SE) and 90% Margins of Error ($\text{MOE} = 1.645 \times \text{SE}$).
- Cross-tabulated demographic breakdowns (age, sex, race/Hispanic origin, education, income, duration of residence).
- Structured categories for voting methods, registration methods, and reasons for not voting / registering.

### Invariant 4: Year & Vintage Safety

- All records maintain explicit election/survey cycle years (e.g. 2020, 2022, 2024).
- Dates use ISO 8601 formatting (`YYYY-MM-DD`).
- Historical series are monotonically strictly increasing in year.

### Invariant 5: Geographic FIPS Hierarchy

- Stable IDs are deterministic: `us_ky` (state), `us_ky_21067` (Fayette County), `us_or_41051` (Multnomah County), `us_pr_72127` (San Juan).
- County FIPS codes are 5 digits and strictly match their parent state 2-digit FIPS prefix.

---

## 4. Normalized Data Schemas

1. **`EavsJurisdictionRecord`**:
   - **Section A (Registration)**: Active, inactive, total registered, new registrations by channel (DMV, online, mail, in-person), removals by reason (moved, deceased, felony, inactivity).
   - **Section B (UOCAVA)**: Military and overseas civilian ballots transmitted, returned, counted, rejected.
   - **Section C (Mail Voting)**: Civilian mail ballots transmitted, returned, counted, rejected, and rejection reasons (late, missing signature, signature mismatch, witness/notary).
   - **Section D (In-Person & Polling)**: In-person election day votes, in-person early votes, mail votes, physical polling places, early voting centers, vote centers, active precincts, poll worker counts, age distribution, and recruitment difficulty.
   - **Section E (Provisional)**: Provisional ballots cast, counted in full, counted in part, rejected, rejection reasons.
   - **Section F (Voting Technology)**: Primary voting system (optical scan, BMD, DRE with/without VVPAT), electronic poll book deployment, vendor tracking.
2. **`PolicySurveyRecord`**:
   - State election laws: registration deadlines, automatic voter registration (AVR), online voter registration (OVR), same-day registration (SDR).
   - Voter ID requirements (strict photo, non-strict photo, non-photo ID, signature-only).
   - In-person early voting windows and mandatory weekend voting.
   - Mail voting models (universal all-mail vs. no-excuse absentee vs. excuse-required), ballot drop box rules, cure periods.
   - Post-election audit mandates (risk-limiting audit RLA, traditional percentage audit, procedural audit).
   - Recount rules and thresholds.
   - Felon re-enfranchisement timing and policies.
   - State and local election administrative governance structure.
3. **`CpsCalibrationRecord`**:
   - Universe specifications (`VAP`, `CVAP`), sample sizes, weighting variables.
   - Reported registration and voting rates with SE and 90% MOE.
   - Demographic cross-tabulations across age, sex, race/Hispanic origin, educational attainment, family income, duration of residence.
   - Voting methods (Election Day, early in-person, by mail).
   - Registration methods (DMV, mail, in-person, online, same-day).
   - Reasons for not voting / not registering.
4. **`HistoricalTurnoutSeriesRecord`**:
   - Longitudinal 1964–2024 presidential and midterm turnout comparisons, isolating certified administrative tallies from CPS survey estimates.
5. **`ElectionAdminManifest`**:
   - Jurisdiction coverage summaries, completeness flags, and SHA-256 partition checksums.

---

## 5. Primary Fixture Coverage

| Jurisdiction | Level | Administrative & Policy Model | Key Fixture Files |
| :--- | :--- | :--- | :--- |
| **Kentucky** (`us_ky`) | State | SB 2 strict photo ID, HB 574 3-day early in-person voting, excuse-required absentee, County Clerk administration | `eavs_kentucky.json`, `policy_survey_kentucky.json`, `cps_kentucky_2022.json`, `historical_kentucky_turnout_1980_2024.json` |
| **Fayette County, KY** (`21067`) | County | Urban county / Lexington-Fayette consolidated government | `eavs_kentucky.json` |
| **Jefferson County, KY** (`21111`) | County | Louisville Metro / largest county in KY | `eavs_kentucky.json` |
| **Pike County, KY** (`21195`) | County | Rural Appalachian county / Eastern Kentucky | `eavs_kentucky.json` |
| **Oregon** (`us_or`) | State | Universal Vote-by-Mail, Automatic Voter Registration (Motor Voter), prepaid postage, signature cure | `eavs_oregon.json`, `policy_survey_oregon.json`, `cps_oregon_2022.json` |
| **Multnomah County, OR** (`41051`) | County | Portland metro / high-density mail voting | `eavs_oregon.json` |
| **Lane County, OR** (`41039`) | County | Eugene / university community mail voting | `eavs_oregon.json` |
| **Wisconsin** (`us_wi`) | State | Decentralized 1,850+ municipal clerks, same-day registration at polls, WEC bipartite commission | `eavs_wisconsin.json`, `policy_survey_wisconsin.json`, `cps_wisconsin_2022.json` |
| **Dane County, WI** (`55025`) | County | Madison / high-turnout county | `eavs_wisconsin.json` |
| **Milwaukee County, WI** (`55079`) | County | Urban high-volume municipal administration | `eavs_wisconsin.json` |
| **Georgia** (`us_ga`) | State | SB 202 photo ID for mail voting, 3-week mandatory early voting with 2 mandatory Saturdays, mandatory RLAs, BMD paper trail | `eavs_georgia.json`, `policy_survey_georgia.json`, `cps_georgia_2022.json` |
| **Fulton County, GA** (`13121`) | County | Atlanta / large urban county administration | `eavs_georgia.json` |
| **Puerto Rico** (`us_pr`) | Territory | Comisión Estatal de Elecciones (CEE), single-event registration, prison enfranchisement, territorial cycle | `eavs_puerto_rico.json`, `policy_survey_puerto_rico.json`, `cps_puerto_rico_2022.json` |
| **San Juan, PR** (`72127`) | Municipio | Capital city territorial election administration | `eavs_puerto_rico.json` |
| **United States** (`us_fed`) | National | National CPS 2022 benchmark & 1964–2024 longitudinal historical turnout series | `cps_national_2022.json`, `historical_national_turnout_1964_2024.json` |

---

## 6. CLI Tooling & Commands

| Command | Description |
| :--- | :--- |
| `npm run compile:election-admin` | Compiles raw fixtures into normalized JSON corpora under `data/election_administration/corpus/`. |
| `npm run manifest:election-admin` | Builds national and state coverage manifest under `data/election_administration/manifests/`. |
| `npm run validate:election-admin` | Executes full semantic invariant and schema integrity validation. |
| `npm run test:election-admin` | Runs the automated Vitest test suite (`tests/election_admin.test.ts`). |

---

## 7. Verification & Integrity Protocol

Every compiled corpus must satisfy:
1. **Zero Validation Errors**: Enforced by `validateElectionAdminCorpus()`.
2. **Deterministic Reproducibility**: Repeated builds produce bit-for-bit identical SHA-256 hashes.
3. **Decoupling from Simulation**: Simulation tests in `src/simulation/election-contests.test.ts` must continue to pass without regression or coupling.
