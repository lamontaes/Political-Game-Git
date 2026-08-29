# Active Plan: U.S. Government-Universe Source Compiler

## Context & Authorization

- **Repository**: lamontaes/Political-Game-Git
- **Workspace**: `/Users/lamontae/Documents/Political-Game-US-Gov-Universe`
- **Branch**: `antigravity/us-government-universe`
- **Base SHA**: `d5c488a89c33ab425a276eec2112f78083ba6d7e` (origin/main)
- **Subsystem**: Source Layer for U.S. Government Entities & Structural Authorities (Census of Governments / Government Units Survey)

## Scope Boundary

- Strict isolation: files in `src/government_universe/`, `scripts/government-universe/`, `data/government_universe/`, `docs/systems/us-government-universe.md`, and `tests/government_universe.test.ts`.
- Zero changes to `src/simulation/`, `src/player/`, `src/presentation/`, campaign/election files, or other data compilers.
- No legal power engine or simulated government rules; missing authority strictly remains unknown.

## Planned Deliverables

1. Data types & schemas (`src/government_universe/types.ts`)
2. Census Government ID parser & decoder (`src/government_universe/census_id.ts`)
3. Authoritative qualitative state descriptions database (`src/government_universe/authority_data.ts`)
4. Qualitative state authority reference index (`src/government_universe/authority_index.ts`)
5. Data normalizer (`src/government_universe/normalizer.ts`)
6. Summary manifest generator (`src/government_universe/manifest_generator.ts`)
7. Query and search API (`src/government_universe/query.ts`)
8. Authoritative corpus and manifest datasets (`data/government_universe/`)
9. CLI scripts (`scripts/government-universe/compile.ts`, `manifest.ts`, `validate.ts`)
10. Architectural documentation (`docs/systems/us-government-universe.md`)
11. Automated Vitest suite (`tests/government_universe.test.ts`)
12. Package.json scripts
