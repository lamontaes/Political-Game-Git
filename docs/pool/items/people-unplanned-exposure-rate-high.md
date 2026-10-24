---
id: people-unplanned-exposure-rate-high
title: "About a quarter to a third of partnered women have an unplanned pregnancy in a year: the exposure per review is far above real rates"
area: people
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** renewalUnplannedExposure is 0.5 per 91-day review, times the age curve and the household's lack of cushion, so a typical partnered woman reaches one unit in a year or two. In one played year counted records made 334 unplanned-pregnancy decisions among 1,138 counted women in Hope Mills, North Carolina, 427 among 1,371 in Linda, California and 263 among 994 in Belle Plaine, Minnesota. The full tier reads the same parameter. Real unplanned pregnancies are a few percent of women of childbearing age a year; the parameter needs a sourced figure and a spread, and the totals checked against it.

**Rules.** Research before building: the rate is sourced from a fetched page and checks the town's total; it never decides one woman's outcome. One model, two tiers: the full and counted tiers read the same parameter.

**Done when.** renewalUnplannedExposure in src/core2/data/renewal/parameters.json is SOURCED or ESTIMATED with a citation and spread, and a one-year played world (buildBenchWorld, a place drawn from all 56, seed named) reports unplanned pregnancies per thousand women of childbearing age, full and counted, inside that spread, shown by a test in src/core2.

**Files.** src/core2/data/renewal/parameters.json, src/core2/births-counted.ts, src/core2/modules/renewal.ts

**Notes.** Measured on PR #5757's branch (claude/unplanned-counted-tier) over eight drawn towns: decisions per counted woman ranged 0.05 to 0.31 a year where women were counted.
