---
id: people-health-full-deaths-below-life-table
title: "Full people die at about a seventh of the SSA life table's rate in a game year (17 deaths against 120.8 expected over six drawn places)"
area: people
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
after:
standard: 2
model: sonnet
effort: medium
root: none
lead: lives
checked: fable 2026-11-10
---

**What.** Over one year from the opening in six drawn places, the full people (about 1,700 to 1,850 each) had 17 deaths where the SSA 2023 period life table expects 120.8, a ratio of 0.141. The resilience base scale was solved on two 10,000-resident towns where everyone was a full person, and a death comes only after a serious-illness onset when strain crosses the person's own line, with strain counted from the opening day. Find whether the shortfall is the opening-day start of strain, the lag from onset to death, or a scale that no longer fits the smaller full-person set, and make a game year's deaths follow the table. Seen: the town's deaths in the paper and in households, at about a seventh of the real rate today.

**Cause.** Measured: `node --import tsx scripts/health/mortality-band.ts mb1 mb2 mb3` on main d64255aa. The check itself is wrong, and the people it means to check die at about 0.63 of the table. (1) Found in code: scripts/health/mortality-band.ts takes the table's expected deaths over the people alive and full on the opening day, but divides it into `healthReport(core).deaths`, which counts every full person's death in the year. That includes people filled in later from the counts, mostly counted residents carried in already seriously ill (`carryCountedIllness`, src/core2/modules/health.ts) or filled in on the day they die. Over seeds mb1, mb2 and mb3 (place keys 4005800, 2552490 and territory:AS:seetaga), one played year each, `healthReport.deaths` read 73, 58 and 73 (204) against 30.2 expected, a script ratio of about 6.8. Only 19 of those deaths were people full on the opening day. So the script no longer reads 0.141, and it cannot check the band either way. The Oct 27 refit of `resilienceBaseRateScale` (0.097, src/core2/data/parameters.json) used this same script. (2) The opening cohort itself: 19 deaths against 30.2 expected (0.63). By age, under 45 died 1 against 1.5, 45 to 64 died 6 against 8.1, 65 to 79 died 8 against 17.5, and 80 and over died 4 against 3.3. Not a first-months effect: deaths are spread across the year (by month, mb1 0,0,0,0,3,0,0,0,1,1,0,0). The mechanism (strain from the opening against a unit-exponential line, memoryless, so starting at zero is right) is sound, so the shortfall is in the scale and the age shape of the condition weights, read through a check that counted the wrong deaths.

**Fix.** (1) Fix scripts/health/mortality-band.ts so its numerator and denominator are the same people: record the ids alive and full on the opening day, and count as deaths only those ids not alive at the end. Print per place, and pooled, the cohort's deaths against expected, by age band (under 45, 45 to 64, 65 to 79, 80 and over), and print separately the deaths of people who became full during the run, so that number is never mixed in. (2) Refit `resilienceBaseRateScale` with the fixed script over the same 24 seeds the Oct 27 refit used (sr1 to sr16 and m01 to m08, one year each, one heavy run at a time per the heavy-runs skill), until the pooled cohort ratio is inside 0.8 to 1.2. Update the parameter's citation with the new runs. (3) If the pooled ratio is in band but ages 65 to 79 stay below 0.8 of the table while other bands are in band, do not tune by age. Write the per-band numbers in the PR body and file one item for the condition pack's weights at those ages (data/research/health/chronic-condition-pack-2026.json). No roll is added; the table still only checks totals.

**Time box.** 6 hours for one Sonnet session, most of it the 24 one-year runs. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: a death follows strain against the person's own line, never a roll. Totals only: the life table checks the year's deaths, it never picks who dies. One rule, all 56 places. Every dollar balances.

**Done when.** A second session runs the fixed scripts/health/mortality-band.ts over one year in six drawn places it names with seeds. It sees the cohort's deaths and the newcomers' deaths printed apart, and the pooled cohort ratio inside 0.8 to 1.2 with older bands dying more than younger ones. With `MORTALITY_YEARS=3` in two of those places, the ratio stays in band. The health and mortality tests pass.

**Waits on.** Nothing.

**Files.** scripts/health/mortality-band.ts, src/core2/data/parameters.json, src/core2/modules/health.ts, data/research/health/chronic-condition-pack-2026.json

**Notes.** TODO

Checked Oct 20 (claude/political-game-pool-8defjq), not fixed. Not a first-year transient: St. Francis, Kansas (seed mb1:1) over four years from the opening, deaths among the people alive at each year's start against the table for their ages: year 1, 7 of 20.2 expected; year 2, 9 of 21.7; year 3, 6 of 23.5; year 4, 4 of 25.5. That is 26 of 90.9 (0.29), and the expected count rises as the cohort ages while the deaths do not. Not demotion either: no full person had been returned to the counts by year 2 (checked with `isDemoted`). The full people skew old (30 percent are 65 or older, mean age 54.6), so the table expects more deaths here than in a general town. The strain mechanism (src/core2/modules/health.ts: a person's own resilience line, strain from the plan's start, onset when it crosses, death after a serious illness) is where to look first; the base scale 0.106 was solved on 10,000-resident towns where every resident was a full person.

Oct 29 (CTO, second account): PR #5518 closed as stale under the owner's standing approval; back to open. Branch `claude/health-full-deaths` is kept; claiming this item takes it over.

**Notes (Fable's check, Nov 10).** How to find the cause: with scripts/health/mortality-band.ts in the six places named, split a year's deaths by month from the opening and by age band, and compare each against the table. A shortfall only in the first months points at strain starting from zero on the opening day; one at every month points at the onset-to-death lag or at a scale fitted on towns of 10,000 full people. The fix then makes a year's deaths follow the table, in src/core2/modules/health.ts, with no roll.

Nov 11 (cause finder for Fable B): measured on main d64255aa with a copy of the script that kept the opening cohort's ids and split deaths by tier and age band (the probe stayed outside the repository). The 0.141 from October is gone. The script now over-counts, because it adds the deaths of people filled in during the year, and the cohort itself dies at 0.63 of the table, short mostly at ages 65 to 79. The fix corrects the check first, then refits the one scale with it.
