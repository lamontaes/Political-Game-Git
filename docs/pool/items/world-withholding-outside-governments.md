---
id: world-withholding-outside-governments
title: "Income tax owed to a government with no treasury is paid to an obligation-backed outside flow"
area: world
kind: stopgap
priority: 2
size: M
status: done
claimed-by: claude/world-withholding-outside-governments
pr: #4752
blocked-on:
source: "split from gov-stopgap-budgets-faked-mechanic, Oct 16"
claimed-at: 2026-10-16T14:42:41.766Z
---

**What.** Income tax a worker owes a government with no treasury in the world (another state, or a county or city the world does not model) is not withheld at all, so the worker's pay is not reduced and no money moves (SG-WORLD-withholding-outside-governments). Give each such government an obligation-backed outside flow, so the tax is withheld from the paycheck and paid out of the town to a named outside payee, with the same record the treasuries use. A commuter from another state then sees that state's tax come out of the check.

**Rules.** Every dollar balances: pay falls by exactly the tax and an outside payee receives it. Replace, never layer: the unwithheld path is deleted. One rule, all 56 places: which governments tax a worker comes from the law chain of their residence.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56 with commuters from another state, seed named in the PR body) a named worker's pay is reduced by the other state's income tax and the amount is paid to an outside government account, shown by the paycheck record id and the outside payment record id, and SG-WORLD-withholding-outside-governments is resolved; the budgets test passes.

**Files.** src/core2/modules/budgets.ts, src/core2/accounts.ts, src/core2/data/stopgaps.json

**Notes.** Split from gov-stopgap-budgets-faked-mechanic.
