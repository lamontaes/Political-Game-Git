---
id: gov-stopgap-budgets-treasury-faked-mechanic
title: "Stopgaps in budgets-treasury (faked-mechanic): 2 open"
area: gov
kind: stopgap
priority: 2
status: done
claimed-by: claude/pool-gov-budgets
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/budgets-treasury.ts, kind faked-mechanic"
claimed-at: 2026-10-20T00:26:41.427Z
---

**What.** Two faked-mechanic stopgaps remain in `budgets-treasury.ts`. SG-GOV-public-employers-outside: the opening's public employers in town (schools, police, fire, county offices) pay workers from outside accounts, so the treasury's lines for that work pay the outside account instead of those employers. SG-GOV-opening-award-level: when the federal Social Security line is cut or raised, the retirement awards the opening wrote for full people keep their amount. Link each public employer to its government's treasury and let the award level follow the line. The player would notice a school budget cut reaching the teachers' pay and a Social Security cut reaching the retirees he knows.

**Rules.** Placeholders: each row closes only because the replacement runs, never by deleting the row; An effect is a read, not a record: payroll draws on the treasury's line when it is paid, and awards read the law's level on their next due date; The chain is the acceptance: follow one budget dollar to a named teacher's pay and one Social Security dollar to a named retiree; One model, two tiers: counted workers and retirees follow the same rule as full ones times their count; No dice: the budget and the law decide pay and awards; One rule, all 56 places: no place named in code; Replace, never layer: the outside-account payroll route is deleted in the same change; Speed: payments post through existing payroll and contract writers.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): a cut to a school line lowers a named teacher's next paychecks via the school's treasury draw, and a Social Security change changes a named full retiree's award from the next due date via `setStandingContractAmount`; both rows close in `stopgaps.json`. Tests beside `src/core2/budgets.test.ts` and the finance state test. The owner plays it: cuts a school line and hears from a teacher about the smaller check.

**Files.** src/core2/budgets-treasury.ts, src/core2/finance-state.ts, src/core2/modules/work.ts, src/core2/data/stopgaps.json

**Notes.** First row: The opening's public employers in town (schools, police, fire, county offices) pay their workers from outside accounts; the treasury's lines for that work pay the outside account instead of those employers.

**Split (Oct 16).** Two rows, two engines: the public employers paid from outside accounts is `gov-public-payroll-wire` (the core's `fundPublicPay` exists and nothing calls it), and the opening retirement awards that keep their amount is `core-income-award-level-change`. This item is done when both are.

Checked Oct 20 (claude/political-game-pool-3xfqef-5): both rows are `resolved` in `src/core2/data/stopgaps.json` (SG-GOV-public-employers-outside by `gov-public-payroll-wire`, #4623; SG-GOV-opening-award-level by `core-income-award-level-change`, #4661), and `budgets-treasury.ts` holds no stopgap call. Nothing is left to build; the CTO can close it as done on its children.

Oct 20: Both rows are resolved in stopgaps.json (#4623, #4661) and nothing is left to build.
