---
id: tests-budget-season-line-moves-after-adoption
title: "The budget-season tests expect a passed line to stay put all year and it does not"
area: office
lead: laws
kind: bug
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: laws-local-budget-amendments-need-a-recorded-cause
blocked-on:
model: opus
effort: medium
root: none
source: "Account lead builder, Nov 15 (pinning the office-day tests)"
checked:
---

**What.** The first and third cases of `src/core2/office-day-budget-season.test.ts` fail at every place they reach on the Train. Seen: at Lincolnshire KY the schools line in force at the year's end is 24,191,828 where the test expects the 25,182,405 the council passed (last year's 24,182,405 plus the mayor's 1,000,000).

**Cause.** Measured: `BUDGET_SEASON_SEED=pin-bs` with `BS_ONLY` limiting the loop to one draw gives Golovin AK (draw 0, key 0229180) a paid schools line of 5,149,924 against 3,516,211 passed, Lincolnshire, Kentucky (draw 1, key 2146540, seed 203b6e736407d91947e9898d5938b4cc3259c6d4c92aab76f201840cd2556aae) the year-end line above with `receiptsFactor` 1 (so not a receipts rescale), and Trenton UT (draw 4, key 4977230) 20,796,815 against 15,874,979; Ortley SD, where the amend case once saw the council halve a change, no longer amends. The mover is a council amendment with no recorded cause (item laws-local-budget-amendments-need-a-recorded-cause).

**Fix.** Find what moves the line (read the budget row's writers in src/core2/modules/budgets.ts and the law-reach budget readers), The engine fix is in laws-local-budget-amendments-need-a-recorded-cause; this item only reruns the cases after it lands. Do not change the test.

**Time box.** 4 hours for one Opus session.

**Rules.** Skill `pinned-tests`; never loosen a test to get green; one engine per mechanic.

**Done when.** The first and third cases pass at Lincolnshire KY and Trenton UT (and one place where the council amends), pinned with seeds, in about a minute each, and a second session reruns them on main.

**Waits on.** Nothing.

**Files.** src/core2/office-day-budget-season.test.ts, src/core2/modules/budgets.ts

**Notes.** Found while pinning (Nov 15). Place names and draws are above.
