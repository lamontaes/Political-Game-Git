---
id: world-town-net-moving-negative
title: "A played town loses 3.6 to 4.7 percent of its residents a year to net moving; its state's net migration is within about 1 percent"
area: world
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr: #4938
after:
blocked-on:
lead: m0-m2
model: opus
effort: high
root: none
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** A played town loses far more residents to moving away than move in: 3.6 to 4.7 percent of its residents a year net. A real town's net migration sits near its state's, so a town that empties faster than its state is a sign that the in-moves and out-moves follow different rules. Find what makes in-moves fall short of out-moves and fix the cause. Two causes were fixed on Oct 17 (the counted engine could not tell which state a state-level counted place lay in, and newcomers settled only where a counted household of their age lived); the rest were measured and need a fresh look at the current code.

**Cause.** Needs cause. Looked at the item's measured table and src/core2/modules/counted-moves.ts (`stateOfCountedPlace` at line 531 and `month` at line 559): fixes (1) and (2) are in, and `departuresOf` is gone, so the remaining suspects (a full person who moves away is never replaced by a full arrival; the destination pull is not normalized, so a state poorer than average loses more than the ACS rate; tiny towns get fewer than one arrival a year) have not been re-measured against the current code.

**Fix.** None until the cause is found.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: movers come from the pull of income, prices and jobs, never a roll. One model, two tiers: a counted household and a full person leave and arrive by the same rule. One rule, all 56 places. Never tune a seed. Real migration rates report the gap and never decide a pass (owner, Nov 8: ranges are not targets).

**Done when.** A second session, on main in six places drawn from all 56 with seeds it chooses (names in the PR body), plays a year in dev mode and reads the Metrics tab and the move records: every in-move and out-move, counted and full, names a recorded reason, a full person who leaves is replaced by arrivals under the same rule as a counted household, and each town's net moving and its state's net migration are printed side by side as a report. A test in src/core2 states the cause found and the move record ids that show it.

**Waits on.** Nothing.

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

Sent back 2026-10-23 from PR #4935 (branch claude/arrivals-by-place): The remaining arrival-rounding edit has no regression or six-place played-year acceptance, while its release note repeats already-shipped behavior and incorrectly says carried balances are discarded yearly; finish on that branch, merge main into it first.
