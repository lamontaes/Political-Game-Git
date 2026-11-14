---
id: world-town-net-moving-negative
title: "A played town loses 3.6 to 4.7 percent of its residents a year to net moving; its state's net migration is within about 1 percent"
area: world
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: account-lead-t28 (Claude Opus 5.5, cloud)
pr: #9057
after:
blocked-on:
lead: m0-m2
model: opus
effort: medium
root: none
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
branch: claude/project-thread-ojvmv1
---

**What.** A played town loses far more residents to moving away than move in: 3.6 to 4.7 percent of its residents a year net. A real town's net migration sits near its state's, so a town that empties faster than its state is a sign that the in-moves and out-moves follow different rules. Two causes were fixed on Oct 17 (the counted engine could not tell which state a state-level counted place lay in, and newcomers settled only where a counted household of their age lived). The cause that is left is in how arrivals are paid out, below.

**Cause.** Found in code: src/core2/modules/counted-moves.ts, `arrivals` (from line 1302; the loop at lines 1336 to 1418 on main at 3d74e9179b). Departures and arrivals are paid out by different rules. Departures (`month`, line 998) add up a place's due movers over all its groups and destinations, and a household leaves once the place's total reaches half a household. Arrivals are held in `rt.arrive` per origin and age band (up to 57 origins times 5 bands), never per place. Each month, each balance draws one place by a hash weighted by its people (`cumulative`, line 1362), and stops at the first household larger than the balance (`if (left < size) break;`, line 1372). Two things follow. (1) A neighbor's record that stands for many households (a county record of up to 5,556 people in Marcola, Oregon's world) blocks that balance whenever it is drawn, so the town gets arrivals only when it happens to be drawn first. Its in-moves follow the luck of the draw, not its share of the people. (2) A town's share of each of those 285 balances stays under one household for years, so even an exact share seldom pays out. Measured: one played year, `drawPlace(seed, "netmove")`, in-moves and out-moves of counted households and full people from the `moves` table and `departuresSeen`, against each town's share of the year's due arrivals (people living there over people in all counted places). Marcola, Oregon (seed nm7, world seed 65d808701269…; town 433 people): due about 29, arrived 6, left 26, net -4.6 percent against its state's +0.7. Reyno, Arkansas (nm6, world seed a565c8f228c2…, 404 people): due about 23, arrived 60, left 20, net +9.9. Colon, Nebraska (nm1, world seed 4c01778823ef…, 140 people): due about 10, arrived 4, left 12, net -5.7 against +0.6. Out-moves sit near the survey rate in all three (about 6 percent a year). The counted places around the town show the same block as a stock never paid out: 724 people due and never arrived at year's end around Colon, 4,689 around Marcola. Probe (working copy only, undone): each place keeps its own share of every balance, and a household arrives once the place's total reaches half a household. The towns then came to Marcola +1.2 (state +0.7), Reyno +0.5 (+0.6) and Colon -2.1 (+0.6, where one household is two points), with the carried stock near zero. Open PRs #8157 and #8158 change what a newcomer is given once it arrives (its share of the place's out-of-town workers and of its group's money), not how many arrive or where, so this cause holds after them. #8157 edits `unplacedRates` in the same file, so expect a merge.

**Fix.** In src/core2/modules/counted-moves.ts, pay arrivals out the way departures are paid. Each month, in `arrivals`, add each place's share of every origin-and-band due to a balance kept per place (the place's people at that age, `agedHere`, over all places'), and keep it on the runtime (`rt.arrive` keyed by place, origin and band, or a per-place total beside it). For each place in sorted order, while its total balance is at least half a household, a household arrives there. It is shaped like one of that place's own templates, drawn by the existing seeded hash. Its origin and band are the place's largest balance, and its people are taken from that balance first, then the next, as departures do (lines 1010 to 1024). The balance may go below zero and is owed from then on. Its move record keeps the same reasons from that origin. Delete the draw of a place by `cumulative` and the stop at the first household too large. Add a test in src/core2 that plays a year in two places drawn from all 56 and prints each town's due arrivals, its arrivals and its departures with the move record ids. The test checks that a town's arrivals are within one household of its due, and that no place's carried balance at year's end exceeds one of its households.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Seen: the town's population on the Metrics tab, which falls 3.6 to 4.7 percent a year to net moving.

