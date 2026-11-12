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
blocked-on: core-country-tier-more-jobs-than-workers-in-outcome-web-tests
source: governing lead, Nov 1 (review of governing/traits-endorsements-heard: the named seed's other failing case)
lead: governing
after:
model: haiku
effort: low
root: none
checked: fable 2026-11-10
---

**What.** src/core2/modules/campaigns.traits.test.ts, the case "running for office follows honesty-humility at about the researched rate, among newcomers", fails in Cruz Bay, U.S. Virgin Islands with GOLDEN_PATH_SEED=a4eca5af1791dc3df7527d94791fb774b3fcdd52 (the first draw, suffix :0): the candidacy.run odds ratio between the top and bottom thirds of lean is 3.26, and the test allows under 2.67, which is the study's 1.21 times the test's 2.2 slack. It fails the same way on main's own code. The slope is read with every reason total moved so one in twenty would run, so the ratio depends on how many newcomers weigh running there and how many of their reason totals sit in one pile near the line.

**Cause.** Measured: the odds ratio no longer fails. On main b4422d346c (Nov 10) the file passed 9 of 9 with GOLDEN_PATH_SEED=a4eca5af1791dc3df7527d94791fb774b3fcdd52 and with a fresh seed; on main 7eb81eb0 (Nov 11) it passed 9 of 9 with GOLDEN_PATH_SEED=f73d09f0137db12d. With the named seed on 7eb81eb0 the file now stops before any case runs, in Cruz Bay's world: 'The country tier holds counts that cannot be: US-VI: 45232.46 jobs for 44357.42 workers' (src/core2/modules/macro.ts line 476, from `playTo`, campaigns.traits.test.ts line 323). That is the cause written into core-country-tier-more-jobs-than-workers-in-outcome-web-tests: the played town's part of its state counts a counted job at its heads, which can exceed the people the household stands for (src/core2/modules/residents.ts `residentsPart`, line 2560), and `resolveCountryPart` (src/core2/country-model.ts line 1134) caps the workers but not the jobs.

**Fix.** Nothing to build here. When core-country-tier-more-jobs-than-workers-in-outcome-web-tests merges, rerun the file with the named seed and one fresh seed. If both pass 9 of 9, close this item with the two runs; if the running-for-office case fails again, write its odds ratio and the newcomers' reason totals at the line into the Notes and reopen with Needs cause.

**Time box.** 1 hour for one Haiku session, after the country tier fix merges. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: the ratio checks totals and never picks one person's outcome, so a fix reads more of a newcomer's own circumstances in the run decision, or states why the band is wrong for a town that size. One rule, all 56 places: a flip by seed is a defect, so the fix makes the ratio hold across drawn towns. Ask why: name by record the calls, the distinct reason totals and the pile at the line. Never widen the test's 2.2 slack or skip the case.

**Done when.** A second session runs the running-for-office case in src/core2/modules/campaigns.traits.test.ts with GOLDEN_PATH_SEED=a4eca5af1791dc3df7527d94791fb774b3fcdd52 in Cruz Bay, U.S. Virgin Islands and on three fresh drawn places named with their seeds, and sees each pass and report its odds ratio. The PR names by record why the ratio read 3.26 there (the newcomers' calls, distinct reason totals and the share at the line).

**Waits on.** core-country-tier-more-jobs-than-workers-in-outcome-web-tests.

**Files.** src/core2/modules/campaigns.traits.test.ts, src/core2/modules/candidacy.ts, data/content/trait-decision-gaps.json

**Notes.** Found Nov 1 by the governing lead's review of governing/traits-endorsements-heard (head ed93f41c81): with the named seed the endorsement case passes and this case fails; it fails the same way on main. Read: OWNER-DECISIONS (no dice), searched docs/pool/items for candidacy.run, running for office and Cruz Bay: no match. The giving ratio in Lyndon Center, Vermont is traits-donate-reasons-too-flat-in-some-towns.

**Notes (re-run, 2026-11-10, main b4422d346c).** npx vitest run src/core2/modules/campaigns.traits.test.ts --maxWorkers=1 with OCD_STORAGE_OVERRIDE and NODE_OPTIONS=--max-old-space-size=8192, GOLDEN_PATH_SEED=a4eca5af1791dc3df7527d94791fb774b3fcdd52: 9 of 9 passed. Fresh draw GOLDEN_PATH_SEED=sweep-fresh-<random> (number not kept): 9 of 9 passed. Green on both. Proposed for the CTO: drop as fixed on main.

Cause finder (Nov 11, 2026, for Fable B): two runs on main 7eb81eb0. The fresh seed passed 9 of 9; the named seed now fails in the country tier's check before the traits cases run, which is another item's cause. The odds ratio itself has not failed since Nov 1.
