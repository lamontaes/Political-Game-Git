# Government Finance & Employment Source Corpus Compiler

Status: **COMPLETED**
Branch: `antigravity/government-finance-employment-corpus`
Base Commit: `d5c488a89c33ab425a276eec2112f78083ba6d7e` (origin/main)
Worktree: `/Users/lamontae/Documents/Political-Game-Gov-Finance-Employment`

## Objective

Create an authoritative source corpus for U.S. Census Bureau **State and Local Government Finances (2017–2024)** and **Public Employment and Payroll (1992–2025)** capable of later calibrating real government budgets, debt, staffing, and payroll without modifying simulation mechanics.

## Invariants & Principles Followed

1. **Zero Simulation Mutation**: `src/simulation/` remains untouched.
2. **Methodology Preservation**: Distinguishes Census of Governments (complete enumeration) from Annual Survey (sample-based estimation).
3. **No Silently Interpolated Years**: Missing survey years remain missing.
4. **No Missing-As-Zero**: Omitted variables remain `null`/`undefined`; `0` strictly indicates explicitly reported zero.
5. **Historical Compatibility**: Definition changes carry visible compatibility flags (1997 reference month change, 1993 police and education splits).
6. **Finance Identities**: Enforces arithmetic accounting identities on all revenue, expenditure, and character categories.
7. **Deterministic Rebuild**: Same inputs produce byte-identical and hash-identical outputs.
8. **Credential Safety**: Uses `process.env.CENSUS_API_KEY` if present; otherwise keyless/offline mode; never fabricates credentials.

## Execution Summary

- [x] Defined source schemas and domain types (`src/government_finance_employment/types.ts`).
- [x] Implemented 14-digit Census Gov ID parser, validator, and stable identifier generator (`src/government_finance_employment/ids.ts`).
- [x] Authored code lists for Census Finance item codes, employment function codes, government type codes, and historical compatibility rules (`src/government_finance_employment/codes.ts`).
- [x] Implemented finance normalizer and arithmetic identity verification engine (`src/government_finance_employment/finance_normalizer.ts`).
- [x] Implemented employment normalizer, FTE calculator, and monthly payroll aggregator (`src/government_finance_employment/employment_normalizer.ts`).
- [x] Implemented Census API adapter with credential safety and Census downloadable file parser (`src/government_finance_employment/adapters/`).
- [x] Built manifest builder and checksum generator (`src/government_finance_employment/manifest_builder.ts`).
- [x] Built comprehensive validation engine (`src/government_finance_employment/validator.ts`).
- [x] Built end-to-end compiler (`src/government_finance_employment/compiler.ts`).
- [x] Authored authentic representative fixtures and longitudinal series (`data/government_finance_employment/`).
- [x] Implemented CLI tools and package commands (`scripts/government-finance-employment/` and `package.json`).
- [x] Wrote comprehensive automated tests (`tests/government_finance_employment.test.ts`).
- [x] Documented system architecture and calibration guidelines (`docs/systems/government_finance_employment_corpus.md`).