**Rules.** No dice: movers come from the pull of income, prices and jobs, never a roll. The seeded hash only picks which household's shape a newcomer copies. One model, two tiers: a counted household and a full person leave and arrive by the same rule. One rule, all 56 places. Never tune a seed. Real migration rates report the gap and never decide a pass (owner, Nov 8: ranges are not targets).

**Done when.** A second session, on main in six places drawn from all 56 with seeds it chooses (names in the PR body), plays a year in dev mode and reads the Metrics tab and the move records: every in-move and out-move, counted and full, names a recorded reason, a town's arrivals are its share of the due arrivals to within a household, and each town's net moving and its state's net migration are printed side by side as a report. A test in src/core2 states the cause found and the move record ids that show it.

**Waits on.** Nothing.

**Files.** src/core2/modules/counted-moves.ts, src/core2/counted-arrivals-by-place.test.ts (new)

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

Cause found 2026-11-10 (claude, claude/cause-town-net-moving), on main at 3d74e9179b. Ran a one-year probe (in-moves and out-moves by cause, town and the counted places around it, the carried balances, the state's change) in seven drawn places, seeds nm1 to nm7 through `drawPlace(seed, "netmove")`: Colon, Nebraska; Washington, District of Columbia; Tatgua, Northern Mariana Islands; Bancroft, South Dakota; Palmas, Puerto Rico; Reyno, Arkansas; Marcola, Oregon. Then I ran two probes in my working copy, both undone: per-place shares alone (the town's due came right, but most of it stayed carried under one household), then per-place totals paid at half a household (the nets came right). Still unknown: (a) The leftover suspects of Oct 17 were checked and are not the cause. The destination pull is normalized now (the fitted `attract` and `destRowsOf` share each sum to one), and newcomers already settle by everyone living there, full people too. (b) A departure record names only the destination with the most due, so the records overstate moves within the state (around Marcola, 22,434 recorded within the state and 2 out of it). That is a records question for the Done when's "names a recorded reason", not the net. (c) In Washington, District of Columbia's world, the town's state's arrivals also settle in counted places in neighboring states (`placePeople` in `month` takes every counted place), which grew 10 percent in a year. That may be a separate item. (d) Around the town, under the second probe, the counted places gained 1 to 2.6 percent against their state's 0.6 to 0.7. One year cannot tell a catch-up from a lean; the builder's test should print it.

**Notes (Fable B's check, Nov 10).** Checked against main: `arrivals` in src/core2/modules/counted-moves.ts picks a place by a seeded hash weighted by people (the `cumulative` loop near line 1345) and stops a balance at the first household larger than what is left (`if (left < size) break;` near line 1371), where a county record's size is its people times its weight. So the cause holds. Three changes to the finder's item: the build is for Opus, because it rewrites how one engine pays out and its choices (whose shape a newcomer takes, which balance pays) need judgment; the clause about carrying a saved world's balances over is gone, because saves do not matter before early-access preparation (AGENTS.md); and read this with core-country-tier-moves-one-holder, which changes where the due arrivals come from in the same function. The two do not depend on each other; whichever lands second merges main first. The fix also removes a draw that decided where a household settles, which the no-dice rule wants gone.

Claimed by next for opus-5251 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 03:34 UTC) on branch claude/pool-world-town-net-moving-negative.

Released (2026-11-11): opus-5251 stopped under the cap on new work (Nov 11); the draft PR and its branch keep the work and a handoff note; claiming it takes the branch. Continue on branch claude/pool-world-town-net-moving-negative and pull request #8528.

Taken 2026-11-13 by Account lead T28 on branch claude/project-thread-ojvmv1 (from the train, #9052), building on draft #8528's per-place balances and adding the CTO's order of Nov 13 01:28Z: each arriving household's people are charged to their own age bands, and its shape is one of the place's households holding someone of the age most due. Measured on the train in Everson, Pennsylvania (`drawPlace("d4", "students-measure")`): year 1 -2.6 percent (20 counted people in, 38 out, 6 full people out, 1,144 people due around the town never paid out), year 2 +4.3 percent (65 in). With the fix: +1.2 and +1.9 percent (49 and 47 in, 44 and 41 out), nothing carried. Arrivals, not departures, drove the loss; departures ran steady at 5 to 6 percent a year in both.
