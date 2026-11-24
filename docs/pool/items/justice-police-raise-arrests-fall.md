---
id: justice-police-raise-arrests-fall
title: "Doubling a town's police line cut its total arrests by 38% in a year; trace why"
area: laws
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/police-raise-arrests
pr: #6321
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T12:45:49.188Z
---

**What.** In a played year of Agat, Guam (seed 103451a0fb375d47) with the local police lines doubled the day after the opening, all arrests fell from 56.9 to 35.2 against the control world, while minor-offense arrests rose from 4.47 to 6.60 (measured by the low-level offenses helper, Oct 25, on branch claude/justice-low-level-offenses; scratch file out/year3-guam.json). In Presidential Lakes Estates, New Jersey (seed 5ce7a243f4e018db) they fell from 16.1 to 12.2. More officers lower violent and property crime through the outcome web's police links (Chalfin and McCrary 2018), and the case flow's police service raises the share of crimes cleared (`policeServiceElasticity`); whether the two together should cut arrests this much is not traced.

**Rules.** Ask why: name the cause by file and line, or show it is a defect and fix it. Real rates check totals; they never pick one arrest.

**Done when.** A note here names, for the Agat run, how much of the fall comes from fewer crimes and how much from clearance, by file and line, against the research's sizes; and either the numbers are shown to follow from the sourced links, or the defect is fixed with a test that fails without the fix. **On screen.** Nothing yet: it would show on Politics → Campaigns and the election night results, and nothing there reads it.

**Time box.** 3 hours, Sonnet, no helpers; builds against nothing.

**Files.** src/core2/public-safety.ts, data/research/outcome-web/links.json

**Notes.** Filed by the laws lead, Oct 25.

Worker note (Claude, Oct 27): Agat, Guam (territory:GU:agat, seed 103451a0fb375d47), twin worlds, local police lines doubled the day after the opening, fiscal-year amendment only. Arrests did not fall on current main: 52.8 control vs 68.9 treated over twelve 30-day steps (+30%), 4.4 vs 6.3-6.4 a month while the line stood, back to 4.4 when it lapsed at the fiscal-year change (October 2025). Low-level arrests 3.93 to 6.74 per 1,000 (+71%, the sourced elasticity 0.71 on a doubled staffing). Burglary 13.9 to 9.0 and property 97.6 to 81.0 (the property link). Assault and robbery did not move (22.2 vs 22.3; 2.9 vs 2.9) although the sourced violent link is -0.34: public-safety.ts read only `crime.assault`/`crime.robbery`, while the crime engine also applies `crime.violent` (src/core2/data/crime/victimization.json webMeasures). Fixed in the PR for this item (offenseRate).
