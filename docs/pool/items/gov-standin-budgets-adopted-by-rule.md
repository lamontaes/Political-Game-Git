---
id: gov-standin-budgets-adopted-by-rule
title: "Each fiscal year's budget is adopted by the body's own vote, not carried forward on the start date"
area: gov
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: split from gov-standins-other (Oct 19, 2026); rows SG-GOV-budget-adopted-by-rule, SG-GOV-outside-revenue-monthly, SG-GOV-service-charges-by-living-cost
---

**What.** Today each new fiscal year's budget is adopted on its start date by carrying the year's amounts forward. Replace that with a budget bill the body votes on, with the executive's proposal, amendments and the vote recorded, so a different majority can fund different lines. The year's lines then come from the passed bill, and the treasury pays from them.

**Rules.** "An effect is a read": the replacement counts only when another engine reads what it writes at the moment it decides or pays. "No dice": traits, law and money decide, never a roll.

**Done when.** A played year in a drawn place, started with buildBenchWorld, shows the replacement read by another engine by record id, a test in a random place of all 56 names the place and seed, and each row (SG-GOV-budget-adopted-by-rule, SG-GOV-outside-revenue-monthly, SG-GOV-service-charges-by-living-cost) is resolved in src/core2/data/stopgaps.json with the reason.

**Files.** src/core2/modules/budgets.ts, src/core2/modules/legislature.ts

**Notes.** Split out of gov-standins-other by the session that claimed it (claude/standins-other-credit-business).
