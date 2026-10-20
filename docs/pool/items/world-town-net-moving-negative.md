---
id: world-town-net-moving-negative
title: "A played town loses 3.6 to 4.7 percent of its residents a year to net moving; its state's net migration is within about 1 percent"
area: world
kind: bug
priority: 1
size: M
status: in-pr
claimed-by:
pr: #4938
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** A played town loses far more residents to moving away than move in: 3.6 to 4.7 percent of its residents a year net, where a real town's net migration sits within about 1 percent of its state's. Find what makes in-moves fall short of out-moves and fix the cause.

**Rules.** No dice: movers come from the pull of income, prices and jobs, never a roll. One model, two tiers: a counted household and a full person leave and arrive by the same rule. One rule, all 56 places. Never tune a seed.

**Done when.** In a one-year run of the played world (buildBenchWorld) in six places drawn from all 56 and seeds the builder did not choose (names in the PR body), each town's net moving (in-moves less out-moves, counted and full, over its residents at the start) is within 1.5 percent of its state's net migration, shown by move record ids, and a test in src/core2 states it.

**Files.** src/core2/modules/counted-moves.ts, src/core2/modules/moves.ts, src/core2/place-lookup.ts

**Notes.** Worked Oct 17 (claude, claude/town-net-moving): two causes fixed, the rest measured.

_Fixed._ (1) The counted engine could not tell which state a state-level counted place lay in for 41 of the 50 states, the District of Columbia and the territories (only nine states have a place record, `lookupData.packs`). Those households, a fifth to a half of the counted people around the town, never left, while newcomers kept arriving in them. `stateOfCountedPlace` now reads the state from the place's own id. (2) Newcomers settled where a counted household of their age lived, so a town whose people are mostly full (the sample) got a small share of the arrivals while all its people left at the ACS rate. They now settle in proportion to everyone living in a place at the arriving age, full people included, and the share of the state's inflow that reaches the counted places counts the full people too.

_Measured_ (net moving as a percent of the town's residents at the start, in-moves less out-moves of counted households and full people over one year, seeds nm1 to nm7 through `drawPlace(seed, "netmove")`):

| place                            | before | after |
| -------------------------------- | ------ | ----- |
| Washington, District of Columbia | -5.3   | -1.9  |
| Palmas, Puerto Rico              | -4.6   | -2.3  |
| Reyno, Arkansas                  | -5.6   | -5.6  |
| Marcola, Oregon                  | -12.1  | -10.7 |
| Susupe, Northern Mariana Islands | -8.6   | -8.5  |
| Colon, Nebraska                  | -16.4  | -18.0 |

_Left._ (a) A full person who moves away is never replaced by a full arrival: arrivals are always counted households, so the town's full people only shrink. In the small towns the full people are most of the town, and their departures (`departuresOf`, 14 to 30 people a year) are 3 to 11 percent of residents against 1 to 3 percent arriving. (b) The pull toward another state is not normalized: a destination's weight is its people times `exp(income + jobs pull)` and the sum over destinations is not one, so a state poorer or with fewer jobs than the nation's average loses more than the ACS rate (`month` in counted-moves.ts, both for counted groups and for the states' coarse flows). Whether to hold the gross leaving at the ACS rate and let the pull set only where people go is the owner's call; I built nothing for it. (c) Tiny towns (Colon, Nebraska, 128 people) get fewer than one arrival a year from their share of the state's inflow, so a year shows none.

Sent back 2026-10-18 from PR #4938 (branch claude/town-net-moving): Merging current main (adce5acbe2) conflicts in src/core2/modules/counted-moves.ts. Resolve these conflicts on this branch and push before local validation can run.; finish on that branch, merge main into it first.
