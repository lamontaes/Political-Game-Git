---
id: world-stopgap-jobs-faked-mechanic
title: "Stopgaps in jobs (faked-mechanic): 6 open"
area: world
kind: stopgap
priority: 2
size: L
status: open
claimed-by:
pr:
blocked-on:
after: world-jobs-opening-seekers
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/jobs.ts, kind faked-mechanic"
claimed-at: 2026-10-19T22:26:02.801Z
---

**What.** The stopgap row(s) SG-WORLD-jobs-opening-seekers, SG-WORLD-jobs-layoff-decider, SG-WORLD-jobs-counted-choices, SG-WORLD-jobs-agreement-pinned, SG-WORLD-jobs-counted-retiree-income, SG-WORLD-jobs-offer-deadline-reminder in src/core2/modules/jobs.ts mark a shortcut that is still live in play. Today the opening's job seekers are only the neediest jobless adults, layoffs use a stand-in decider, counted workers choose by a stand-in, agreements are pinned, counted retirees get a stand-in income, and offer deadlines have no reminder. The row stays open until the real mechanic replaces the fake, or the feature that needs the fake is deleted. This item replaces it and clears the row in src/core2/data/stopgaps.json.

**Rules.** One model, two tiers: counted jobless adults seek, are hired and retire under the same rule as full people. No dice: hires and layoffs come from books, fit and need, never a monthly chance. Replace, never layer: the fake is deleted in the same change, and a row is never closed by deleting it without the mechanic. Numbers go in the parameter table tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, the seed and place named in the PR body), a counted retiree's income, a layoff decision and an offer reminder each appear with job, decision and reminder record ids, and the unemployment rate matches the nation's, named by record id. The test in src/core2/jobs.test.ts and the stopgap tripwire test show the row resolved in stopgaps.json. The owner plays it: lose a job and see the offer reminder arrive before the deadline.

**Files.** src/core2/modules/jobs.ts, src/core2/data/stopgaps.json, src/core2/jobs.test.ts

**Notes.** First row: The opening's job seekers are the jobless working-age adults whose money covers the fewest days, as many as the nation's unemployment rate implies against the generated jobs; the other jobless adults sit outside the mode

Oct 20: Switched from blocked to the automatic after: gate on world-jobs-opening-seekers, so it opens by itself the moment those items are done.
