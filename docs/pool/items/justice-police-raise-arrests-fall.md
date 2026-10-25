---
id: justice-police-raise-arrests-fall
title: "Doubling a town's police line cut its total arrests by 38% in a year; trace why"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In a played year of Agat, Guam (seed 103451a0fb375d47) with the local police lines doubled the day after the opening, all arrests fell from 56.9 to 35.2 against the control world, while minor-offense arrests rose from 4.47 to 6.60 (measured by the low-level offenses helper, Oct 25, on branch claude/justice-low-level-offenses; scratch file out/year3-guam.json). In Presidential Lakes Estates, New Jersey (seed 5ce7a243f4e018db) they fell from 16.1 to 12.2. More officers lower violent and property crime through the outcome web's police links (Chalfin and McCrary 2018), and the case flow's police service raises the share of crimes cleared (`policeServiceElasticity`); whether the two together should cut arrests this much is not traced.

**Rules.** Ask why: name the cause by file and line, or show it is a defect and fix it. Real rates check totals; they never pick one arrest.

**Done when.** A note here names, for the Agat run, how much of the fall comes from fewer crimes and how much from clearance, by file and line, against the research's sizes; and either the numbers are shown to follow from the sourced links, or the defect is fixed with a test that fails without the fix.

**Files.** src/core2/public-safety.ts, data/research/outcome-web/links.json

**Notes.** Filed by the laws lead, Oct 25.
