---
id: housing-shelter-island-areas-estimate
title: "American Samoa and the Northern Marianas start from the island-area median of shelter beds, not the nation's rate"
area: world
kind: stopgap
priority: 3
size: S
status: done
claimed-by: claude/apply-stopgaps-d
pr: #5461
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T23:06:03.721Z
---

**What.** PR 5461 applies one row of the Oct 19 stopgap research: shelter-beds.json gives AS and MP, which no HUD Continuum of Care covers, the median of the three island areas the 2025 HIC does count (Guam 6.18, Puerto Rico 2.47, U.S. Virgin Islands 10.9 beds per 10,000) with that spread, ESTIMATED, instead of the nation's 14.56, read by shelterRateFor and shelterBeds (housing-homeless.ts), which the eviction path reads when it shelters a household. The umbrella research-stopgaps-oct19-apply (all 112 rows) stays open.

**Rules.** Estimate, never UNKNOWN: the estimate keeps its label, its source note and its spread; the territories' own counts replace it. One rule, all 56 places: no place is named in logic.

**Done when.** In a place drawn from American Samoa and the Northern Marianas (buildBenchWorld, seed named), the beds the eviction path reads (shelterBeds) are the place's people times the island-area median per 10,000, below what the nation's rate would give, and the test names place and seed.

**Files.** src/core2/data/housing/shelter-beds.json, src/core2/housing-homeless.ts, src/core2/housing-homeless.test.ts

**Notes.** TODO
