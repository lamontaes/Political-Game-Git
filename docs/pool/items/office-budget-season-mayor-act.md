---
id: office-budget-season-mayor-act
title: "A mayor or county executive sends the budget as an act in its season and watches the council amend it"
area: office
kind: feature
priority: 3
size: M
status: done
claimed-by: claude/budget-season-act
pr: #5258
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T23:14:58.176Z
---

**What.** The mayor or county executive's "Send the budget" act now exists (PR #5217): between the proposal and the council's vote the executive's prepared line changes set the priorities the council votes. This item proves the rest of the chain for a local body. In a played year the council's vote after the mayor's own lines amends or keeps them, the budget takes effect on the fiscal year's first day, and a treasury payment on an amended line reaches a person.

**Rules.** The chain is the acceptance: follow one budget line from the mayor's act to the vote to the treasury payment to a person it reached. Ask why: the council's amendments keep reasons by record id. An effect is a read, not a record: the treasury reads the passed line when it pays.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place with a mayor and a city council, seed named in the PR body), the mayor sends lines with the send-budget act, the council's budget-vote roll call is on the record before the fiscal year starts, and a treasury close after the first day pays a line that differs from the carried-forward line, named by record id; test beside src/core2/office-day-send-budget.test.ts.

**Files.** src/core2/office-day-send-budget.test.ts, src/core2/modules/legislature.ts, src/core2/budgets-treasury.ts

**Notes.** Split from office-the-budget-season (PR #5217). That PR's test proves the act sets the priorities and the federal vote and payment; this item is the local half.
