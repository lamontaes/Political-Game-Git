---
id: core-old-imports-opening-employment
title: "The opening's employment allocation comes from the core, not the old town-employment, life-queries and jail-terms code"
area: core
kind: cleanup
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** `src/core2/opening-employment.ts` imports the old engine's `living-world/town-employment` (1,718 lines, with its generated meta), `life-queries` (1,206 lines, read by 199 files) and `justice/jail-terms`. Move what the opening's job allocation uses into the core and delete the rest. The opening's job allocation is the only reader in the core.

**Rules.** Replace, never layer: the old import is deleted when its replacement lands. Build only what the golden path needs. Same town by record id for a drawn place before and after. One rule, all 56 places: no place is named in code.

**Done when.** The grep for imports of the old engine in `src/core2/opening-employment.ts` prints nothing, the typecheck passes, and a drawn-place opening allocates the same jobs by record id before and after.

**Files.** src/core2/opening-employment.ts, src/simulation/living-world/town-employment.ts, src/simulation/life-queries.ts, src/simulation/justice/jail-terms.ts

**Notes.** Split Oct 17 from core-old-imports-opening-builders. `population.ts` also reads `ensureTownEmployment` and `organizationProfileAt`, so the move may be shared with core-old-imports-population.
