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
