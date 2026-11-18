---
id: core-state-country-pay-from-regional-months
title: "A state's and the country's pay is read from what their jobs pay for each resident, so a pay slide reaches their races and addresses"
area: core
kind: feature
priority: 2
size: S
status: in-pr
claimed-by: account lead thread "Give rivals more than one issue"
pr: 9382
blocked-on:
after: core-outcome-web-follows-only-the-played-town
source: account lead thread "Give rivals more than one issue", Nov 14 (next PR after #9342, coordinator)
lead: governing
standard: 2
model: opus
effort: medium
root: none
---

**What.** After #9342 a state's and the country's term read covered jobs and prices from their own records but not pay, the area the minimum wage, cash assistance and the income-security line answer. A governor's or President's race after a term where pay slid read nothing for it. Seen: seed t3 (Goldsmith, Indiana, key 1828296) and every drawn place, where `pay` is absent from the state's and the country's read before this change and present after it.

**Cause.** Found in code: `jurisdictionFigures` in src/core2/data/term-read/areas.json listed no measure for `household.income`, because the regional and macro months keep no income field; they do keep each region's jobs, hourly earnings and people, whose product over people is what the jobs pay for each resident.

**Fix.** `earnedPerResident` in src/core2/regional-model.ts (jobs times hourly earnings over people, summed over a state's regions, or over every region for the country) is the state's and the country's `household.income`; poverty is not kept for a state or the country, so a pay read is the income measure alone and no poverty figure is invented.

**Time box.** 2 hours for an Opus session.

**Rules.** One model, two tiers: a state and the country read the same measure and direction as the played town, from the counted records they keep. Replace, never layer: the figure joins the one `jurisdictionFigures` map, with no second reader.

**Done when.** A second session sees, at a place drawn from all 56 (name the place and seed), a governor's or a President's race and address after a term where pay slid whose read for pay traces to the regional months by record id, in a played world, with the lean visible in the campaign's platform shares.

**Waits on.** core-outcome-web-follows-only-the-played-town (#9342).

**Files.** src/core2/regional-model.ts, src/core2/term-read.ts, src/core2/data/term-read/areas.json, src/core2/term-read-figures.test.ts

**Notes.** Filed Nov 14 by hand with its PR. Poverty for a state and the country stays open: it needs the income distribution the tier keeps only by fifth.
