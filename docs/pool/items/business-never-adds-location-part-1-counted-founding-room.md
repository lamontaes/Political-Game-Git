---
id: business-never-adds-location-part-1-counted-founding-room
title: "A counted founder weighs a market's room before founding there"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: jobs
source: split from business-never-adds-location in the pool redo, Nov 10, 2026
standard: 2
model: opus
effort: medium
root: none
checked: fable 2026-11-10
---

**What.** In Cochituate, Massachusetts the wider-population branch of foundings (the counted founder, `strongestPulls(api, "found", rows)`) founds a business in the top market every month, in this world manufacturing, whatever its room, so foundings pile into one market. The full-person branch weighs market room; the counted branch carries a baseline and unemployed and prospect terms that ignore it. Make the counted founding weigh market room the way the full-person branch does so foundings spread across the markets that have room.

**Cause.** Found in code: src/core2/modules/business.ts `foundings` (line 1721) takes the counted founder's pulls with `strongestPulls`; `businessCountedFoundBaseline` and the room weight sit in src/core2/data/business/parameters.json. Measured in Cochituate, Massachusetts (2514570, seed 93a558a5898ee167fd5c49b69a4183c546da870c3754f7688faeb29392d6d4dc): manufacturing took one founding a month from April 2025 to March 2026 with room 0.0000 throughout.

**Fix.** Add the market's room to the counted founder's score by the same term the full-person branch uses. Calibrate the baseline through the parameters file as TUNABLE with its spread; add no cap. Check the totals against BDS entry only as a report.

**Time box.** 4 hours for an Opus session.

**Rules.** No dice: a business adds a location or a founder opens one because its own books, market room and owner decide it, never a yearly chance; real BDS rates check the totals only. Ranges are not targets (owner, Nov 8): nothing is pulled to the BDS range. One rule, all 56 places: the parameters live in data and the fix names no place.

**Done when.** A second session, in Cochituate, Massachusetts (a drawn place, seed 93a558a5898ee167fd5c49b69a4183c546da870c3754f7688faeb29392d6d4dc), runs three years in the played world with `src/core2/tooling/m1-08-check.ts` and sees the foundings spread over several markets, listed by founding record id with each market's room, not one market every month. A test in src/core2/business.test.ts fails when the counted founder ignores room.

**Waits on.** Nothing.

**Files.** src/core2/modules/business.ts, src/core2/data/business/parameters.json, src/core2/tooling/m1-08-check.ts, src/core2/business.test.ts
