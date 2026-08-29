# Local Economy & Labor-Market Source Compiler Plan

## Summary

Implement a normalized, deterministic, checksummed source corpus compiler for official regional economic data from the **U.S. Bureau of Economic Analysis (BEA Regional Accounts)** and **U.S. Bureau of Labor Statistics (BLS QCEW)**.

## Deliverables

1. **Core Type Models & Engine (`src/local_economy_corpus/`)**:
   - Explicit price basis (`nominal` vs `real` chained dollars with reference year).
   - Strict observation cadence (`annual`, `quarterly`, `monthly`) preserving raw source fidelity without fake monthly interpolation.
   - Surviving QCEW confidentiality & suppression codes (`N`, `D`, `C`) with `value: null`.
   - Distinct vintage and revision lineage tracking (`preliminary`, `revised`, `comprehensive_benchmark`).
   - NAICS 2017/2022 taxonomy and hierarchy rollups.
   - Geographic FIPS normalization and validation.
   - Calibration query engine calculating Location Quotients (LQs), transfer receipts dependency, proprietor employment shares, and real GDP growth.
2. **Raw Fixtures (`data/local_economy_source/fixtures/`)**:
   - Lexington / Fayette County, KY (`21067`) core anchor jurisdiction.
   - Martin County, KY (`21159`) Appalachian coal / transfer dependency archetype.
   - Wayne County, MI (`26163`) Detroit manufacturing archetype.
   - Santa Clara County, CA (`06085`) Silicon Valley high-tech archetype.
   - Midland County, TX (`48329`) Permian Basin oil extraction archetype.
   - Miami-Dade County, FL (`12086`) Tourism & services archetype.
   - State and National baselines: Kentucky (`21000`), California (`06000`), Michigan (`26000`), Texas (`48000`), United States (`00000`).
   - Revision fixtures demonstrating BEA preliminary vs revised vs comprehensive benchmark isolation.
3. **Compiled Corpus & Manifest (`data/local_economy_source/`)**:
   - `corpus/normalized_economy_corpus.json`
   - `manifests/local_economy_manifest.json`
4. **CLI Tools (`scripts/local-economy-corpus/`)**:
   - `cli-compile.ts`, `cli-manifest.ts`, `cli-validate.ts`, `cli-calibrate.ts`.
5. **System Documentation & Tests**:
   - `docs/systems/local-economy-labor-data.md`
   - `tests/local_economy_corpus.test.ts`
