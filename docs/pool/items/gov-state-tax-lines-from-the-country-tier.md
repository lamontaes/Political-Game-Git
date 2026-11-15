---
id: gov-state-tax-lines-from-the-country-tier
title: "A state's own income, sales and corporate tax lines follow the country tier, one line per pull request"
area: gov
kind: wiring
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: gov-federal-payroll-taxes-from-the-country-tier
blocked-on:
lead: governing
model: sonnet
effort: medium
root: rc1-world-outside-town
source: "The Account lead's reading of the revenue plug, Nov 15, 2026"
checked:
claimed-at:
---

**What.** The away share of a state government's income, sales and corporate profit tax lines is still a twelfth of the plan, so a law changing one of those taxes moves nothing in the other states' treasuries. The gap is the same in every place that has the line. Seen: the budget screen's revenue lines for the state budget.

**Cause.** Found in code: src/core2/budgets-treasury.ts `outsideRevenueMonthly` pays plan times away share over twelve for every revenue line with no named payer (stopgap SG-GOV-outside-revenue-monthly), and the country tier already keeps each state's income, sales and profit revenue in each state's `whatMoved` rows.

**Fix.** One line per pull request (income first), reading the state's tier revenue for that tax with the same calibration as the federal line, and deleting that line's plug row and marker in the same change.

**Time box.** One PR, Sonnet, medium, 4 hours.

**Rules.** Replace, never layer: the plug row and marker for this line go in the same change; the chain is the acceptance (one dollar followed from a named group of payers to the treasury and the budget line it paid); one rule, all 56 places; speed: unattended-world check (year 1 plus time per record at three places, with and without, twice each side) and a played year under two minutes; no new stopgap.

**Done when.** A second session sees in the running game, in a drawn place named in the PR body, a change to the state tax rate for that line moving the income, sales or profit tax line the next month and no other line, by record id, with the plug row for that line gone.

**Waits on.** gov-federal-payroll-taxes-from-the-country-tier

**Files.** src/core2/budgets-treasury.ts, src/core2/country-model.ts, src/core2/data/outside-flows.json, src/core2/data/stopgaps/gov.json

**Notes.** Same pattern as #9393 (the federal individual income tax): `tierBaseOf` and `payFromTier` in budgets-treasury.ts carry over. Owner Nov 15: stood down the building crew to about ten sessions; this waits for a free session.
