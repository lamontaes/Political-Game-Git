---
id: world-graduation-to-household-income
title: "A place's graduation change reaches later household incomes through hire pay"
area: world
kind: wiring
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after: world-schooling-to-pay
lead: jobs
model: sonnet
effort: low
root: rc8-law-judged-by-paperwork
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** Hire pay now follows each hire's schooling (world-schooling-to-pay), but nothing shows a place whose graduation share rises later paying higher household incomes. Show the chain: the school module's graduation record, the education the hire pay reads, the hire pay it sets, the paycheck, and the household income the poverty measure reads. Reading the code, the hire-pay step already reads the graduation record directly (schoolingOn in src/core2/modules/jobs.ts), so an education fact may not need writing; the open question is whether the household income the poverty measure reads includes the higher pay.

**Cause.** Needs cause. Looked at src/core2/modules/school.ts line 270 (the end-of-year graduation record) and schoolingOn, schoolingWeekly and hirePay in src/core2/modules/jobs.ts (hire pay reads the graduation record directly, so the item's step of writing an education fact is not needed); the household income and poverty measure in src/core2/modules/world-metrics.ts are unread.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Seen: the Metrics tab's household income and poverty share rising later in a place whose graduation share rose.

**Rules.** An effect is a read, not a record: the hire pay must read the updated schooling. Wire to the world: shown in a played world, by record ids. No dice.

**Done when.** A second session (not the builder) plays a world in a drawn place (place and seed named) and follows a student who graduates to the hire pay that schooling sets and to the household income the poverty measure reads, by record id, shown by a test; twin worlds with higher and lower graduation differ in hire pay. The finding on whether the chain is already complete is written into this item.

**Waits on.** world-schooling-to-pay (done).

**Files.** src/core2/modules/school.ts, src/core2/modules/jobs.ts, src/core2/modules/world-metrics.ts

**Notes.** TODO
