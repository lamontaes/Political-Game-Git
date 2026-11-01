---
id: elections-recall-counted-whole-weight
title: "A recall vote gives a counted voter record's whole turnout to remove or keep by the sign of its grievance"
area: elections
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: CTO ruling Nov 1 22:10 (amending Q1 of 18:20), from the review of governing/counted-vote-share
lead: governing
---

**What.** In src/core2/modules/recalls.ts (the recall vote, about line 987 on main), every voter's grievance g decides their side by its sign: a counted record standing for many residents adds its whole turnout to remove when g > 0 and to keep when g < 0. So a grievance of +0.01 moves every resident a record stands for, the same first-place effect the Q1 ruling replaced for candidate races (0.15 appeal units moved Lajas, Puerto Rico by 19.6 points). The grievance scale was never sized in appeal units, so the share cannot simply reuse the candidate slope. Size the grievance against a researched or estimated slope, and split a counted record's turnout between remove and keep by a logistic share of g, as a counted record's unpledged voters split in a race without party labels. Named voters keep their own side.

**Rules.** No dice: a share of a count is not a roll, and a named voter's side is their own grievance. One model, two tiers: the counted record reads the same grievance as a full person. Sliding scales: nothing flips at g = 0. Every new number is a parameter row tagged with its source and spread.

**Done when.** A test in a drawn place with its seed printed holds a recall vote and shows a counted record's turnout divided between remove and keep by the share of its grievance (worked from the formula, not the engine's function), a named voter voting their own side, and the result's totals matching the sum of the rows. The PR body names the slope's source and spread.

**Files.** src/core2/modules/recalls.ts, src/core2/data/elections/parameters.json (or the recalls module's parameters)

**Notes.** Found by the rules review of governing/counted-vote-share (Nov 1). The CTO gave it its own item in the 22:10 ruling.
