---
id: history-opening-vacancy-from-leases
title: "Day one's vacant rentals come from the town's own leases, once renters move as renters do"
area: world
kind: feature
priority: 2
size: M
status: in-pr
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
2. The town's own leases (`housing-past.ts` `housingPast`, LEASE_SIGNED) can't stand in for it yet. A full renter's lease starts at the household's latest past move (`fullSince`, `housing-past.ts:153`), and the past's moves pass moves owners and renters alike. `past-moves.ts` `withinRecords` (line 297) runs the age rate alone (`-Math.log(1 - rate(placeId, age))`, about line 333) with no hold, and `moveRecords` applies only the children hold (line 232). The live moves engine applies `movesOwnerHold` (`modules/moves.ts:472`, `ownsHome` at line 392); the past never reads it.
3. Counted renters, most renters by weight, never reach the moves pass: their lease starts at the household's `since` (`countedOf`, `housing-past.ts:170`), which the opening's years in place sets (`opening-tenure.ts` `withYearsInPlace`, called from `src/bench/world.ts:693`). That runs the yearly rate of **leaving the county** (`departurePerYearByAge`) as if it were the rate of moving at all, with no tenure. The rate of any move is that plus `withinCountyPerYearByAge` (both in `mover-rates-acs-2024.json`). Tenure is not on a household when `withYearsInPlace` runs, so it either moves after tenure is set or reads what sets tenure.
4. Measured at Godfrey, Georgia and Marienthal, Kansas (bench, Nov 17): about 7% of renter households signed in the year before day one, and 23% show the window's first day because the pass never moved them. Real renters move several times as often as owners.

**Fix.**

1. In both of the past's passes (`withinRecords` and `moveRecords`), apply the live engine's owner hold to the household's tenure on day one (`ownsHome`'s rule, one rule), split so the age's average rate is unchanged: renters' rate = rate / (ownerShare x exp(-movesOwnerHold) + 1 - ownerShare), owners' = that x exp(-movesOwnerHold). The owner share by householder age is the world's own, counted from its dwellings on day one (everything from the simulation, owner, Nov 16), never the published share. Apply it to the spell that reaches day one at least; whether a current owner's earlier years were rented is a stopgap to register. `past-moves.ts` is the Lives lead's file (#8933): ask Lives before building. The same split goes into the opening's years in place (`yearsInPlaceOf`), which also adds the within-county rate to the leaving rate (cause 3), so the counted tier and the full tier run one rule.
2. Then `openingVacancy` (built on `claude/history-opening-vacancy`, commit below) sets each place's vacant rentals = the leases signed in the last year (weighted) × `rentalVacantMonths` ÷ 12. That replaces the national rate for every world that runs its housing past.
3. Source `rentalVacantMonths` from HVS's median months vacant for units for rent, never tuned to a published vacancy rate (everything from the simulation, owner, Nov 16).

**Time box.** 3 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No dice; real rates set only strengths; one rule for all 56 places.

**Done when.** A second session starts a new game at a drawn place it writes down with its seed, turns dev mode on, and reads the town's rental vacancy on day one with the leases it came from. At drawn worlds the vacancy equals the last year's leases × months ÷ 12 (the dev row shows both), and towns differ by their own renters' moves.

**Files.** src/core2/housing-past.ts, src/core2/housing-construction.ts, src/core2/past-moves.ts, src/core2/opening-tenure.ts, src/bench/world.ts, src/core2/data/housing/parameters.json

**Notes.** Filed by the History lane, Nov 17, 2026. Nov 17, 21:10Z: the Lives lead's session that owned `past-moves.ts` (#8933) is archived, and the CTO gave this item to History (16:27Z), so the next History session builds both passes. Work in progress on `claude/history-opening-vacancy`: `openingVacancy` is written but not proven. It needs step 1 first, or the months parameter would have to be about 12 to reach 6.75%, which would encode the defect. Stopgaps `SG-HIST-opening-vacancy-without-past` and `SG-HIST-opening-tenure-one-curve` are on that branch.

Nov 17, 21:40Z (History): built on `claude/history-opening-vacancy`.

- The opening's years in place now runs after the housing opening, on the rate of any move (leaving the county plus moving within it).
- Both it and the past's moves pass split that rate by the town home's tenure with `movesOwnerHold`, over the world's own owner share by age (`tenureScaleOf`, one rule).
- `rentalVacantMonths` is 2.8, from HVS 2024's median months vacant.
- Homes in the county's other places get their tenure after the past runs, so they move unsplit (`SG-HIST-opening-tenure-town-only`).
- Measured at four drawn towns: the town's renters who moved in during the last year went from 7 to 11% before to 13 to 21% after; vacancy at 3 months went from 1.8 to 2.8% before to 3.1 to 4.8% after.
