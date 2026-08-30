# Jurisdiction Profile Foundation Plan

- Repository: lamontaes/Political-Game-Git
- Base SHA: `d5c488a89c33ab425a276eec2112f78083ba6d7e`
- Target Branch: `jules-jurisdiction-profile-foundation`

## Summary

This task creates the national jurisdiction-profile SCHEMA + VALIDATOR foundation in `src/simulation/`.
It establishes the versioned source-grounded contract for future parallel state workers to populate U.S. jurisdictional data without hard-coding assumptions or ungrounded facts.

## Delivered Artifacts

1. **Schema (`src/simulation/jurisdiction-profile-types.ts`)**:
   - `SourcedValue<T>` wrapper strictly supporting `KNOWN`, `UNKNOWN`, `NOT_APPLICABLE`, `CONFLICTING`, and `HISTORICAL` value states.
   - Enforces explicit `UNKNOWN` state object representation (prevents coercion to `false` or `0`).
   - Domain components for Identity, Institutions, Offices, Election Structure, and Local Government Structure.
   - Re-exported in `src/simulation/types.ts` and `src/simulation/index.ts`.

2. **Validator (`src/simulation/jurisdiction-profile-validator.ts`)**:
   - Deterministic structural and provenance validator (`validateJurisdictionProfile`).
   - Validates ISO dates, URLs, locators, source classifications, minimum 2 claims for conflicting states, and chamber model count consistency.

3. **Synthetic Fixtures (`src/simulation/jurisdiction-profile-fixtures.ts`)**:
   - 4 tiny synthetic profiles explicitly labeled `SYNTHETIC`:
     - `SYNTHETIC_BICAMERAL_STATE_PROFILE`
     - `SYNTHETIC_UNICAMERAL_STATE_PROFILE`
     - `SYNTHETIC_ABSENT_UNKNOWN_PROFILE`
     - `SYNTHETIC_HISTORICAL_TRANSITION_PROFILE`
   - Zero Kentucky, Nebraska, or 50-state facts hardcoded.

4. **Tests (`src/simulation/jurisdiction-profile.test.ts`)**:
   - Vitest suite confirming clean validation of synthetic fixtures, state discrimination, prevention of unknown coercion, conflicting claims count rules, URL/date validation, and chamber count checks.
   - Preserves purity boundary (`boundary.test.ts` passes).

5. **Documentation (`docs/systems/jurisdiction-profile-schema.md`)**:
   - Complete schema specification, validator rules, fixture descriptions, and step-by-step instructions for future state workers.
