---
id: world-counted-households-flood-lenders-month-one
title: "Counted households ask the banks and the payday store for about 2,200 loans in a town's first month and drain the store's cash"
area: world
lead: money
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: design-one-model-two-tiers
source: "Account lead, Nov 15 22:16Z, on the #9517 re-pin trace"
checked:
---

**What.** In a played town the counted households borrow at a rate no real town shows. Cherry Hill, Virginia (place key 5115176, seed promises-real-loan-1 draw loan:2, world seed 21aa37418f5706ab965183f1bde7c68e952a899548272f1e67ee9900b548003d, player born 1985-03-01), first 30 days from Jan 2025, on the Train at 29ef4685: 2,200 loan applications from a town of 914 full households (872 personal refused, 327 personal approved, 973 small-dollar refused, 25 small-dollar approved, 3 others), all but one from counted households. On the Train at 892427ec the same town and seed wrote 24 (8 personal refused, 14 small-dollar approved, 2 others). The small-dollar store's cash is $0 from Feb 18 on, so its applications climb from 998 to 2,600 by mid-June while it lends 25 to 46 loans, and a full household that needs a payday loan (the pinned borrower of src/director/promises.test.ts) is refused with limit 0 on Apr 1, Jun 1, Jul 1 and Sep 1. Seen: the player's own household can't get a payday loan in a town whose store has been emptied by the counted population, and bank personal loans go to about a third of the town's counted rows in one month.

**Cause.** Needs cause. Between 892427ec and 29ef4685 the Train folded #9117 (counted renters buy homes; one opening cash rule with the head's age, counted savings at most 60 months), which changes the counted cash that `borrowingHouseholds` (src/core2/modules/credit.ts) reads against a month of costs. That #9117 is the change is not yet shown, nor whether each counted row's application should stand for `weightOf(h)` households (the loans written carry no weight).

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Opus session at medium effort to bisect the two Train heads at the named place and seed and write the Cause. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted household borrows by the same rule as a full one, times its count. No dice. Real rates check the totals (share of households taking a personal or payday loan in a year); they never pick a borrower.

**Done when.** A second session plays a first year in a played world (buildBenchWorld) at a drawn place and seed it did not choose, plus Cherry Hill, Virginia, seed promises-real-loan-1 draw loan:2, and sees month-one loan applications and approvals in line with a cited yearly share of households borrowing, the small-dollar store's cash above zero through the year, and a full household's payday loan approved by record id.

**Waits on.** Nothing.

**Files.** src/core2/modules/credit.ts, src/core2/starting-cash.ts, tests/support/real-borrower.ts
