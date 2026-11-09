---
id: gov-budget-spending-voted-from-revenue
title: "A government's next budget is voted from the revenue it collected, so surplus and deficit come from the world"
area: gov
kind: feature
priority: 2
size: L
status: open
lead: legislation
claimed-by:
pr:
blocked-on:
after: gov-outside-revenue-real-payers
source: Money, Nov 8; Coordinator ruling on #7873
---

**What.** A state's or local government's yearly spending lines are the published Census base (moved by the world's factor and by enacted bills), not a vote on what it collected. `SG-GOV-reserve-sweep` invests the surplus outside the treasury above 1.2 months of spending. The sweep is real behavior and stays until this item is done: in fiscal 2022 itself states' general spending was only 0.79 to 0.82 of general revenue (Indiana, Connecticut, Wyoming in `data/research/money/public-budget-bases.json`; insurance trusts, utilities and liquor stores are left out of both sides), the post-pandemic surplus year, and NASBO's balances rose with it. Build the vote: the legislature's budget bill for the next fiscal year is written against a forecast of the revenue just collected (the named-payer installments moved by the tax base, #7873, and the town's flows), with the balanced-budget rule the law in force sets for the government, and any surplus becomes a recorded reserve the legislature can spend or hold. Nation's other-states budgets read the same rule.

**Rules.** No dice; sliding scales; one model, two tiers; one rule for all 56 places; real ranges are checked against, never steered to; an effect is a read.

**Done when.** In a played world at two random places from all 56 (place and seed named), a year of weaker receipts than forecast leads the next budget to spend less, and a year of stronger receipts leads it to spend more or hold a recorded reserve, named by record id; `SG-GOV-reserve-sweep` is removed or narrowed to the reserve above the law's rainy-day cap; the budgets "every dollar lands" test passes; `speed:year` within 20 percent of base.

**Files.** src/core2/modules/budgets.ts, src/core2/budgets-treasury.ts, src/core2/modules/legislature.ts, src/core2/data/stopgaps/gov.json

**Notes.** Filed by Money, Nov 8, night, after reading `closeTreasuries`: revenue is the plan (named-payer installments now move with the nation's wage bill, #7873; the other lines still pay the plan), so a vote from revenue collected needs #7873 and Nation's other-states rows first.

Nov 9 (Money, after #7873 and #7855 merged): read the code for the first step. Facts: (1) every year's budget is rebuilt from the Census base by `budgetFor` (modules/budgets.ts:671), moved only by the world factor and enacted bill changes in `legislatedBudget`; revenue lines are the same every year (US-IN revenue 70.25B each year at Wooster, seed money-1), spending only falls by enacted changes, so nothing reads receipts. (2) There is no single series of what a treasury collected: receipts arrive as the outside plug (`outsideRevenue` rows), named-payer installments (`taxPayments`, now moved by the wage bill), the town's own payers (`townRevenue`, `sinceClose`) and aid (`aidReceivedMinor`); the cash journal's owner totals are off in play (bookkeeping is a debug switch), so they cannot be the read. (3) Plan: add `collectedMinor` to each `treasuryMonths` row (the sum of those four, written at the close), then in `legislatedBudget` for a state or local government in a year after its first, scale the spending lines by the year just ended's collected receipts over that year's planned revenue, a sliding scale with no threshold; measure that ratio at two drawn places first, because if year 1's collected-over-plan is not near 1 the factor would steer the opening. The federal government keeps borrowing. (4) Then `SG-GOV-reserve-sweep` narrows to the reserve above the law's rainy-day cap, and the parked plug change (branch money/plug-follows-base) goes in with it.

Nov 9 (Money, measured): branch money/spending-from-revenue adds `collectedMinor` to each treasury month (outside lump + named payers' installments including what the town paid + the town's own payers + aid received) and `scripts/money/collected.ts`. Wooster IN, seed money-1, a full year (2026): collected over planned revenue is 1.009 for the U.S., 1.014 for Indiana and 1.014 for Kosciusko County, so the factor is near 1 at the start and does not steer the opening (2025 is a partial year from Jan 20: 0.91 to 0.92 for the same three). CORRECTION (same day): the first version of `collectedMinor` added the in-town spending record (`inTown`) to receipts, which made the town read 2.85. Without it the town reads 0.75 in 2026 (0.11 B against 0.14 B) and the state and county are unchanged (1.014, 1.013): the town's own payers' taxes go straight into its treasury and no monthly record counts them. A town vote needs that read first (balance in, less balance out, or a receipts record where the town's payers pay), so the vote starts with states and counties.
