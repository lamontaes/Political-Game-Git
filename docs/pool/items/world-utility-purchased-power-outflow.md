---
id: world-utility-purchased-power-outflow
title: "A utility keeps the whole of its household bills as cash: it pays nothing for the power and water it sells"
area: world
kind: bug
priority: 3
size: M
status: in-pr
claimed-by: claude/political-game-pool-yucp92-af
pr: #5616
blocked-on: world-utility-staff-never-paid
source: added with npm run pool -- add
claimed-at: 2026-10-20T07:58:59.763Z
---

**What.** A county utility now opens with books and takes in household electricity bills (financeKind household.customer.residential-electricity), but after a year it holds nearly all of that as cash: $4.3 million in Yazoo City, Mississippi. Every business book gets an outside-costs flow in src/core2/opening-outside-market.ts that should buy what the firm does not buy locally, accruing the book's annualOtherCostsMinor share of what it receives (the weekly pass in src/core2/modules/residents.ts). Find why the utility's flow pays almost nothing, most likely because the household bills do not count in the book's receivedMinor or the utility kind's sales-cost share is not applied, and fix it so the utility pays its IRS-sourced cost share for purchased power and fuel to the outside market. Then show the cash it keeps is its sourced margin.

**Rules.** Wire to the world: the purchased-power payment is a journal transfer from the utility to the outside account that the town's balance reads, not a number on the book. One model, two tiers: counted households' bills accrue the cost share exactly as a full household's, times the weight. Estimate, never UNKNOWN: the cost share is the sourced businessIrsUtilitySalesCostShare parameter, and its citation travels with the payment. No dice: the payment follows receipts and the cost share, never a roll. Every dollar balances: the journal balances in the same run.

**Done when.** A test beside src/core2/utility-staff-paid.test.ts runs a played-world year (buildBenchWorld, a place drawn from all 56 with a utility, a seed the builder did not choose) and shows the utility's outside-costs flow paid at least the sourced cost share of the household bills it received, by flow and organization record id, so its year-end cash retained is within the margin the books name. The same run keeps staff paid and the journal balanced.

**Files.** src/core2/opening-outside-market.ts, src/core2/modules/residents.ts, src/core2/data/business-books.json, src/core2/utility-staff-paid.test.ts

**Notes.** Oct 20 (pool feeder): spec written; the blocker world-utility-staff-never-paid is done. The outside-costs flow already exists for every book, so the work is finding why the utility's accrues almost nothing; a probe run of the utility opening was attempted but its output was lost, so the cause above is a hypothesis to confirm first.
