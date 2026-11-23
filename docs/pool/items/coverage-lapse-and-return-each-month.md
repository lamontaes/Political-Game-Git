---
id: coverage-lapse-and-return-each-month
title: "A cash-short counted household is insured one month and dropped the next: a policy ended for an unpaid premium is re-enrolled at the next review, about 8,400 households a month at Bastrop"
area: world
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: money
model: opus
effort: medium
source: "T54's count of Bastrop's counted coverage rows for #9657, Nov 16 04:45Z; Account lead's ruling 04:50Z (a defect of its own, given to the premiums thread)"
---

**What.** At Bastrop LA (`npm run speed:year -- --seed c3 --place 2204685`, year 1, two-level), counted coverage opens at 10,726 policies. On the Train with #9645 (462642be), 57,505 counted policies end in the year and 49,101 start again. 52,510 of the ended ones ended with their last premium unpaid; 192 were holder changes and 27 premium changes. The new rows by review day run 10,726, 3,928, 80, 9,446, 451, 8,472, 396, 8,596, 578, 8,415, 375, 8,221, 362: about 8,400 households lose their plan one month and get it back the next. 2,322 policies are open at year end. With #9657 (be1b38c0), more households can pay and the counts are 31,483 ended (26,336 unpaid), 25,827 started again, and 5,070 open at year end; the cycle remains. Seen: the count script's output (rows of `countedCoverage` by household, in order).

**Cause.** Found in code: `unpaidHolders` (src/core2/modules/coverage.ts) names every holder whose current row has `lastPaidMinor < lastDueMinor`, and `holdersToday` skips them, so `reviewCounted` ends their row on the 1st. At the next review that holder has no current row, so it is not in `unpaidHolders` and holds the plan again on its slot. Nothing carries the lapse (how long since the unpaid premium, what is owed) past the month it is read, so a household that is short every other month flips in and out. A skipped holder's slot is also not passed to the next worker in rank (`taken` counts it either way).

**Fix.** None chosen here; the premiums thread holds #9639 (who still loses the plan). The lapse must be a fact that lasts past one review, read from the record, the same rule for full and counted holders.

**Time box.** 3 hours, Opus, medium.

**Rules.** No dice; one model, two tiers (full holders read `unpaidHolders` the same way); dev mode shows a household's coverage rows and why each ended.

**Done when.** At Bastrop (seed c3, 2204685), year 1, counted policies that end for an unpaid premium do not start again the next month without a cause in the record, the month-by-month new rows no longer alternate, and dev mode's trace of a counted household shows its coverage rows and why each ended. A second session sees in dev mode, at a drawn place it names with its seed, a cash-short household's plan lapse and stay lapsed until the record gives a reason it returns.

**Waits on.** Nothing.

**Files.** src/core2/modules/coverage.ts.
