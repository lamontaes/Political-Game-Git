# Packet 11 Implementation Plan: Official Federal Courts & Judicial Geography Identity Corpus

## Objective

Establish a source-backed, deterministic federal court structure and judicial geography identity corpus supporting:

- 13 Courts of Appeals (Circuits: 1st-11th, D.C. Circuit, Federal Circuit)
- 94 District Courts (Districts: 89 across 50 states, D.D.C., D.P.R., and 3 territorial district courts)
- District-to-circuit mapping
- 1:1 Bankruptcy court relationship for every judicial district (28 U.S.C. § 151)
- Divisional and courthouse structure as established by first-party federal judiciary sources (28 U.S.C. §§ 81-131)
- State and territory FIPS / USPS coverage
- Special handling for DC, Puerto Rico, Territorial Courts (Article III vs Organic Act Article I), and Federal Circuit subject-matter jurisdiction scope.

## Rules & Invariants

- No judge identities, appointments, or personal facts unless separately sourced in future packets.
- No caseload severity, ideology, decision probabilities, or political ratings.
- No inferring personal jurisdiction from residence alone or player eligibility for office.
- All facts sourced from 28 U.S.C. Chapter 3, Chapter 5, Chapter 11, § 1295, and Administrative Office of the U.S. Courts (uscourts.gov).
- Pinned SHA-256 source digests and retrieval timestamps.

## Implementation Steps

1. Create raw source manifest in `data/federal-courts/raw-sources.json`.
2. Create compiled corpus in `data/federal-courts/compiled-federal-courts.json`.
3. Implement domain models, loaders, validators, and query engine in `src/federal_courts/`.
4. Create compilation script `scripts/federal-courts-corpus/compile-federal-courts.ts` and validation script `scripts/federal-courts-corpus/validate-federal-courts.ts`.
5. Add npm scripts (`compile:federal-courts`, `validate:federal-courts`, `test:federal-courts`) to `package.json`.
6. Add unit test suite in `tests/federal_courts.test.ts`.
7. Create integration guide in `docs/judicial-geography-integration.md`.
