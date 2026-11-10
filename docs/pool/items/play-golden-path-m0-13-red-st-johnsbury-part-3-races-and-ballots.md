---
id: play-golden-path-m0-13-red-st-johnsbury-part-3-races-and-ballots
title: "No race in a drawn place's year is left with no one on the ballot"
area: core
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after: play-golden-path-m0-13-red-st-johnsbury-part-1-rerun-and-split
blocked-on:
lead: play-first
model: opus
effort: high
root: rc2-done-from-records
source: split from play-golden-path-m0-13-red-st-johnsbury in the pool redo, Nov 10, 2026
---

**What.** In the played year of St. Johnsbury, Vermont, 2 of 15 races (Commissioner and County treasurer, 2025-11-04) had no one on the ballot. A race with nobody running is either a seat that should have drawn a candidate or a contest that should not exist. Find why no one filed and fix it at the elections or candidacy engine so every race on a ballot has candidates or is handled as the place's law handles an unfilled seat.

**Cause.** Measured: GOLDEN_PATH_SEED=f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4 GOLDEN_PATH_PLACE_KEY=5062125 node --max-old-space-size=8192 --expose-gc --import tsx tests/golden-path/played-world.node-test.ts in St. Johnsbury, Vermont (place key 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4) failed on main 663a38fedf (Oct 28); 2 of 15 races, Commissioner and County treasurer, 2025-11-04, had no one on the ballot; why no one filed is not traced.

**Fix.** Re-run (part 1 says whether it still fails), then trace the two contests by record id through the candidacy and filing records to find why nobody filed (no eligible person, the decision weights, or a contest opened that should not be), and fix that at its engine; where a place's law fills an unfilled seat another way, the ballot says so from the place's data.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: every check M0-13 makes must hold in every drawn place's played year, so the failure is fixed at its engine, never by loosening the check. One rule, all 56 places: the repro place is a repro, not a rule; no place is named in logic. Red main comes first (owner, Oct 15). Ask why: the PR names the cause by file and line.

**Done when.** A second session runs the M0-13 command above and in two more drawn places (names and seeds recorded) and sees no race left with no one on the ballot, or an unfilled seat shown as the place's law handles it, with the former two contests traced by record id to their cause.

**Waits on.** play-golden-path-m0-13-red-st-johnsbury-part-1-rerun-and-split, which re-runs the check on current main and may narrow or drop this part.

**Files.** tests/golden-path/played-world.node-test.ts, src/core2/modules/elections.ts, src/core2/modules/campaigns.ts
