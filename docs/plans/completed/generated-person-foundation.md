# Generated Person Identity and Appearance Foundation Plan

## Goal

Build the deterministic generated-person substrate that future simulations, visual assets, and stress testing will use. Replace tiny hardcoded name lists with a versioned, diverse starter corpus; replace crude flat integer ages with exact date-of-birth arithmetic; decouple person appearance ownership from scene anchors; and provide multi-seed developer stress tooling.

## Key Changes

1. **Versioned Names Foundation (`src/simulation/names-data.ts`)**:
   - Starter corpus (`names-v1`): 320 given names, 320 family names (102,400 combinations).
   - Provenance & License: U.S. Census Bureau Demographic Data & Social Security Administration Open Records (Public Domain / CC0).
   - Preserved `demo-names-v4` for legacy Stage 6.5 demo fixture compatibility.
   - Non-demographic: no inference of race, ethnicity, sex, gender, religion, ideology, or appearance from name strings.

2. **Person-Owned Appearance Identity (`src/simulation/person-appearance.ts`)**:
   - `PersonAppearance { seed: string, recipeVersion: string }`.
   - Appearance seed derived deterministically from person identity seed.
   - Scene anchors own `{ position, contact, depth, occlusion, sceneTransform }` without owning the person's body or appearance identity.

3. **Date of Birth & Age Foundation (`src/simulation/people.ts`, `src/simulation/types.ts`)**:
   - Canonical age derived from birthDate + simulation currentDate via `ageOnDate()`.
   - Production profile: Plausible working-age distribution (21–75) with exact birthday calculations.
   - Stress profile: Deliberately exercises young adults (18), seniors (88), birthday today, birthday tomorrow, birthday yesterday, and Feb 29 leap birthdays.

4. **Multi-Seed Developer Stress Harness (`src/simulation/person-stress-harness.ts`, `src/cli/stress-persons.ts`)**:
   - Programmatic API `runPersonStressHarness()` and CLI command `npm run stress:persons`.
   - Aggregates population statistics, name and appearance uniqueness/collisions, and age brackets.

5. **Validation & Verification**:
   - 16/16 test matrix requirements verified in `src/simulation/person-foundation.test.ts` and `src/simulation/person-stress-harness.test.ts`.
   - Full repository validation passed cleanly.
