---
id: laws-local-budget-amendments-need-a-recorded-cause
title: "A council amends its adopted budget at nearly every meeting with no cause on record"
area: laws
lead: laws
kind: bug
priority: 2
size: L
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: none
source: "Account lead builder, Nov 15, ruling 76 and 80 (measured while pinning the budget-season tests)"
checked:
---

**What.** A city council, county board or school board files a budget-line amendment to its adopted budget at nearly every meeting, so the year's lines drift far from what the council passed and the bills on a mayor's desk each month and the paper's budget stories name no reason. Seen: the council the player sits on takes up a line bill most meetings; the mayor signs or vetoes one monthly; the paper reports a budget change with no cause. Seen: the council's line bills, the mayor's desk and the paper's budget stories name why a line moved.

**Cause.** Measured: with `BUDGET_SEASON_SEED=pin-bs`, Lincolnshire KY (draws pin-bs:1, seed 203b6e736407d91947e9898d5938b4cc3259c6d4c92aab76f201840cd2556aae) ends the year with the schools line at 24,191,828 against the 25,182,405 its council passed, with `receiptsFactor` 1 (not a receipts rescale); Trenton UT (draw 4) ends at 20,796,815 against 15,874,979 passed; Williams SC amends the same way. Found in code: `fileLines` in src/core2/modules/world-legislating.ts files an amendment whenever members' stance on `budget-line:<name>` (stance times `budgetFullStanceShare` times the base) differs from the line in force by more than `budgetAmendmentMinShare`, and a majority backs it. A member's standing wish is the whole cause, so it recurs every meeting; `localBudgetAmendmentsPerMeeting` (1, ESTIMATED) is the only pace and is a cap. The owner dropped the stopgap for this threshold on Nov 10 ("too in depth"; docs/stopgaps/triage-2026-11-10/laws.md).

**Fix.** A body takes up an amendment to an adopted budget only for a cause the engine already keeps on record: receipts under or over what the budget planned (the treasury months' `collectedMinor` and `publicPayShortfallMinor`), aid received (`aidReceivedMinor`) or a grant accepted, a disaster record, a law that changes a line. Each amendment names its cause so the bill paper and the news say why. The pace comes from those causes and review dates; no typed count per year or per meeting and no cap (`localBudgetAmendmentsPerMeeting` goes away). A member's standing wish by stance moves a line at budget adoption, where it already acts. The same rule covers city council, county board and school board; the state and federal bodies are checked for the same loop. Do not change `memberBillCarryCost` (#8967): it limits how many policy bills a member carries, is a TUNABLE row (0.3, spread 0.1 to 0.6) and not a count of budget amendments.

**Time box.** 8 hours for one Opus session.

**Rules.** No dice: a recorded cause, never a seeded roll or a typed count, decides whether a body amends (`no-dice`). An effect is a read, not a record: the treasury, disaster and aid records are read when the body decides (`wire-to-the-world`). One model, two tiers: the rule reads the same for every body (`one-model-two-tiers`).

**Done when.** At Lincolnshire KY, Trenton UT and Williams SC (pinned seeds) a year of play shows each amendment with a named recorded cause and the amendment count per year follows those causes (counts reported before and after); the budget-season cases in src/core2/office-day-budget-season.test.ts pass unchanged; a second session sees the council's line bills and the paper's reason in the running game at a drawn place.

**Waits on.** The laws thread's open files (world-legislating.ts, budgets.ts), asked Nov 15.

**Files.** src/core2/modules/world-legislating.ts, src/core2/modules/budgets.ts, src/core2/data/campaigns/parameters.json, src/core2/data/stopgaps/laws.json

**Notes.** Nov 15: the two budget-season cases stay red as honest findings until this lands; they are not re-pinned. Related item tests-budget-season-line-moves-after-adoption.
