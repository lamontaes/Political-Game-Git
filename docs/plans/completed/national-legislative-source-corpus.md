# National Legislative Source Corpus Compiler

Status: **COMPLETED**
Branch: `antigravity/national-legislative-source-corpus`

## Context & Purpose

Build the reusable national legislative source layer that future Stage 7 jurisdiction packs and Stage 10 legislative gameplay can consume. This layer provides normalized, checksummed, provenance-tracked legislative source records ingested from primary provider Open States / Plural Open and secondary provider LegiScan, alongside a national coverage manifest, deterministic cross-jurisdiction fixtures, conservative lifecycle inference, and a research-pack validation seam.

## Invariants & Constraints

1. **No Simulation Mutation**: `src/simulation/` remains untouched.
2. **Real Data vs Simulation**: Source records represent real-world data and provider evidence with full provenance (Constitution Principle 25), not canonical simulated world state.
3. **No Fabrication**: Missing official URLs, dates, or measurements remain `null`/unknown.
4. **Conservative Lifecycle Inference**: Distinguishes affirmative passage/failure from unresolved sine die session endings.
5. **Deterministic Builds**: Same-input compilation produces byte-for-byte and hash-identical outputs.
6. **Cross-Jurisdiction Fidelity**: Preserves Nebraska unicameral, D.C. Council, Puerto Rico bicameral territorial structure, special sessions, vetoes/overrides, and failure paths.

## Execution Checklist

- [x] Define normalized source record interfaces, provenance structures, and lifecycle domain types (`src/legislative_corpus/types.ts`, `src/legislative_corpus/lifecycle.ts`, `src/legislative_corpus/ids.ts`, `src/legislative_corpus/provenance.ts`).
- [x] Implement Open States adapter (`src/legislative_corpus/adapters/openstates_adapter.ts`).
- [x] Implement LegiScan adapter (`src/legislative_corpus/adapters/legiscan_adapter.ts`).
- [x] Implement corpus compiler, manifest builder, and research validation engine (`src/legislative_corpus/compiler.ts`, `src/legislative_corpus/manifest_builder.ts`, `src/legislative_corpus/research_validator.ts`).
- [x] Construct authentic cross-jurisdiction fixtures and research comparison fixtures (`data/legislative_source/fixtures/...`).
- [x] Build national coverage manifest across all 53 jurisdictions (`data/legislative_source/manifests/national_coverage_manifest.json`).
- [x] Create CLI commands (`scripts/legislative-corpus/cli-*.ts`) and configure `package.json` / `tsconfig` references.
- [x] Author system documentation (`docs/systems/legislative_corpus.md`).
- [x] Write comprehensive automated test suite (`tests/legislative_corpus.test.ts`) covering all 15 required scenarios.
- [x] Run full repository validation (`npm run validate`).
- [x] Commit, push branch, open PR targeting `main`, and generate final report.
