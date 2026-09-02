# U.S. Federal Courts & Judicial Geography Integration Guide

## Summary

Packet 11 establishes a first-party, source-backed federal court structure and judicial geography corpus (`data/federal-courts/compiled-federal-courts.json` and `src/federal_courts/`).

This corpus provides the canonical geographic and organizational hierarchy of the federal judiciary:

- **13 Courts of Appeals (Circuits)**: 1st through 11th Circuits, D.C. Circuit, and Federal Circuit.
- **94 District Courts (Judicial Districts)**: 89 state districts across 50 states, District of Columbia (D.D.C.), District of Puerto Rico (D.P.R.), and 3 Article I Territorial District Courts (Virgin Islands, Guam, Northern Mariana Islands).
- **94 U.S. Bankruptcy Courts**: 1:1 structural pairing with every federal judicial district (28 U.S.C. § 151).
- **Divisional & Courthouse Structure**: Official divisions and primary courthouse cities as defined by 28 U.S.C. §§ 81-131.
- **State & Territory Coverage**: Complete mapping to USPS two-letter state/territory codes and FIPS codes.

## Consuming the Corpus in Future Systems

### 1. Future Judicial Career & Experience Requirements

When modeling candidate background, law practice, or judicial career eligibility (e.g., federal clerkships, judicial nominations, bar admissions):

```ts
import {
  resolveDistrict,
  resolveCircuit,
  getDistrictsByState,
} from "./src/federal_courts";

// Check which federal judicial districts cover a given state (e.g. Texas)
const texasDistricts = getDistrictsByState("TX");
// Returns: [d-tx-nd, d-tx-sd, d-tx-ed, d-tx-wd]

// Resolve a district's parent circuit and bankruptcy court
const resolved = resolveDistrict("d-tx-nd");
// resolved.parent_circuit -> 5th Circuit (ca5)
// resolved.bankruptcy_court -> bk-d-tx-nd
```

### 2. Scene & Environment Context (Courthouses & Chambers)

When preparing scene contexts or environmental backgrounds for judicial chambers, court hearings, or oral arguments:

```ts
import { searchDivisions, getDistrictById } from "./src/federal_courts";

// Search for courthouse scene context by city
const dallasDiv = searchDivisions("Dallas");
// dallasDiv[0].division.primary_courthouse_name -> "Earle Cabell Federal Building and United States Courthouse"
```

### 3. Special Jurisdiction & Edge Cases

- **District of Columbia Circuit (`cadc`) & D.D.C. (`d-dc`)**: D.D.C. is an Article III district court; D.C. Circuit hears appeals from D.D.C. and federal agencies.
- **Federal Circuit (`cafed`)**: Has `is_specialized_nationwide: true` and 0 geographic trial districts. Hears nationwide subject-matter appeals (patents, claims against US, Court of Int'l Trade, MSPB).
- **Territorial District Courts (`d-vi`, `d-gu`, `d-mp`)**: Have `constitutional_basis: "ARTICLE_I_ORGANIC_ACT"`. Function as federal district courts for those territories and appeal to the 3rd Circuit (`d-vi`) and 9th Circuit (`d-gu`, `d-mp`).

## Guarantees & Non-Inferred Boundaries

- **No Judge Identities / Appointments**: Individual judges, vacancies, or nominations are not included here and must be sourced separately if modeled.
- **No Caseload Severity / Delay Stats**: Empirical caseload statistics are excluded from this structural identity layer.
- **No Ideology or Decision Probabilities**: Ideological ratings, political leanings, or decision odds are strictly prohibited.
- **No Automatic Personal Jurisdiction**: Living or working in a district does not automatically grant personal jurisdiction over a character or establish player office eligibility.
