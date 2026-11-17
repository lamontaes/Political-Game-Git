---
id: executive-living-cost-date-typed-month-end
title: "scheduleLivingCost finds the first of next month with a typed 32"
area: laws
kind: bug
priority: 3
size: S
status: open
standard: 2
root: none
claimed-by:
pr:
after:
blocked-on:
lead: laws
source: "Acting CTO comment on #9554, Nov 16 07:48Z, filed by the Train thread at the lead's order"
model: sonnet
effort: medium
---

**What.** `scheduleLivingCost` in `src/core2/modules/executive.ts` (line 289) finds the first of next month by adding a typed 32 days to the 1st and slicing the date text with a typed 8. Guards: the speed and date rules.

**Cause.** Found in code: The date helpers in `src/core2/kernel/dates.ts` (`addMonths`) and `src/core2/residents.ts` (`nextMonthDay`) already know where a month ends; the function does its own arithmetic instead.

**Fix.** Use the kernel's month helper for the 1st of next month and delete the typed 32 and the text slicing.

**Time box.** 1 hour, Sonnet.

**Rules.** Replace, never layer. Speed: nothing scans the whole table when something is indexed.

**Done when.** The living-cost date is the 1st of next month through the kernel helper, with the same dates in a played year at a named place and seed, and no typed 32 or 8 left in the function. A second session sees it in the running game: the same opening or the same monthly spend as before, at a place and seed it names.

**Waits on.** Nothing.

**Files.** src/core2/modules/executive.ts

**Notes.** Filed by hand by the Train thread, Nov 16, from the acting CTO's note on #9554.
