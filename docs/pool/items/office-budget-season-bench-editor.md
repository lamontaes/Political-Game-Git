---
id: office-budget-season-bench-editor
title: "The bench lets a mayor edit the budget lines the Send the budget act sends"
area: play
kind: feature
priority: 3
size: S
status: done
claimed-by: claude/political-game-pool-yucp92-ae
pr: #5599
blocked-on: office-budget-season-mayor-act
source: added with npm run pool -- add
claimed-at: 2026-10-20T07:51:36.925Z
---

**What.** The Send the budget act takes prepared line changes (prepareAct with a budget map), but the bench has no way for the player to write them. Add a control in the office panel where a mayor or county executive sets a change to each budget line before the council votes, from the department requests shown beside it. A player would see the lines, change a few and send.

**Rules.** Replace, never layer: the control sits in the office panel's act list beside the other acts. No hand-written player text: line names and results come from the data and the English engine. This is a game, not a spreadsheet: a few lines and a number each, not a form.

**Done when.** In the bench (src/bench/office.ts) a controlled mayor in the budget season sees Send the budget, edits at least one line, sends it, and budgetPriorities for the government show those changes; a bench test beside src/bench covers it and a screenshot shows the panel.

**Files.** src/bench/office.ts, src/bench/data/controls.json

**Notes.** Follow-up from office-the-budget-season (PR #5217); the act itself is in src/core2/office-day-acts.ts.
