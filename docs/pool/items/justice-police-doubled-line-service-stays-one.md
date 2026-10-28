---
id: justice-police-doubled-line-service-stays-one
title: "Doubling a town's police line leaves its police service at exactly 1 in San Germán, Puerto Rico"
area: core
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In San Germán, Puerto Rico (7276167, test seed cc7d421ea6c38a0d, world seed b51d0c9a269af9cfdefd4187cd37e7686b0826dd1c9d0069f60c3b2dd6b98b82), src/core2/police-arrests.test.ts doubles one police line (doubled=1, measure TEST-POLICE-DOUBLE, carried) and runs 120 days; the public-safety month rows then read policeService [1,1,1,1,1]. serviceOf (src/core2/public-safety.ts:176) is now/base over the town's local governments, clamped to the service floor and ceiling. Found Oct 28 by Merger 1 while merging the one-case-engine PR; the test now passes such a place over, so the gap is hidden there, not fixed.

**Rules.** An effect is a read: a raise in the line a service reads moves the service it pays. Sliding scales: the service moves with the line at every size. One rule, all 56 places.

**Done when.** In San Germán, Puerto Rico (seed cc7d421ea6c38a0d) the same doubled police line reads a service above 1 in the public-safety month rows by row id, or a stated, sourced reason names why this place's police are not funded by a line the game reads; a test in src/core2/ covers it and the police-arrests pass-over is removed or narrowed to that reason.

**Files.** src/core2/public-safety.ts, src/core2/police-arrests.test.ts, src/core2/modules/budgets.ts

**Notes.** Found while merging the one-case-engine PR; check first whether the doubled amendment lands in a gov that serviceOf reads, and whether a fiscal-year turn inside the 120 days drops it.
