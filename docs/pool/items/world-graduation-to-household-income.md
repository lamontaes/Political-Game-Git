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
model: haiku
effort: low
root: rc8-law-judged-by-paperwork
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** Hire pay now follows each hire's schooling (world-schooling-to-pay), but nothing shows a place whose graduation share rises later paying higher household incomes. Show the chain: the school module's graduation record, the education the hire pay reads, the hire pay it sets, the paycheck, and the household income the poverty measure reads. Reading the code, the hire-pay step already reads the graduation record directly (schoolingOn in src/core2/modules/jobs.ts), so an education fact may not need writing; the open question is whether the household income the poverty measure reads includes the higher pay.

**Cause.** Found in code: the chain is already complete on main d64255aa, so there is nothing broken to fix. (1) The school module writes each student's graduation record (src/core2/modules/school.ts, about line 270). (2) `schoolingOn` in src/core2/modules/jobs.ts (line 3561) reads it for a hire: a graduate who enrolled holds a degree or some college once normal time has ended, the diploma before that, and less than high school if they did not pass. (3) `schoolingWeekly` (line 3591) turns that into pay, and `hirePay` (line 3615) reads it at line 3621. Seekers and offers pass it at lines 3775 and 4704. (4) The hire's job carries that wage. `householdPoverty` in src/core2/world-poverty.ts reads a named household's income as its members' `job.wageDailyMinor` times 365 (about line 163), and a counted household's through `householdIncome`, whose `wagesMinorYear` is refreshed from `wagesOf` whenever its jobs change (src/core2/counted-groups.ts line 549; src/core2/modules/residents.ts lines 2248, 3013 and 3071). (5) `townMetrics` in src/core2/modules/world-metrics.ts reads `povertyByPlace` (line 170), which the Metrics tab shows. So a place whose graduation share rises pays its later hires more, and its poverty share follows. No education fact needs writing.

**Fix.** Nothing to build in the engines. What the item still asks for is a proof test: twin worlds with higher and lower graduation, followed by record id to the poverty share. That is depth no player sees beyond what the Metrics tab already shows (owner, Nov 10), so I propose the CTO drops the item. If the CTO wants the proof kept, it is a Haiku-sized test in src/core2/modules/jobs.test.ts or a new file, calling `hirePay` for two seekers who differ only in their graduation record.

**Time box.** 0.5 hours for the CTO to read this and decide. Seen: the Metrics tab's household income and poverty share rising later in a place whose graduation share rose.

**Rules.** An effect is a read, not a record: the hire pay must read the updated schooling. Wire to the world: shown in a played world, by record ids. No dice.

**Done when.** A second session (not the builder) plays a world in a drawn place (place and seed named) and follows a student who graduates to the hire pay that schooling sets and to the household income the poverty measure reads, by record id, shown by a test; twin worlds with higher and lower graduation differ in hire pay. The finding on whether the chain is already complete is written into this item.

**Waits on.** world-schooling-to-pay (done).

**Files.** src/core2/modules/school.ts, src/core2/modules/jobs.ts, src/core2/world-poverty.ts, src/core2/counted-groups.ts, src/core2/modules/world-metrics.ts

**Notes.** TODO

Nov 11 (cause finder for Fable B): read the chain end to end on main d64255aa. Graduation reaches hire pay, hire pay reaches both tiers' household income, and that reaches the poverty share the Metrics tab shows. Nothing is missing, so I propose dropping the item.
