# FEMA Disaster Declarations Data Corpus

This directory contains raw pinned source snapshots, acquisition manifests, and the compiled historical FEMA disaster declarations dataset.

## Files

- `raw/fema-disaster-declarations-pinned.json`: Pinned JSON raw snapshot of official OpenFEMA disaster declarations.
- `raw/acquisition-manifest.json`: Provenance metadata recording official URL, query parameters, retrieval timestamp, raw SHA-256 hash, and record count.
- `compiled-fema-disasters.json`: Deterministically compiled offline artifact consumed by future event adapter systems.

## Data Invariants & Guarantees

1. **Truthfulness**: Directly reflects published OpenFEMA fields.
2. **Missing != Zero**: `null` values for incident end dates or program flags are preserved as `null`.
3. **No Gameplay Probabilities**: Contains zero arrival rates, occurrence risks, or casualty scores.
4. **Stable Identity**: Each declaration record has a deterministic stable ID (`buildDeclarationId`).
