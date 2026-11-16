---
id: budgets-revenue-rebudgeted-yearly
title: "Budgets re-budget their revenue every year, so the played state and county move like other states"
area: gov
kind: bug
priority: 2
size: M
status: merged
standard: 2
claimed-by:
pr: 9480
after: metrics-output-numbers-registry
blocked-on:
lead: laws
model: opus
effort: high
root: none
source: docs/design/output-numbers.md (#8926), owner's ask of Nov 12
---

**What.** Budgeted revenue is the same dollar figure every year at the county, state and nation: a budget that is never re-budgeted. Spending is that fixed base scaled by what the government collected last fiscal year over the plan, so a bad collection year cuts the next year's spending (a state budget fell $12 billion in one year in the six-year game). Other states already budget from the country tier's ledgers; the played state and county use the fixed base, so two engines budget a state today. Seen: Budgets' and Metrics' revenue for the county, state and nation, moving year to year.

**Cause.** Found in code: `publishedBudgetFor` (src/core2/modules/budgets.ts:771 to 774) never reads the fiscal year or today's residents. Other states already budget from the country tier's ledgers (src/core2/modules/outside-budgets.ts).

**Fix.** The played state and county use the same rule other states use: revenue from the last twelve months' collections under the law in force. Delete the fixed path.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic (owner, Oct 27): the engine that already holds the figure writes it once, and every view reads that row; a screen that computes its own version is a duplicate to delete. Wire to the world (owner): budgeted revenue is read by the spending scale and the Budgets screen, proven in a generated world, for the whole module at county, state and nation, not the named example. Replace, never layer (owner, Oct 14): the old counting code is deleted in the same pull request, and the pull request body counts what was removed.

**Done when.** A second session plays three fiscal years in a drawn place, naming the place and seed, and each level's budgeted revenue differs year to year with its source line.

**Waits on.** metrics-output-numbers-registry.

**Files.** src/core2/modules/budgets.ts, src/core2/modules/outside-budgets.ts

**Notes.** From docs/design/output-numbers.md (#8926), owner's ask of Nov 12.

Built (Account lead thread, Nov 15). Measured at Washington, Kansas (599e6f66e9c1d25a) before the change: federal revenue 5,368,514M, state 31,258M and county 9M every fiscal year while the treasuries collected far more (federal 6.7 trillion in the first year). Cause confirmed in `legislatedBudget` (src/core2/modules/budgets.ts): only spending was scaled by last year's collections; revenue lines were the Census base every year. Fix: `collectionsOverBase` (the government's own receipts over the fiscal year before, borrowing left out, over that year's Census base) scales every revenue line of the nation, state and county each year, in the published mix; spending keeps `receiptsFactor` (state and county follow it; the nation's spending is voted and holds the base). The fixed revenue path is deleted. Proof: `src/core2/budgets-revenue-rebudgeted.test.ts`.
