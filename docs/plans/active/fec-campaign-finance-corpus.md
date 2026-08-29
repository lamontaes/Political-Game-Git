# Plan: FEC Federal Campaign-Finance Source Corpus

## Status

- **State**: Completed / Verified
- **Branch**: `antigravity/fec-campaign-finance-corpus`
- **Worktree**: `/Users/lamontae/Documents/Political-Game-FEC-Campaign-Finance`
- **Base Commit**: `d5c488a89c33ab425a276eec2112f78083ba6d7e` (origin/main)

## Objective

Create normalized Federal Election Commission (OpenFEC) campaign-finance source models, source-vs-synthetic observation classification, amendment tracking mechanics, empirical calibration metrics, and representative fixtures to answer future simulation questions without modifying Slice E mechanics or mixing synthetic test fixtures into empirical calibration.

## Scope & Boundary

1. **Zero Simulation Changes**: `src/simulation/` remains untouched.
2. **Normalized Models**: Candidate, Committee, Relationship, Filing, Itemized Receipt, Itemized Disbursement, Loan, Debt, Independent Expenditure, and Calibration Profile.
3. **Source vs Synthetic Classification**: Explicit `recordClass` across all observations (`actual_openfec`, `transformed_official`, `synthetic_fixture`) with isolation in empirical calibration calculations.
4. **Amendment Resolution**: Active superseding report selection prevents double counting while preserving raw filing audit history.
5. **Representative Fixtures**: House (KY-06, KY-04, KY-03), Senate (KY Statewide), Presidential (Form 3P), Party & PAC (Form 3X), Super PAC Independent Expenditures (Form 24 / Schedule E), and Synthetic test scenarios.
6. **No Secrets**: Strictly keyless default (`DEMO_KEY` fallback via environment variable).

## Deliverables

- `src/campaign_finance/`: types, IDs, amendment resolver, calibration engine, provider adapter, manifest, validator, compiler.
- `data/campaign_finance/`: fixtures, compiled corpus, manifest, calibration dataset, synthetic test calibration.
- `scripts/campaign-finance/`: compile, validate, and calibration inspection CLI tools.
- `docs/systems/campaign_finance_corpus.md`: technical contract, amendment mechanics, and known FEC dataset limitations.
- `tests/campaign_finance.test.ts`: comprehensive test suite with 26 unit tests.
