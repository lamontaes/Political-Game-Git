---
id: housing-1-buyers-come-from-beyond-a-small-town
title: "A small town's homes for sale find buyers from the county and beyond, so its owners do not only fall"
area: core
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: industry-2-a-towns-job-losses-make-people-leave
blocked-on:
root: none
lead: jobs
model: opus
effort: medium
source: "Interviews thread at Surrency GA, Nov 15 22:07Z (owners 41 to 35 after #9117's fold); Account lead's ruling 22:08Z (the missing buyers are the cause, not the buy weights; after I1)"
---

**What.** In a small town a home put on the market waits with nobody to buy it, so owners only fall. Surrency GA (1374852, drawPlace seed pl4 "police-log", 330 days): renting 9 to 11 and owning 37 to 35 after #9117's fold. Gratz KY (2132428, seed d4): owners 45 to 28 over five years, with 0, 0, 2, 0, 0 buyers a year (#9117's own table). Seen: the town's homes for sale and who bought them over a year, on the housing screen and in dev mode's Trace of a sale.

**Cause.** Found in code: a listed home is bought only by a town renter who weighs buying (`weighHome`, src/core2/housing-buy.ts) or a newcomer already arriving (`settleCountedNewcomers`, src/core2/housing-counted-buy.ts:169). Newcomers arrive by `arrivals` (src/core2/modules/counted-moves.ts:1178), which shares each origin's due by population and never reads the homes for sale, so a town of 50 households has almost no one to buy.

**Fix.** A home for sale is a reason to come: the same `arrivals` step brings a household from the county and beyond when the town has homes listed, charged to the place's own balance from the origin most due as any arrival is, and it buys through the one decision (`homeBuyReasons`) with the money it brings, through the same outside account. No new mover engine, and the five buy weights are not touched.

**Time box.** 4 hours, Opus, medium.

**Rules.** No dice: the listing and the balance decide who comes. One model, two tiers. Sliding scales. No tuned number: the arrivals stay sized by the origins' sourced flows.

**Done when.** A pinned test at Surrency GA and Gratz KY with their seeds prints a year's homes listed, bought (by whom: town renter, newcomer) and still waiting, with and without the change, named by sale id; year 1 and records at three places, twice a side, alternated. A second session sees at a drawn small place it names with its seed that a listed home is bought by a household from outside the town.

**Waits on.** industry-2 (who leaves a town), by the lead's order.

**Files.** src/core2/modules/counted-moves.ts, src/core2/housing-counted-buy.ts, src/core2/housing-listings.ts and their tests.
