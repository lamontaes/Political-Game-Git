# National Names V2 Dataset Pack

## 1. Overview

This directory contains the normalized, sharded, and cryptographically verified **National Names V2** dataset compiled from official U.S. Census Bureau (2020) and Social Security Administration (1880–2025) datasets.

- **Schema Version**: `2.0.0`
- **Compiler Version**: `national-names-compiler-v2.0`
- **License**: Public Domain (U.S. Government Work pursuant to 17 U.S.C. § 105)

---

## 2. Directory Structure

```text
data/names-v2/
├── manifest.json              # Complete cryptographic provenance and shard hashes
├── index.json                 # Fast summary index for quick reference
├── given-names/               # 26 alphabetical shards (a through z)
│   ├── given_names_a.json
│   ├── ...
│   └── given_names_z.json
└── surnames/                  # 26 alphabetical shards (a through z)
    ├── surnames_a.json
    ├── ...
    └── surnames_z.json
```

---

## 3. Dataset Metrics

- **Total Unique Given Names**: 114,004
- **Total Unique Surnames**: 156,621
- **SSA Birth Year Range**: 1880 – 2025 (146 years)
- **SSA States**: 50 States + District of Columbia (51 jurisdictions)
- **SSA Territories**: Puerto Rico (PR) and Other U.S. Territories (TR: AS, GU, MP, VI)

---

## 4. Invariant Rules

1. **No Categorical Binary / Unisex Labels**: First names store empirical male and female counts and proportions across time and geography.
2. **Race / Ethnicity Guardrail**: Census demographic frequency counts are retained purely as descriptive metadata from the source table. No race inference API or function is provided.
3. **No Suppressed Coercion to Zero**: Sparse or suppressed SSA records (<5 occurrences in state/territory tables) are preserved as absent rather than manufactured zeroes.
4. **Strict Isolation**: National series, state-level series, and territory series remain strictly isolated in their respective records.
