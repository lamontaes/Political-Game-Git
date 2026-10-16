---
id: people-m0-07-relative-hours-over-atus
title: "Golden path M0-07 fails in 3 of 7 drawn places: hours with relatives run 2.05 times the ATUS figure, just over the check's factor of two"
area: people
kind: bug
priority: 2
size: M
status: done
claimed-by: claude/m0-07-relative-hours
pr: #4821
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T20:21:27.956Z
---

**What.** The golden-path check M0-07 (src/core2/m0-meeting-people.test.ts, "keeps visits to parents and siblings inside the GSS ranges, and hours near ATUS") fails in some places: Nevada, Missouri (359 hours a year per adult against a limit of 341), Belgium, Wisconsin (seed c3, 348) and Mount Morris, New York (seed d4, 344), while four other drawn places pass. The visits sit inside the GSS quartile range, but each visit is the sourced 1.92 hours (socialHours, BLS ATUS 2025), so a place whose visits run in the upper half of the range exceeds twice the ATUS non-household-family time (170 hours a year, limit 341). Find which input is off (the visit count's upper bound, the hours per visit, or how much of ATUS time with non-household family belongs to parents and siblings) and calibrate it so the check holds across places, without weakening the check's factor of two.

**Rules.** Research before building: real data checks totals and never picks an outcome. Sliding scales: no threshold. One rule, all 56 places: checked in drawn places with the seeds named. A sourced parameter is not edited to pass a test; calibrate a tunable or correct how the source is applied and say which.

**Done when.** The M0-07 test passes in at least eight drawn places (names and seeds in the PR body), including Nevada, Missouri with the golden-path runner's seed, with the visits still inside the GSS range and hours under twice the ATUS figure.

**Files.** src/core2/m0-meeting-people.test.ts, src/core2/data/parameters.json, src/core2/modules/people.ts

**Notes.** Found running the golden-path suite on Oct 16 (M0-07 failed in the runner's place).

Measured Oct 16 (claude, released, not built): in the failing places (seeds c3, d4) the sibling visit rate is 27 to 28 a year against the GSS quartiles of 1, 4 and 30 (25th, median, 75th): inside the range, near the top. Visits to non-household relatives total thousands over the 91 days (adult children 5,900 to 8,000, siblings 6,000 to 7,000, parents 4,800 to 5,700 for 440 to 500 adults), each at the sourced 1.92 hours, so hours run 344 to 348 a year against 170. Meanwhile the time-use check wants more socializing overall (17 to 20 percent against 30.4), so the model spends too large a share of its socializing on relatives and too little on friends and neighbors. The fix is a share-of-contact calibration between relatives and other ties in the people engine's contact choice, not the hours per visit (sourced) or the test (a factor of two). Size M; do it with the time-use item.
