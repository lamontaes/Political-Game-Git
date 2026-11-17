---
id: history-opening-vacancy-from-leases
title: "Day one's vacant rentals come from the town's own leases, once renters move as renters do"
area: housing
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by: claude/history-opening-vacancy
pr:
after:
blocked-on:
lead: history
model: opus
effort: high
root: rc1-world-outside-town
source: CTO line 6954097447 on #9747 (16:27Z, Justice's B item 10, "History (leases from the century)"); Justice's measurements, comment 6952233032
checked:
---

**What.** Every town opens its rental stock at the national rental vacancy (6.75%), whatever its own renters did in the year before day one.
Seen: `src/core2/housing-construction.ts` `openStock` sets units = renters / (1 - `construction.vacancy.rental`).

**Cause.** Found in code and measured.

1. `openStock` (`housing-construction.ts:142`) reads the national rate.
2. The town's own leases (`housing-past.ts` `housingPast`, LEASE_SIGNED) can't stand in for it yet. The moves pass (`past-moves.ts` `withinRecords`, and departures) moves people by age only, owners and renters alike, so few renters signed a lease in the last year.
3. Measured at Godfrey, Georgia and Marienthal, Kansas (bench, Nov 17): about 7% of renter households signed in the year before day one, and 23% show the window's first day because the pass never moved them. Real renters move several times as often as owners.

**Fix.**

1. Research the yearly moving rate by tenure and age (ACS B07013 or B25038 by tenure) into `mover-rates-acs-2024.json`. The moves pass and the opening's years in place then read the renter or owner curve for each household.
2. Then `openingVacancy` (built on `claude/history-opening-vacancy`, commit below) sets each place's vacant rentals = the leases signed in the last year (weighted) × `rentalVacantMonths` ÷ 12. That replaces the national rate for every world that runs its housing past.
3. Calibrate `rentalVacantMonths` (TUNABLE, now 3.0) against HVS's 6.75% at drawn towns, only after step 1.

**Time box.** 3 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No dice; real rates set only strengths; one rule for all 56 places.

**Done when.** A second session starts a new game at a drawn place it writes down with its seed, turns dev mode on, and reads the town's rental vacancy on day one with the leases it came from. At drawn worlds the vacancy equals the last year's leases × months ÷ 12, about a quarter of renters signed in the last year, and towns differ.

**Files.** src/core2/housing-past.ts, src/core2/housing-construction.ts, src/core2/past-moves.ts, data/research/migration/mover-rates-acs-2024.json, src/core2/data/housing/parameters.json

**Notes.** Filed by the History lane, Nov 17, 2026. Work in progress on `claude/history-opening-vacancy`: `openingVacancy` is written but not proven. It needs step 1 first, or the months parameter would have to be about 12 to reach 6.75%, which would encode the defect. Stopgaps `SG-HIST-opening-vacancy-without-past` and `SG-HIST-opening-tenure-one-curve` are on that branch.
