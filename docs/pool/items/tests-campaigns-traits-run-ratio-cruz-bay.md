---
id: tests-campaigns-traits-run-ratio-cruz-bay
title: "The traits test's running-for-office odds ratio is 3.26 in Cruz Bay, U.S. Virgin Islands, above its ceiling of 2.67"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: governing lead, Nov 1 (review of governing/traits-endorsements-heard: the named seed's other failing case)
lead: governing
after:
model: opus
effort: high
root: none
---

**What.** src/core2/modules/campaigns.traits.test.ts, the case "running for office follows honesty-humility at about the researched rate, among newcomers", fails in Cruz Bay, U.S. Virgin Islands with GOLDEN_PATH_SEED=a4eca5af1791dc3df7527d94791fb774b3fcdd52 (the first draw, suffix :0): the candidacy.run odds ratio between the top and bottom thirds of lean is 3.26, and the test allows under 2.67, which is the study's 1.21 times the test's 2.2 slack. It fails the same way on main's own code. The slope is read with every reason total moved so one in twenty would run, so the ratio depends on how many newcomers weigh running there and how many of their reason totals sit in one pile near the line.

**Cause.** Needs cause. Looked at src/core2/modules/campaigns.traits.test.ts (the run-for-office case) and src/core2/modules/candidacy.ts: the hypothesis is the number of newcomers weighing a run in Cruz Bay and the pile of reason totals at the line, and it was not shown by record. Measured: GOLDEN_PATH_SEED=a4eca5af1791dc3df7527d94791fb774b3fcdd52, Cruz Bay, U.S. Virgin Islands.

**Fix.** None until the cause is found.

**Time box.** 4 hours.

**Rules.** No dice: the ratio checks totals and never picks one person's outcome, so a fix reads more of a newcomer's own circumstances in the run decision, or states why the band is wrong for a town that size. One rule, all 56 places: a flip by seed is a defect, so the fix makes the ratio hold across drawn towns. Ask why: name by record the calls, the distinct reason totals and the pile at the line. Never widen the test's 2.2 slack or skip the case.

**Done when.** A second session runs the running-for-office case in src/core2/modules/campaigns.traits.test.ts with GOLDEN_PATH_SEED=a4eca5af1791dc3df7527d94791fb774b3fcdd52 in Cruz Bay, U.S. Virgin Islands and on three fresh drawn places named with their seeds, and sees each pass and report its odds ratio. The PR names by record why the ratio read 3.26 there (the newcomers' calls, distinct reason totals and the share at the line).

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.traits.test.ts, src/core2/modules/candidacy.ts, data/content/trait-decision-gaps.json

**Notes.** Found Nov 1 by the governing lead's review of governing/traits-endorsements-heard (head ed93f41c81): with the named seed the endorsement case passes and this case fails; it fails the same way on main. Read: OWNER-DECISIONS (no dice), searched docs/pool/items for candidacy.run, running for office and Cruz Bay: no match. The giving ratio in Lyndon Center, Vermont is traits-donate-reasons-too-flat-in-some-towns.
