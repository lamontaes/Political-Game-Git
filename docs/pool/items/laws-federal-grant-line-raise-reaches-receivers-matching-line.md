---
id: laws-federal-grant-line-raise-reaches-receivers-matching-line
title: "A bill that raises a federal grant line reaches a state or town only as aid, so its highways, schools and hospitals lines never move"
area: laws
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: opus
effort: medium
root: none
source: Laws and effects (Sonnet), Nov 17, 2026, reading `train/nov17` 71cd7e31; Budgets said it owns no such mapping (#9747, 6944832902); CTO agreed to wait for #9928 (6944968802)
---

**What.** When Congress raises a federal grant line (transportation, education, health), the bill is paid to every state, county and town as extra federal aid. The receiver's own matching spending line (highways, schools, health and hospitals) does not rise, so `budget.highways-added-pct`, `budget.schools-added-pct` and `budget.healthAndHospitals-added-pct` stay at zero and the research links that start from them (for example `highways-spending-to-poor-roads`) never fire for a federal bill. The law-wiring table keeps the federal transportation, education and health rows at "web missing" for this reason. Seen: a dev mode budget bill on federal transportation, and a year later the town's road condition and the bill card's line for what the money reached.

**Cause.** Found in code: `grantLineChanges` (src/core2/budgets-treasury.ts) turns a bill's change on a line in `DATA.aid.fromLines` into `AidPayment` rows on the receiver's revenue line (`flow.revenueLine`), paid at the monthly close and charged to the federal line. Nothing writes the receiver's `spendingMinor` for its matching line, and `budgetLineAddedPct` (src/core2/gov-measures.ts) and `townLineAddedPct` read only `spendingMinor` against `lineWithoutBills`. A line adder (`registerLineAdditions`, src/core2/budgets-line-payers.ts) is not the answer: `lineWithoutBills` subtracts a law's dollars from the line, so the dollars must already be in `spendingMinor`.

**Fix.** Build it after #9928 (Budgets) folds, because it works in the fiscal year's opening, which #9928 rewrites (`firstBudgetStart`, `tierBaseOf`, `budgetDrivers`).

1. Data: in `src/core2/data/budgets/treasury-spending.json`, under `aid`, a `matchLines` table from a federal grant line to the receiving line it pays for: transportation to highways, education to schools, health to healthAndHospitals. Lines with no receiving counterpart (community and regional development, income security) have no row and stay as aid.
2. When a receiver's budget opens for a fiscal year, for each federal line in `matchLines` carrying a bill's change (`enactedBudgetChanges`), raise the receiver's matching line by the change times the receiver's share of that line's grants (the same share `grantLineChanges` uses: the grant's part of the base aid), through `amendBudget` with the federal bill as the measure, so the line carries the bill's name. A cut lowers it by the same rule, to no less than zero. Repeal and reversal follow from the carried change.
3. Three coverage rows in `src/core2/data/outcome-web/coverage.json` (federal transportation to `highways-spending-to-poor-roads`; federal education to the schools link from `budget.schools-added-pct`; federal health to the link from `budget.healthAndHospitals-added-pct`), each naming this pass as what carries it.
4. No second engine: the receiver's line is raised through `amendBudget`, and the existing readers pay it.

**Time box.** 3 hours.

**Rules.** An effect is a read, not a record: the receiver's line is read by the engine that pays it and by the added-percent measure. One rule, all 56 places: the match table is data, and no state or town is named. No dice: the raise is the bill's change times the receiver's share. Replace, never layer: do not add a parallel "federal aid spent" ledger beside the line.

**Done when.** A second session starts the bench at a drawn place and writes down its name and seed, opens dev mode's Bills panel with Congress as the body, introduces a budget bill that raises federal transportation a fifth, decides it, runs a year, and reads that the state's and county's highways line rose by their share of the grants, the added-percent measure moved, and the bill card names the bill and its dollars; repealing the bill returns the line. `scripts/law-wiring/check.ts --only budget-line:transportation,budget-line:education,budget-line:health` reads "web wired" for the three rows at a place it draws.

**Waits on.** #9928 (Budgets, family 17 part 2) merged into `train/nov17`.

**Files.** src/core2/budgets-treasury.ts (`grantLineChanges`, the fiscal year's opening); src/core2/modules/budgets.ts (`amendBudget`); src/core2/data/budgets/treasury-spending.json; src/core2/data/outcome-web/coverage.json; src/core2/gov-measures.ts (read only)

**Notes.** Nov 17, 10:20Z: the read above is from `train/nov17`; check `#9928`'s head before building. Budgets' PR 2 changes who pays aid (`budgets-treasury.ts:1534`), not where it is spent. The federal defense and international affairs lines have no receiver line; their rows stay partly for another reason (nobody receives them).
