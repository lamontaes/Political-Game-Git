# Federal Legislative Source Corpus

## 1. Overview & Purpose

The **Federal Legislative Source Corpus** provides a deterministic, reproducible, provider-specific historical and real-world legislative evidence layer for the United States Congress. Grounded in official **Congress.gov API** structures and **GovInfo API / package metadata**, this system normalizes congressional bills, resolutions, amendments, chronological actions, committee records, member sponsorships, House roll-call votes, text version identifiers, and official document references into cryptographically verified source datasets.

In accordance with **Game Constitution Principle 25** ("Real-world starting data and simulated save-world history are distinct data domains"), federal source corpus records represent immutable historical evidence with explicit provenance, as-of timestamps, and retained official government URLs (`congress.gov`, `govinfo.gov`, `clerk.house.gov`).

## 2. Core Architectural Principles

- **Provider-Specific Isolation**: Completely decoupled from state legislative schemas (e.g. Open States / LegiScan) and isolated from simulation semantics (`src/simulation/`). No forced unified legislative schema or shared runtime engine is imposed.
- **Strict Separation of Raw Provider Actions from Conservative Derived Lifecycles**: Raw Congress.gov action codes and textual descriptions are preserved verbatim alongside a deterministic, conservative derived lifecycle classifier grounded directly in federal constitutional mechanics (Article I, Section 7).
- **Preservation of Authentic Provider Shapes & Asymmetries**:
  - Ingests structured House roll-call vote tallies and member breakdowns from Congress.gov endpoints.
  - Preserves the authentic absence of unrecorded Senate vote shapes rather than inventing fabricated schemas.
- **Strict Cryptographic Integrity & Deduplication**:
  - Canonical JSON serialization and deterministic SHA-256 hashing on every record and compiled bundle.
  - Strict deduplication of amendments and text versions.
  - Guaranteed chronological ordering with 1-based sequential action indexing.
- **Zero Committed Secrets**: Fully operational offline via authentic test fixtures; API credentials (e.g., `api.data.gov` keys) are consumed strictly from local environment variables when making live upstream calls.

---

## 3. Data Models (`src/federal_legislative_corpus/types.ts`)

### `FederalMeasureRecord`

The primary federal legislative unit representing bills and resolutions across Congresses:

- `measureId`: Stable format `us_fed_{congress}_{type}_{number}` (e.g. `us_fed_117_hr_5376`).
- `congress`: Congress number (e.g. `116`, `117`, `118`).
- `measureType`: `hr` (House Bill), `s` (Senate Bill), `hjres` (House Joint Resolution), `sjres` (Senate Joint Resolution), `hconres` (House Concurrent Resolution), `sconres` (Senate Concurrent Resolution), `hres` (House Simple Resolution), `sres` (Senate Simple Resolution).
- `displayNumber`: Canonical formatted identifier (e.g. `H.R. 5376`, `S.J.Res. 30`, `H.Res. 5`).
- `title`: Official title of the measure.
- `originChamber`: `house` | `senate`.
- `introducedDate`: ISO-8601 date string.
- `policyArea` & `legislativeSubjects`: Standardized subject classifications.
- `sponsors`: Primary sponsors and cosponsors with Bioguide IDs, party, state, district, and withdrawal dates.
- `committees`: Referred and reporting committees with system codes and activity dates.
- `actions`: Chronological action records with sequence indexing and chamber tags.
- `amendments`: Associated House/Senate floor amendments.
- `textVersions`: Official document versions linked to GovInfo package IDs and download URLs.
- `houseVotes`: Linked House roll-call vote records.
- `publicLawNumber`: Official Public Law identifier where enacted (e.g. `Public Law 117-169`).
- `rawProviderStatus`: Verbatim last recorded provider action text.
- `derivedLifecycle`: Conservative derived lifecycle evaluation.
- `provenance`: Cryptographic record hash and retrieval metadata.

### `FederalAmendmentRecord`

- `amendmentId`: `us_fed_{congress}_{type}_{number}` (e.g. `us_fed_117_hamdt_150`, `us_fed_117_samdt_5488`).
- `amendmentType`: `hamdt` | `samdt`.
- `parentMeasureId`: Foreign key to parent measure.
- `chamber`: `house` | `senate`.
- `purpose` & `description`: Statement of purpose.
- `sponsorBioguideId`, `sponsorName`, `sponsorParty`, `sponsorState`.
- `isAgreedTo`, `isFailed`, `isWithdrawn`.

### `FederalTextVersionRecord`

- `versionCode`: Standardized code (`ih`, `is`, `rh`, `rs`, `eh`, `es`, `eas`, `eah`, `enr`, `pl`, `ath`, `ats`).
- `versionName`: Descriptive official name (`Introduced in House`, `Enrolled Bill`, `Public Law`).
- `govinfoPackageId`: Official package ID (e.g. `BILLS-117hr5376enr`, `PLAW-117publ169`).
- `formats`: Array of download formats (`xml`, `pdf`, `html`, `txt`) with computed SHA-256 hashes.

### `FederalHouseVoteRecord`

- `voteId`: `us_fed_{congress}_house_roll_{rollNumber}` (e.g. `us_fed_117_house_roll_420`).
- `congress`, `session`, `rollNumber`.
- `voteDate`, `question`, `result`, `voteType`.
- `totals`: `{ yea, nay, present, notVoting }`.
- `partyTotals`: Party-level breakdown.
- `memberVotes`: Member-level votes with Bioguide IDs and vote choices (`Yea`, `Nay`, `Present`, `Not Voting`).
- `officialSourceUrl`: Official Office of the Clerk URL (`https://clerk.house.gov/Votes/...`).

