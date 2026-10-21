---
id: world-homeless-puerto-rico-far-above-hud
title: "A Puerto Rico town's homeless count runs about 75 times the HUD rate"
area: world
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: claude/pr-homeless-rent
pr: #5792
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T10:05:57.453Z
---

**What.** housing-calibration.test.ts fails on main in place 7237336 (Puerto Rico, world seed 63ef211a72f7f8d3519652d91152eaf5cda51a871ae2bed4e9221c537c7bd2f8): after a played year 110 of 2,253 people are homeless (488 per 10,000) against HUD's 6.5 per 10,000 for Puerto Rico, and every renter household starts above the 32 percent rent-burden line (188 of 188), 93 of them taken to court. Either the territory's rents or incomes are off by a large factor, or the eviction path has no brake there.

**Rules.** Estimate, never UNKNOWN: rents and incomes start from the territory's real averages. Wire to the world: the fix applies to all 56 places, not this town. One rule, all 56 places: no place named in logic.

**Done when.** In the pinned Puerto Rico world the year's homeless count is within housing-calibration.test.ts's bound of the HUD rate, renter burdens on day one match the territory's sourced rent-to-income share, and the test passes on three fresh draws from all 56 named in the PR body.

**Files.** src/core2/modules/housing.ts, src/core2/housing-homeless.ts, src/core2/modules/residents.ts, src/core2/housing-calibration.test.ts

**Notes.** TODO
