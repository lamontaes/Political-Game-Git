# National Legislative Source Corpus System

## 1. Overview & Purpose

The **National Legislative Source Corpus** is the foundational, data-driven legislative source layer for the Political Game. It provides deterministic ingestion, normalization, lifecycle classification, official-reference retention, and validation tooling for legislative data from across all 50 states, Washington D.C., Puerto Rico, and the United States Congress.

This system serves as the underlying evidence base for future **Stage 7 Jurisdiction Packs** and **Stage 10 Legislative Gameplay**.

## 2. Architectural Boundary & Product Principles

### Boundary Contract

- **Source Layer, Not a Simulator**: This system does not implement mutable legislative chambers, NPC voting behavior, governor decision logic, committee scheduling gameplay, or player legislative UI.
- **Evidence, Not Canonical Law**: In accordance with **Game Constitution Principle 25** ("Real-world starting data and simulated save-world history are distinct data domains"), source records capture real-world provider and official evidence with explicit provenance, as-of timestamps, and retained official legislature URLs. Simulated saves later branch from or consume these records without confusing provider data for mutable simulated law.
- **Strict Decoupling**: Pure TypeScript implementation located in `src/legislative_corpus/` and `scripts/legislative-corpus/`. Completely decoupled from `src/simulation/`.

## 3. Provider Adapters

### Primary Provider: Open States / Plural Open

- **Coverage**: All 50 states, District of Columbia, Puerto Rico, and Congress.
- **Payloads**: Ingests JSON bulk export data and API v3 records.
- **Provider Classifications**: Standardized provider action classifications (e.g. `introduction`, `reading-1/2/3`, `passage`, `failure`, `became-law`, `executive-signature`, `executive-veto`, `veto-override-passage`, `amendment-passage`) are captured as provider-specific metadata and evaluated by the conservative lifecycle classifier.

### Secondary Provider: LegiScan

- **Coverage**: 50 states and Congress.
- **Payloads**: Ingests LegiScan dataset JSON/CSV packages (bill history, roll calls, sponsors, texts).
- **Seam**: Pluggable provider seam with identical normalized source record output. If credentials are not configured in local environment, the adapter operates deterministically against local datasets and test fixtures.

## 4. Normalized Data Models

All normalized records adhere to strict schemas in `src/legislative_corpus/types.ts`:

1. **`LegislativeJurisdictionSourceRecord`**: Stable internal source key (`us_ky`, `us_ne`, `us_dc`, `us_pr`, `us_fed`), provider, name, classification (`state`, `federal`, `territory`, `district`), chamber structure (`bicameral`, `nonpartisan_unicameral`, `council`), official legislative URL, retrieval timestamp, and provenance.
2. **`LegislativeSessionSourceRecord`**: Stable session ID (`us_ky_2021rs`), jurisdiction key, provider session ID, name, start/end dates, classification (`regular`, `special`, `extraordinary`), session state, and sine die status.
3. **`LegislativeMeasureSourceRecord`**: Stable measure ID (`us_ky_2021rs_hb497`), identifier (`HB 497`), title, classification (`bill`, `resolution`, etc.), chamber origin, official bill URL, provider URL, raw provider status, derived lifecycle summary, subjects, and provenance.
4. **`LegislativeTextVersionSourceRecord`**: Version label, date, document URL, official document URL, media type, and content hash.
5. **`LegislativeActionSourceRecord`**: Chronological sequence index, action date, acting body, provider classifications, raw description, source URL, and official URL.
6. **`LegislativeVoteSourceRecord`**: Motion text, chamber, date, passed boolean, yeas, nays, other counts, individual roll call entries, official vote URL, and provenance.
7. **`LegislativeSponsorSourceRecord`**: Person provider ID, sponsor name, sponsorship type (`primary`, `cosponsor`, `author`), and primary flag.

## 5. Conservative Lifecycle Interpretation

Measures are never reduced to a simplistic binary `PASS` | `FAIL`. The classifier (`inferLegislativeLifecycle`) derives a source-grounded lifecycle status from actions, votes, and session state:

| Status                     | Definition & Invariants                                                                                                                                                  |
| :------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `introduced`               | Measure filed or introduced; initial stage before committee action or floor debate.                                                                                      |
| `active`                   | Measure has advanced in committee, second reading, or floor amendments.                                                                                                  |
| `chamber-passed`           | Passed one chamber in a bicameral legislature; awaiting second chamber or executive action.                                                                              |
| `became-law`               | **Affirmative evidence required**: signed by executive, became law without signature, or veto overridden by legislature. Retains chapter/act ID (e.g. Acts Chapter 182). |
| `vetoed`                   | Executive veto recorded without a subsequent override passage. Distinguishes line-item vs full veto.                                                                     |
| `explicitly-failed`        | **Affirmative defeat evidence required**: floor vote defeated on third reading, killed in committee, or veto override failed.                                            |
| `withdrawn`                | Withdrawn by author or sponsor.                                                                                                                                          |
| `session-ended-unresolved` | Session adjourned sine die without affirmative enactment, explicit defeat, or withdrawal. Preserves unresolved status rather than fabricating failure or passage.        |
| `unknown`                  | No source actions or contradictory evidence recorded.                                                                                                                    |

## 6. Official-Source Retention & Provenance

- **No Fabrications**: Missing official URLs or dates remain `null` / unrecorded. No plausible guesses are generated.
- **Retained URLs**: Underlying state legislature URLs (`apps.legislature.ky.gov`, `nebraskalegislature.gov`, `lims.dccouncil.gov`, `sutra.oslpr.org`) are extracted and preserved.
- **SHA-256 Checksums**: Every record and compiled package contains deterministic SHA-256 provenance hashes and schema versions.

## 7. Research Pack Validation Seam

The research validator (`src/legislative_corpus/research_validator.ts`) compares manually researched episodes against normalized corpus records to prevent unsupported research prose from entering the game:

- **Kentucky 2021 HB 497 Regression Benchmark**:
  - House Final Passage: 95-0 (2021-03-01)
  - Senate Final Passage: 35-0 (2021-03-12)
  - House Concurrence: 91-0 (2021-03-15)
  - Signed by Governor: 2021-04-05
  - Acts Chapter: Chapter 182
- **Validation Engine**: Automatically detects discrepancies in vote counts, signing dates, session types, and chapter identifiers with severity tagging (`critical_contradiction`, `mismatch`).

## 8. CLI Tooling & Commands

| Command                                 | Action                                                                                                                                 |
| :-------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run compile:legislative`           | Compiles raw/fixture provider payloads into deterministic normalized corpus (`data/legislative_source/corpus/normalized_corpus.json`). |
| `npm run manifest:legislative`          | Generates national coverage manifest for all 53 jurisdictions (`data/legislative_source/manifests/national_coverage_manifest.json`).   |
| `npm run validate:legislative-research` | Runs research episode comparison against corpus truth.                                                                                 |
| `npm run validate:legislative`          | Executes full corpus integrity, linking, and research validation suite.                                                                |
| `npm run test:legislative`              | Executes automated Vitest suite (`tests/legislative_corpus.test.ts`).                                                                  |
