---
id: play-budget-line-names
title: "The budget screen shows each line by its Census name"
area: play
kind: wiring
priority: 3
status: done
claimed-by: claude/budget-line-names
pr: #4771
blocked-on:
milestone:
source: 'docs/coordination/play.md "Needs from other sessions" (line 147); triage in play-needs-play-147'
claimed-at: 2026-10-16T16:21:22.197Z
---

**What.** Budgets shows lines by their keys such as individualIncomeTax and healthAndHospitals, because the line data carries no names. Add each line's name from the Census state and local finance table to the budget line data, such as Individual income tax and Health and hospitals, and have the screen read it. The names are record data, not hand-written player text. The player would notice a readable budget.

**Rules.** No hand-written player text: names come from the Census table's own item labels, as data. One rule, all 56 places: the same labels for every place. Replace, never layer: the screen's key display is deleted.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body), the budget screen's rows for the town show a Census name for every line key, and a test lists any line key with no name. The owner plays it: opens Budgets and reads plain line names.

**Files.** src/core2/modules/budgets.ts, src/core2/data/budgets, src/bench/

**Notes.** Found while triaging play-needs-play-147.
