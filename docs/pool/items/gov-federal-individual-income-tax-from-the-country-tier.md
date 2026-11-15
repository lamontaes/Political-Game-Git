---
id: gov-federal-individual-income-tax-from-the-country-tier
title: "The federal treasury's individual income tax for the rest of the country follows the tier's own withholding, not a twelfth"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/carry-federal-income-tier
pr: #9393
after: gov-outside-revenue-retire-plug
blocked-on:
lead: governing
model: sonnet
effort: medium
root: rc1-world-outside-town
source: "The Account lead's build for docket Q10 (owner: the plug goes), Nov 15, 2026"
checked:
claimed-at:
---

**What.** The federal treasury was paid every month an even twelfth of the individual income tax line (the share earned away from the town) through the outside-revenue plug, so a federal income tax change moved only the town's own share. Measured at Alofau AS over 400 days: 4.67 trillion dollars of federal revenue went through the plug. Seen: the federal budget screen's income tax line and the treasury's balance.

**Cause.** Found in code: src/core2/budgets-treasury.ts `outsideRevenueMonthly` pays plan times away share over twelve for every line without a named payer, and src/core2/modules/macro.ts steps the country tier each month with each state's federal withholding by law row (`whatMoved`), which no treasury read.

**Fix.** The federal treasury reads the tier's federal income-tax withholding for last month (sum over the 56 states' rests, the town's own part already out of its state), keeps the first month it read as a base, and pays plan times away share over twelve times tier-now over tier-base from the outside account as one `treasury-withholding` transfer, recorded in taxPayments with the tier month. The line comes out of the plug in the same change; a tier with no federal withholding at the start leaves the line on its plan, registered. A tax at nothing pays nothing and the month records it.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes and set the item honestly.

**Rules.** Replace, never layer: the plug row and marker for the line go in the same change; the chain is the acceptance (one dollar followed from a named group of payers to the treasury and the budget line it paid); one rule, all 56 places; speed: a year within 20% of its base; no new stopgap.

**Done when.** A second session, in a one-year run of the played world in a drawn place (named in the PR body), sees in the running game the federal budget's individual income tax paid each month by a taxPayments row naming the tier month, the amount following the tier's withholding, a federal income tax set to nothing in play paying nothing the next month, a state income tax change leaving the federal line where it was, and `npm run speed:year` within 20% of base.

**Waits on.** Nothing.

**Files.** src/core2/budgets-treasury.ts, src/core2/country-model.ts, src/core2/country-law.ts, src/core2/modules/budgets.ts, src/core2/data/outside-flows.json, src/core2/data/stopgaps/gov.json, src/core2/federal-income-tier.test.ts (new)

**Notes.** The payroll lines (social security and medicare, read from the same withholding rows) and the state treasuries' income, sales and profit lines follow as one line each. The calibration keeps the plan's level (Census) and moves it by the tier's own withholding, so the level of the line is still an estimate.
