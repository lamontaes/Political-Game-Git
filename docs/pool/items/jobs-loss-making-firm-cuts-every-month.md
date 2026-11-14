---
id: jobs-loss-making-firm-cuts-every-month
title: "A small inn that loses money cuts staff three months running"
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
lead: jobs
model: opus
effort: medium
root: none
source: found by the layoff-in-the-paper thread, Nov 14, 2026, reading the stories printed at Shackle Island, Tennessee
---

**What.** Seen: the town paper prints a layoff at the same inn in November, December and January, each month a bit smaller, so a reader reads the same inn "cutting jobs" three months in a row.

**Cause.** Measured: Nov 14 at Shackle Island, Tennessee (seed gift-d, `drawPlace("gift-d", "printed-words")`, one played year from the start date): `event:business.staff-reduced:organization_49a14856050b813f:2025-11-01` (1 job lost, 25 staff after, target 20.2, sales 44.4M, costs 51.6M), `...:2025-12-01` (2 lost, 23 after, target 17.2, loss months 0.45) and `...:2026-01-01` (3 lost, 19 after, target 13.4, loss months 0.65). Each review lowers the target staff because the books lose money, and the cut lands the next month. Whether a firm that loses about 13 percent of its sales a month should shrink this fast, and whether three cuts in a row is what real small lodging firms do, is not known.

**Fix.** Read `reviewEmployers` / `firmStaffing` in `src/core2/modules/jobs.ts` (the `shrinkAdjustment`, `lossMonths` and `target` it keeps with the event) and check the pace of a loss-making firm's cuts against JOLTS layoffs for accommodation; change the pace only if it is far from real firms, and say what you measured.

**Time box.** 2 hours

**Rules.** No dice. Real data checks the pace and never picks an outcome. Give year 1 and time per record at three places, with and without, if the pace changes.

**Done when.** A second session plays a year in a drawn place, Shackle Island, Tennessee (seed gift-d), and finds either the cuts spread by how far the books are under water (with the three records above explained) or the pace kept with the measured reason.

**Waits on.** Nothing

**Files.** src/core2/modules/jobs.ts
