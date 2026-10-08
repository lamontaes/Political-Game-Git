---
id: session44-bg62-pool-closeout
impact: none
section: Fixed
title: Record the capitol flag dependency
---

BG-62 remains blocked on sourced, rights-cleared official state-flag assets for all 56 jurisdictions, a renderable flag mount, and a sourced Mississippi flag-change record with its effective date. On current main, `src/presentation/living-scene-surfaces.ts` declares `symbolAssetId: null` and says publisher, office, and venue facts do not admit a seal, flag, or portrait raster; `art/manifest/civic_symbols.json` marks all 188 civic-symbol records `not-acquired` and says no symbol artwork is in the repository and civic symbols are never AI-generated. Without those dependencies, this branch cannot prove a capitol flag for every jurisdiction or the Mississippi flag-law change on its effective date. No player-facing behavior changes.
