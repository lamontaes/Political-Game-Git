---
id: laws-labor-checker-untraced-counts
title: "Trace four labor checker results the laws lead could not explain"
area: laws
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
model: haiku
effort: low
root: rc8-law-judged-by-paperwork
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** The labor family's checker runs (audit seeds a91c03e7d2b84f10 Prescott, Michigan and 5e27b0c4196fd3a8 Uehling, Nebraska) leave four results untraced. The two local wage authority laws' money links grade wired on Uehling payroll posts journal:2025-01-24:1557 and journal:2025-01-28:1574 that no engine reading the grant made. Re-enacting a law in force at the opening reaches more records than the opening had (the state raise question 30 then 92 in Prescott). Paid family leave reaches exactly 138 records in both towns from different mixes. Social Security reaches 56 counted groups where the unemployment taxes on the same paydays reach 27. Also untraced (laws lead, Oct 25): why 9 of the year's 20 workers raised by the minimum wage show no bigger paycheck and why one was paid less (person_d1c82dce42074b2e, March 3: $392.00 against $404.54). Seen: a paycheck that is smaller after a minimum wage raise (nine of twenty raised workers show no bigger pay, one is paid less).

**Cause.** Measured: Prescott, Michigan (seed a91c03e7d2b84f10) and Uehling, Nebraska (seed 5e27b0c4196fd3a8) in main's `docs/reports/law-wiring-matrix.json` (read on main d59e6935d7) no longer shows two of the four results. The local wage authority laws' money links are now graded `n/a`, on purpose, because a grant is graded on the town law it enables, so the Uehling payroll posts journal:2025-01-24:1557 and :1574 no longer carry a grade. Paid family leave now reaches 132 records in Prescott (95 of them `law-reach-a:leave-premium` payments from `src/core2/law-reach/group-a-money.ts` line 163), not 138 in both towns. The other two (a re-enacted law reaching more records than the opening had, and Social Security's 56 counted groups against unemployment tax's 27) are counts inside the checker's reach tally, which no player sees. The one result a player can see, the paycheck that looked smaller after a raise (person_d1c82dce42074b2e, March 3, $392.00 against $404.54, on the Oct 25 checker), fits the length of the month and not a cut in pay. A job's `wageDailyMinor` is a calendar-day average (`src/core2/opening-town-jobs.ts`), so the March 3 paycheck for February covers 28 days against January's 31. A 7 percent raise times 28 over 31 is 0.966, the same as the observed 392.00 over 404.54, 0.969. This was not traced by record on main.

**Fix.** Nothing to build. Proposed: the CTO drops the item (`npm run pool -- status laws-labor-checker-untraced-counts dropped --by=cto`). Two results are gone on main, two are checker tallies no player sees, and the smaller paycheck is February's shorter month at a calendar-day wage. If the CTO keeps it, the one check worth doing is the Done when below.

**Time box.** 1 hour for one Haiku session, only if the CTO keeps the item.

**Rules.** Ask why: each result gets its cause by file and line, or is shown to be a checker artifact and the checker is fixed. An effect is a read: a money grade stands only on a post an engine that reads the law made.

**Done when.** The CTO drops the item. If it is kept, a second session plays a drawn place (named with its seed) where a minimum wage raise takes effect, and reads one raised worker's paychecks by job and journal record id, and sees each period's pay equal to the new daily wage times the period's days.

**Waits on.** Nothing.

**Files.** scripts/law-wiring/check.ts, scripts/law-wiring/matrix.ts, src/core2/question-wages.ts, src/core2/law-reach/group-a-records.ts

**Notes.** TODO

Laws lead, Oct 25, 19:55: on the checker at 878c4dc4e1 (labor head 160d33ac25), the minimum wage's own payment in Prescott is a bigger paycheck for 11 of the 20 workers it paid over the year; in a 100-day run, 8 of the 9 raised by then got one, and `person_d1c82dce42074b2e`, raised on February 26, 2025, was paid less on March 3 ($392.00 against $404.54). Why the other nine of the year's twenty show no bigger paycheck, and why that one was paid less, is not traced. The six-to-fourteen-fold raises are filed as `gov-town-officers-paid-under-minimum-wage`.

Nov 11 (cause finder for Fable B): read main's law-wiring matrix on d59e6935d7. Two of the four results are gone, two are checker tallies, and the smaller paycheck matches February's 28 days at a calendar-day wage. I propose dropping the item.
