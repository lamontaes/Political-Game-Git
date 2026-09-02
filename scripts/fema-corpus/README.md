# FEMA Disaster Declarations Corpus Tooling

This directory contains standalone scripts for compiling, refreshing, and validating the official FEMA disaster declarations historical corpus.

## Architecture & Governance

- **Source**: Official FEMA / OpenFEMA `DisasterDeclarationsSummaries` API (`https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries`).
- **Offline / Simulation Decoupling**: Simulation runtimes consume static compiled artifacts from `data/fema-disasters/compiled-fema-disasters.json`. Simulation runtimes and test suites NEVER invoke network APIs at runtime.
- **Truthful Evidence**: This corpus is historical evidence, NOT an event arrival-rate or gameplay risk model. No probability fields, severity scores, or casualty estimates exist in this sidecar.
- **Missing vs. Zero**: Missing dates or program availability flags in OpenFEMA source records remain `null` and are never coerced to false, zero, or fabricated dates.

## Scripts

### 1. Compiler (`compile-fema.ts`)

Compiles `data/fema-disasters/raw/fema-disaster-declarations-pinned.json` and `data/fema-disasters/raw/acquisition-manifest.json` into `data/fema-disasters/compiled-fema-disasters.json`.

```bash
npx tsx scripts/fema-corpus/compile-fema.ts
```

### 2. Validator (`validate-fema.ts`)

Verifies schema compliance, SHA-256 provenance integrity, missing-vs-zero invariant preservation, and absence of rate/probability fields or PR #62 imports.

```bash
npx tsx scripts/fema-corpus/validate-fema.ts
```

### 3. Fetcher & Snapshot Refresher (`fetch-fema.ts`)

Fetches or updates the pinned raw snapshot from OpenFEMA and updates `acquisition-manifest.json`.

```bash
npx tsx scripts/fema-corpus/fetch-fema.ts
```
