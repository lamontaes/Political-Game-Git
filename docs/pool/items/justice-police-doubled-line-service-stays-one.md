---
id: justice-police-doubled-line-service-stays-one
title: "Doubling a town's police line leaves its police service at exactly 1 in San Germán, Puerto Rico"
area: core
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** Doubling a town's police line leaves its police service at exactly 1 in San Germán, Puerto Rico (7276167, test seed cc7d421ea6c38a0d, world seed b51d0c9a269af9cfdefd4187cd37e7686b0826dd1c9d0069f60c3b2dd6b98b82). src/core2/police-arrests.test.ts doubles one police line (doubled=1, measure TEST-POLICE-DOUBLE, carried) and runs 120 days; the public-safety month rows then read policeService [1,1,1,1,1]. The test now passes such a place over, so the gap is hidden there, not fixed. Found Oct 28 by Merger 1 while merging the one-case-engine PR. Seen: the budget screen, where doubling the police line leaves the town's police service at exactly 1.

**Cause.** Needs cause. Measured: San Germán, Puerto Rico (7276167), test seed cc7d421ea6c38a0d: doubled police line, policeService stays [1,1,1,1,1]. `serviceOf` (src/core2/public-safety.ts, line 185) is now over base across the town's local governments, clamped to the service floor and ceiling. Not yet looked at: whether the doubled amendment lands in a government that `serviceOf` reads, and whether a fiscal-year turn inside the 120 days drops it.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: a raise in the line a service reads moves the service it pays. Sliding scales and causes: the service moves with the line at every size. One rule, all 56 places.

**Done when.** A second session, not the builder, plays San Germán, Puerto Rico (seed cc7d421ea6c38a0d): the same doubled police line reads a service above 1 in the public-safety month rows by row id, or a stated, sourced reason names why this place's police are not funded by a line the game reads. A test in src/core2 covers it and the police-arrests pass-over is removed or narrowed to that reason.

**Waits on.** Nothing.

**Files.** src/core2/public-safety.ts, src/core2/police-arrests.test.ts, src/core2/modules/budgets.ts

**Notes.** Found while merging the one-case-engine PR; check first whether the doubled amendment lands in a gov that serviceOf reads, and whether a fiscal-year turn inside the 120 days drops it.
