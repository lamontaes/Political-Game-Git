---
id: business-never-adds-location-part-3-expansion-cause
title: "A business opens a second location when its market's demand outgrows its capacity"
area: world
kind: bug
priority: 2
size: M
status: dropped
claimed-by:
pr:
after: business-never-adds-location-part-1-counted-founding-room, business-never-adds-location-part-2-all-markets
blocked-on:
lead: jobs
source: split from business-never-adds-location in the pool redo, Nov 10, 2026
standard: 2
model: opus
effort: high
root: none
checked: fable 2026-11-10
---

**What.** No business in Cochituate, Massachusetts opened a second location in three years, because market room is exactly 0 in a steady town and the expansion score can never beat keeping the business. An owner needs a reason to expand that exists in a steady town: demand for what the business sells growing past what it can supply. Give expansion that cause, read from the business's own books and the market, and let a parent open a location when it holds.

**Cause.** Found in code: src/core2/modules/business.ts `expandOption` (line 1988) scores -3 (`businessExpandBaseline`) - 6 (room term) + 3 x strength, at most 0, because `marketRoom` (line 1641) is 0 in every market of a steady town.

**Fix.** Give `expandOption` a demand-growth term (demand over capacity for this business, from its sales and the market's growth with population and income) so a growing business can win over keeping. The founding row names its parent. Calibrate the weight as TUNABLE against BDS establishment growth as a check only.

**Time box.** 5 hours for an Opus session.

**Rules.** No dice: a business adds a location or a founder opens one because its own books, market room and owner decide it, never a yearly chance; real BDS rates check the totals only. Ranges are not targets (owner, Nov 8): nothing is pulled to the BDS range. One rule, all 56 places: the parameters live in data and the fix names no place.

**Done when.** A second session, in Cochituate, Massachusetts (a drawn place, seed 93a558a5898ee167fd5c49b69a4183c546da870c3754f7688faeb29392d6d4dc), runs three years with `src/core2/tooling/m1-08-check.ts` and sees at least one founding row that names a parent business, with the market's room, the parent's sales and its cash by record id. The owner's decision for that business names the growth that moved it.

**Waits on.** business-never-adds-location-part-1-counted-founding-room and business-never-adds-location-part-2-all-markets.

**Files.** src/core2/modules/business.ts, src/core2/data/business/parameters.json, src/core2/tooling/m1-08-check.ts, src/core2/business.test.ts

**Notes.** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have let a business open a second location from demand outgrowing capacity; no screen or scene shows a business's locations, and the town's founding count is already fixed by parts 1 and 2.
