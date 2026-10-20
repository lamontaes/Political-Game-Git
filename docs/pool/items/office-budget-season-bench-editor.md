---
id: office-budget-season-bench-editor
title: "The bench lets a mayor edit the budget lines the Send the budget act sends"
area: play
kind: feature
priority: 3
size: S
status: in-pr
claimed-by: claude/political-game-pool-yucp92-ae
pr: #5599
blocked-on: office-budget-season-mayor-act
source: added with npm run pool -- add
claimed-at: 2026-10-20T07:51:36.925Z
---

**What.** The bench's Budgets sheet lets an executive edit lines through setPriority in src/bench/budget.ts, which writes setBudgetPriorities straight into the budgets engine at any time of year. The mayor act now exists (propose-budget in src/core2/office-day-acts.ts, with budgetProposalDue opening the lead-time season), and it reads the player's lines from prepareAct(api, personId, "propose-budget", { budget: { changes } }). Change setPriority to prepare those changes for the act instead of writing them, keep the +/- controls on the budgets sheet in src/bench/play.mjs, and show in budgetView whether the season is open (from budgetProposalDue) and what is waiting to be sent, so the player sees the lines they will send and the act sends them. The direct write is deleted, not kept beside the new path.

**Rules.** Replace, never layer: the direct setBudgetPriorities call in the bench is removed once the editor prepares the act, and the old route behaviour goes with it. An effect is a read: the council or board must read the sent priorities when it votes the budget, so the editor is proven by the vote, not by the prepared row. This is a game, not a spreadsheet: one control per line and one send, no form. No hand-written player text: line names come from line-names.json through lineName and any season words from the English engine. One rule, all 56 places: the season dates come from each government's fiscalYearStart, never a named place.

**Done when.** A test beside src/bench/office-deals.test.ts (budget-editor.test.ts) draws a place from all 56 with buildBenchWorld in a one-year played-world run on a seed the builder did not choose, makes the player the mayor, edits two lines outside the season (refused or only prepared) and inside it (prepared), runs the propose-budget act, and shows the council's vote reading those lines by the priorities record id and a budget record id.

**Files.** src/bench/budget.ts, src/bench/handler.ts, src/bench/play.mjs, src/bench/budget-editor.test.ts

**Notes.** Oct 20 (pool feeder): spec written; the blocker office-budget-season-mayor-act is done, and the bench still bypasses the act with a direct write (budget.ts setPriority).
