---
id: core-country-tier-more-jobs-than-workers-in-outcome-web-tests
title: "The country tier's own check finds more jobs than workers in the outcome web's world tests"
area: core
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/core-country-tier-jobs-over-workers
pr: #8852
after:
blocked-on:
lead: speed
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
claimed-at: 2026-11-11T17:14:29.664Z
merged-at: 2026-11-11T17:42:42.822Z
---

**What.** On main (Nov 11), src/core2/outcome-web.test.ts fails in drawn places with the tier's bookkeeping check: 'The country tier holds counts that cannot be: US-IN: 3318085.2067525927 jobs for 3317720.325176492 workers' (Earl Park, Indiana, GOLDEN_PATH_SEED=3110f870cf52c299, test 'low birth weight reads the sized link to drinking-water violations'), and US-CO 2805771.97 jobs for 2805763.44 workers on the same seed in Silver Plume, Colorado. The played town's part of its state puts in more jobs than workers each month, because a counted record can hold more jobs than the people it stands for, and the part caps the workers but not the jobs. Seen: dev mode's Run panel and Metrics tab, whose state rows show no more jobs than workers.

**Cause.** Found in code: src/core2/modules/residents.ts `residentsPart` (line 2560, `atWork(band, job.employer, job.heads)`) counts a counted member's job at its heads, both as people at work in the member's age band and as jobs at the employer. A counted job's heads can exceed the household's weight: a hire stands for the position's heads, not the seeker's weight (src/core2/modules/jobs.ts line 3716), and a fill-in hands its jobs' heads to other counted jobs at the same employer (residents.ts line 2306). So the part counts more people at work in a band than the band has adults. src/core2/country-model.ts `resolveCountryPart` (line 1134) then caps each band's workers at its adults and leaves the jobs as they were, and `putInPart` adds both to the state, so the state holds more jobs than workers and `countryProblems` (line 1727) fails with bookkeeping on. Measured: Earl Park, Indiana (1819450, seed 3110f870cf52c299, the test's world: `generatedOpening` two-level, population 1,500, `WORLD_MODULES` and the outcome web, main d64255aa): the part's jobs and workers agree in months 1 and 2, differ by 364.88 in month 3 (exactly the failing message's 3,318,085.21 minus 3,317,720.33) and by 1,861 by month 14, when the raw count shows 6,544 at work among 6,034 adults.

**Fix.** In src/core2/modules/residents.ts `residentsPart`, count a counted member's job as `Math.min(job.heads, weight)` people at work and the same number of jobs at its employer (one `atWork` call with that number), so the part never puts more people at work in a band than the people the member stands for, and its jobs equal its workers. Do the same for the unplaced share (line 2568): give a band at most what is left of its adults. Then in src/core2/country-model.ts `resolveCountryPart`, when a band's workers are capped, scale the part's jobs by the same total (jobs times capped workers over counted workers), so a part can never carry more jobs than workers whatever its counts. Add a case to src/core2/country-model.test.ts: a part whose band counts more workers than adults resolves to jobs equal to its workers. The jobs engine's heads stay as they are; the heads beyond a record's weight are jobs that people elsewhere in the state hold, which the rest of the state already counts.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Red main comes first (owner, Oct 15): the outcome web's test is red by draw on main. Never weaken a check to get green: `countryProblems` stays as it is. One rule, all 56 places: the cap reads the part's own counts, and no place is named. One model, two tiers: a counted record stands for its weight in people at work, the same rule as a full person, who is counted once.

**Done when.** GOLDEN_PATH_SEED=3110f870cf52c299 npx vitest run src/core2/outcome-web.test.ts passes on main in Earl Park, Indiana, and on two fresh draws, each place and seed named. A second session then starts the bench in a drawn place (written down with its seed), runs two years in dev mode's Run panel with dev mode's bookkeeping on, and sees no 'counts that cannot be' error and the Metrics tab's state rows with no more jobs than workers.

**Waits on.** Nothing.

**Files.** src/core2/modules/residents.ts, src/core2/country-model.ts, src/core2/country-model.test.ts, src/core2/outcome-web.test.ts

**Files (red nobody-files, from PR #8725).** src/core2/country-model.ts, src/core2/modules/macro.ts, src/core2/outcome-web.test.ts

Nov 11, Fable B helper (red nobody-files): the same throw stops three bench tests once they wait for filing to open, on fresh draws with bookkeeping on: speech-screen in Princeton, Kentucky (2163138, run seed 362fee991b029cb1bc1dc590c89571803e917a574e0a9c846c021c972a435141, US-KY 2167073.68 jobs for 2166425.43 workers), campaign-day-controls in Glencoe, Minnesota (2723948, run seed b75dbbae1991d2b3cdc02014af4e59ec1367de905f1dfe67577ac65350b3ecc7, US-MN 2777964.46 for 2777213.16) and debate-answer in Sinajana, Guam (territory:GU:sinajana, run seed bdaf3175784ed14c82741e939ea1cb4f121b8c7d19c8805b6b11b1efda26d9c6, US-GU 76558.36 for 76274.61). With CORE2_BOOKKEEPING=0 all three pass on those seeds, so play is not stopped; the tests are.

**Notes.** Cause found (Nov 11, 2026, cause finder for Fable B): a probe built the test's own world for Earl Park with the seed above, advanced month by month with bookkeeping off, and read each month's `countryParts` row (jobs and workers) beside `residentsPart`'s raw counts. The difference starts in the month the raw workers first pass the adults in a band and equals the failing message to the cent.

**Notes (R2 for Fable B, Nov 11, 13:10 UTC).** The same cause is why a played world in Washington, D.C. still grows its jobs without bound once core-country-tier-empty-sector-prices-run-away-in-dc (#8810) ends the crash. The part D.C.'s town reports, as jobs over workers, month by month (place 1150000, world seed c2ff19100a2c2f424292deca7b7fe760abec51ebe682d9ad572706e6ff3ae925, #8810's branch): 378,048 over 378,048 in February, 789,218 over 500,912 in March, 2,159,314 over 502,103 in April (4.30), then 3.95 to 4.17 for the rest of the year. The state's jobs go from 378,246 to about 2.1 million. Charlotte Amalie, U.S. Virgin Islands (the part is 39.6% of its state) ends its year at 1.42 jobs per worker, and its state's jobs go from 42,483 to 61,949. Zillah, Washington ends at 1.027 on main. Because the part's jobs go into the state, they show up as the region's jobs growth, which the town's outside demand reads (`regionalFactors`), so the jobs engine hires against a count its own heads inflated. Making that demand read only the jobs outside the town was tried and does not shut it: D.C. reached 69 jobs per worker by August with it, and it moved ordinary worlds off main, so it was reverted. The fix above is the one to build. Its done-when should add a played year in D.C. on the seed above, with the part's jobs within a few percent of its workers each month.
