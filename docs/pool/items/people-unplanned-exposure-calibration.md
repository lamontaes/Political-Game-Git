---
id: people-unplanned-exposure-calibration
title: "Calibrate the unplanned-pregnancy exposure against the real rate in played years"
area: people
kind: research
priority: 2
size: M
status: in-pr
claimed-by: claude/unplanned-exposure-calibration
pr: #5788
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T07:46:56.830Z
---

**What.** The renewal engine's renewalUnplannedExposure (0.5, TUNABLE, spread unmeasured) gives almost no full-tier unplanned pregnancies: three drawn towns played a year each with 28 waiting couples between them and none had one. Guttmacher puts unintended pregnancies at about 4 in 100 women aged 15 to 44 a year. Play a batch of drawn towns for a year, compare the town's unplanned total (full and counted) with that rate times its women, and set the parameter and its spread from the comparison.

**Rules.** Research before building: the published rate checks the town's total and never picks a couple. Estimate, never UNKNOWN: the parameter keeps a labeled spread from the measured batch.

**Done when.** In at least six drawn places, each a one-year played world built with buildBenchWorld, the unplanned total per 100 women 15 to 44 falls within the parameter's recorded spread around the fetched Guttmacher rate; the parameter row names the source with a quote and the measured spread, and the PR names each place and seed.

**Files.** src/core2/data/renewal/parameters.json, src/core2/births-unplanned.ts, data/research/people/

**Notes.** Found while repairing src/core2/renewal.test.ts on PR #5749: Hopkins SC, Yuba WI and Tamuning GU (seed probe1) had 12, 2 and 14 couples and 0 unplanned in a year.
