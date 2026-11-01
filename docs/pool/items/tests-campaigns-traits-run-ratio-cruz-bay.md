---
id: tests-campaigns-traits-run-ratio-cruz-bay
title: "The traits test's running-for-office odds ratio is 3.26 in Cruz Bay, U.S. Virgin Islands, above its ceiling of 2.67"
area: elections
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/modules/campaigns.traits.test.ts, the case 'running for office follows honesty-humility at about the researched rate, among newcomers', fails in Cruz Bay, U.S. Virgin Islands with GOLDEN_PATH_SEED=a4eca5af1791dc3df7527d94791fb774b3fcdd52 (the first draw, suffix :0): the candidacy.run odds ratio between the top and bottom thirds of lean is 3.26, and the test allows under 2.67, which is the study's 1.21 times the test's 2.2 slack. It fails the same way on main's own code, so it is red by draw on main and not a branch's fault. The slope is read with every reason total moved so one in twenty would run, so the ratio depends on how many newcomers weigh running there and how many of their reason totals sit in one pile near the line. The cause has to be named by record before anything is changed: the calls, the distinct reason totals and the pile at the line in Cruz Bay, against a drawn town where the ratio is inside the band.

**Rules.** No dice: the ratio checks totals and never picks one person's outcome, so the fix reads more of a newcomer's own circumstances in the run decision, or states why the band is wrong for a town that size. One rule, all 56 places: a flip by seed is a defect, so the fix makes the ratio hold across drawn towns. Never widen the test's 2.2 slack or skip the case to get a pass.

**Done when.** src/core2/modules/campaigns.traits.test.ts running-for-office case passes with GOLDEN_PATH_SEED=a4eca5af1791dc3df7527d94791fb774b3fcdd52 in Cruz Bay, U.S. Virgin Islands and on three fresh drawn places named in the PR body with their seeds, each reporting an odds ratio inside the band, and the PR names by record why the ratio read 3.26 there (the newcomers' calls, distinct reason totals and the share at the line).

**Files.** src/core2/modules/campaigns.traits.test.ts, src/core2/modules/candidacy.ts, src/core2/data/trait-decision-gaps.json

**Notes.** Found Nov 1 by the governing lead's review of governing/traits-endorsements-heard (head ed93f41c81): with the named seed the endorsement case passes and this case fails; it fails the same way on main. Read: OWNER-DECISIONS (no dice), searched docs/pool/items for candidacy.run, running for office and Cruz Bay: no match. The giving ratio in Lyndon Center, Vermont is traits-donate-reasons-too-flat-in-some-towns.