---

## 4. Conservative Derived Lifecycle Rules (`src/federal_legislative_corpus/lifecycle.ts`)

The lifecycle classifier evaluates chronological actions, text versions, and constitutional rules without procedural gameplay mechanics. It strictly distinguishes **action/motion-level failures** (such as a failed motion to suspend the rules, failed cloture, or failed veto override) from **true measure-level terminality** (such as explicit sponsor withdrawal or regular passage defeat without reconsideration):

| Derived Status                   | Criteria & Constitutional Rules                                                                                                                                                |
| :------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `introduced`                     | Filed or introduced in originating chamber; sponsor assigned.                                                                                                                  |
| `committee-activity`             | Referred to committee, hearings held, marked up, reported, or non-terminal procedural motion failed (e.g. motion to suspend rules and pass failed). Remains legally available. |
| `chamber-passed`                 | Passed originating chamber (House or Senate). For simple resolutions (`hres`, `sres`), represents final agreed chamber adoption.                                               |
| `both-chambers-passed`           | Agreed to by both House and Senate in identical form (or conference report adopted). For concurrent resolutions (`hconres`, `sconres`), represents final bicameral agreement.  |
| `presented-to-president`         | Enrolled bill/joint resolution delivered to the White House (Article I, Section 7). Never applied to simple or concurrent resolutions.                                         |
| `signed-became-law`              | **Affirmative evidence required**: signed by the President or designated with an official Public Law number (e.g. `Public Law 117-169`).                                       |
| `vetoed`                         | **Presidential veto evidenced**: returned to Congress with objections; override has not succeeded in both chambers.                                                            |
| `veto-override`                  | **Two-thirds supermajority override**: passed both House (2/3) and Senate (2/3) over presidential veto, enacting the measure into Public Law (e.g. `Public Law 116-283`).      |
| `explicitly-failed-or-withdrawn` | **Affirmative terminal disposition evidenced**: withdrawn by sponsor or defeated on regular floor passage question without reconsideration or subsequent passage.              |
| `unresolved`                     | Congress adjourned sine die without affirmative enactment, floor defeat, or withdrawal. Preserves unresolved status rather than fabricating failure.                           |

---

## 5. Fixture Suite (`data/federal_legislative_source/fixtures/`)

| Fixture File                            | Type                    | Key Invariant Tested                                                                                               |
| :-------------------------------------- | :---------------------- | :----------------------------------------------------------------------------------------------------------------- |
| `ordinary_enacted_law_hr5376.json`      | H.R. 5376 (117th)       | Enacted law progression, Senate amendment concurrence, Public Law 117-169 designation.                             |
| `veto_unoverridden_hjres30.json`        | H.J.Res. 30 (118th)     | Presidential veto sustained; House 2/3 override failed (219-200); retains `vetoed` status.                         |
| `veto_override_enacted_hr6395.json`     | H.R. 6395 (116th)       | Presidential veto overridden by House (322-87) and Senate (81-13); enacted as Public Law 116-283.                  |
| `failed_floor_vote_hr.json`             | H.R. 7217 (118th)       | Failed motion to suspend rules (250-180 < 2/3); classified as non-terminal `committee-activity` during session.    |
| `failed_suspension_then_passed_hr.json` | H.R. 7218 (118th)       | Regression fixture: failed suspension motion on 2024-02-06 followed by House passage on 2024-02-15 advances state. |
| `withdrawn_bill_fixture.json`           | H.R. 9999 (118th)       | Explicit sponsor withdrawal; classified as `explicitly-failed-or-withdrawn`.                                       |
| `unresolved_session_ended_s.json`       | S. 1234 (117th)         | Senate bill introduced and died in committee at sine die adjournment; classified as `unresolved`.                  |
| `amendment_fixture_hamdt.json`          | H.R. 4521 / H.Amdt. 150 | House floor amendment parsing and duplicate amendment deduplication verification.                                  |
| `house_roll_call_vote.json`             | House Roll 420 (117th)  | House roll-call vote member tally parsing, party breakdown, and absence of fabricated Senate vote shapes.          |
| `simple_resolution_hres.json`           | H.Res. 5 (118th)        | One-chamber simple resolution rules lifecycle (never presented to President).                                      |
| `concurrent_resolution_sconres.json`    | S.Con.Res. 14 (117th)   | Bicameral concurrent resolution lifecycle (agreed by both chambers, never goes to President).                      |
| `govinfo_package_sample.json`           | BILLS / PLAW packages   | GovInfo package summary ingestion, MODS metadata, and text version merging.                                        |

---

## 6. Tooling & CLI Commands

| Command                                | Action                                                                                                                      |
| :------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| `npm run compile:federal-legislative`  | Compiles raw/fixture payloads into deterministic corpus at `data/federal_legislative_source/corpus/normalized_corpus.json`. |
| `npm run manifest:federal-legislative` | Generates coverage manifest at `data/federal_legislative_source/manifests/federal_coverage_manifest.json`.                  |
| `npm run validate:federal-legislative` | Runs comprehensive cryptographic, structural, and semantic integrity checks.                                                |
| `npm run test:federal-legislative`     | Runs automated Vitest test suite (`tests/federal_legislative_corpus.test.ts`).                                              |
