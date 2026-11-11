---
id: world-rental-match-reads-commute-and-space
title: "Who takes a new rental weighs the commute to recorded jobs and the room a family needs"
area: world
kind: stopgap
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr:
blocked-on:
after: world-dwelling-position
lead: m0-m2
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** The rental match in src/core2/housing-occupancy.ts matches completed rentals to rent-saving tenants, recovered homeless households and unassigned households by rent, income and cash only. Add the two missing reads: the commute from the dwelling to the household's recorded job locations, and whether the dwelling's capacity fits the household's size, with the same decision rule for both tiers. This closes SG-WORLD-new-rental-move-coverage once dwelling capacity is recorded.

**Cause.** Found in code: `occupyCompletedRentals` (src/core2/housing-occupancy.ts line 254) marks SG-WORLD-new-rental-move-coverage (src/core2/data/stopgaps/world.json, open) and weighs rent, income and cash only, through `rentalMovePull` (line 53); no dwelling position or capacity is read.

**Fix.** Add the commute to recorded job locations and the dwelling capacity against household size to the match, one rule for full and counted households, and cite them in the move reasons. Resolve the stopgap row.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: counted households weigh commute and space by the same rule as full households, times their count. No dice: the match follows recorded jobs, sizes and money.

**Done when.** A second session, on main in a drawn place (place and seed named), plays a year in dev mode and finds a household that moved into a new rental whose recorded move reasons cite the commute or space term by record id. A test in src/core2/housing-pipeline.test.ts shows a larger family preferring the larger unit at equal rent, and SG-WORLD-new-rental-move-coverage is resolved.

**Waits on.** world-dwelling-position.

**Files.** src/core2/housing-occupancy.ts, src/core2/housing-pipeline.test.ts, src/core2/data/stopgaps/world.json

**Notes.** Oct 20 (pool feeder): made from the open stopgap row SG-WORLD-new-rental-move-coverage; waits on dwelling locations for the commute half.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have weighed commute and room in who takes a rental; commute is a slight estimate and no player sees the match.
