---
id: world-movers-change-unplaced-workers-not-the-pool-pay
title: "Households that move in or out change the out-of-town workers on the counted records but not what the place's pool pays, so counted incomes drift from the money (Denio, Nevada: records earn a third more than is paid after 400 days)"
area: world
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
effort: high
root: design-one-model-two-tiers
lead: jobs
source: Fable, Nov 10, 2026, found by the new test for the unit of a counted household's out-of-town workers (src/core2/unplaced-workers-unit.test.ts)
checked: fable 2026-11-10
---

**What.** At the opening, the out-of-town workers the counted records hold (unplacedWorkers times each record's weight) times the pool's pay per worker equal what the place's unplaced-workers flow pays a year, to the cent. In play the two drift apart: a newcomer household is given the place's rate of unplaced workers and nothing is added to the pool's flow, and a household that leaves takes its workers off the records while nothing comes off the flow. Every reader of a counted household's income (income bands, rent it can pay, the law-reach readers, poverty) then reads pay the pool never hands out, or misses pay it does. Make arrivals add the out-of-town pay to the pool and departures take it off. Seen: the Metrics tab's household income and the town's poverty figure, which read counted households' pay and should match what the pool pays them.

**Cause.** Measured: Denio, Nevada (place key 3218500, world seed 4defc8043b5c928062099a71f58aeb036910648c89301b71ffa7b2d8223ef9e9), after 400 days with the weight fix in: in the rest-of-county place the records hold 332.4 workers (128.2 at the opening) and earn 16,120,160 dollars a year by householdIncome's reading, while the pool pays 11,887,943; in the town the records earn 3,790,355 and the pool pays 3,836,643. Found in code: `arrivals` in src/core2/modules/counted-moves.ts (line 1381) sets h.unplacedWorkers = jobShare(...) and adds nothing to the pool's flow.

**Fix.** Make an arriving household add its out-of-town pay to the pool's flow and a departing household take it off, and turn the unit test's print of both sides into an assertion over 400 days. List every writer of unplacedWorkers and of the pool's amount in the pull request and say what each does to the other side.

**Time box.** 5 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record, and one model, two tiers: a counted household's income must be the money its group is paid. Wire to the world: a household that arrives with people working out of town brings that outside pay with it, and one that leaves takes it away. No dice.

**Done when.** A test in a drawn played world holds the identity for 400 days, by pool: the records' out-of-town workers times the pool's pay per worker equal what the pool's flow pays a year, within the rounding of the hires. The pull request lists every writer of unplacedWorkers and of the pool's amount and says what each does to the other side. A second session, on main in a drawn place, runs two years in dev mode and reads Follow the money for the counted residents of the surrounding county: the pay the pool hands out and the income the Metrics tab shows for them agree within one percent.

**Waits on.** world-regional-work-piles-unplaced-workers-on-a-household (claimed; this builds on its workers fix).

**Files.** src/core2/modules/counted-moves.ts, src/core2/modules/residents.ts, src/core2/unplaced-workers-unit.test.ts (new)

**Notes.** The test prints both sides after its played days and does not assert them yet; turn that print into the assertion. Also seen and not looked into: a household that returns to the counts holds its commuter's pay as so many of the pool's workers (returnCommuterPay), so a one-household record can read 3.17 workers with two working-age members; and a counted person in regional work who dies or passes working age keeps their worker on the household until the turnover pull ends it. The moves engine's place rate (unplacedRates) adds records without their weights on both sides.
