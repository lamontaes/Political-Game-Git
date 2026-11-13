---
id: gov-world-race-holder-runs-for-two-offices
title: "A state legislator who runs for Congress is also re-elected to their own seat, then leaves it vacant on January 3"
area: gov
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: gov
model: opus
effort: medium
root: none
source: Red desk, Nov 13 (world-races.test.ts red on main, seen in #9032's CI)
---

**What.** `src/core2/world-races.test.ts` "every race this November resolves, and winners take their seats on the real dates" fails on clean main 8f139fe9 at GOLDEN_PATH_SEED=d20b4f73eb46d19790aaf3d25f94a91951c37ec54c815e522f8e47b460d52cd5 (Maine, place 2327085): `seat:US-ME:lower:059:0: expected undefined to be 'Democratic'`. State Representative Jason Kemp (`official:term:seat:US-ME:lower:059:0:2026-10-20`, Democrat) stands for the U.S. House in Maine's 2nd district on November 3, 2026, and on the same day the world race for his own seat 059 treats him as its incumbent and re-elects him: he is re-seated on December 1 (`term:seat:US-ME:lower:059:0:2026-12-01:elected`), sworn into Congress on January 3, 2027, and the state seat ends that day "accepted incompatible office", so it sits empty. Seen: a player in Maine reads a state House district re-electing a member who already ran for Congress, and then the seat is vacant a month into the term.

**Cause.** Found in code: in src/core2/modules/voting.ts, `decide` gives a world race's incumbent party the incumbent's side (`incumbent: true`) and `seatRaceWinner` re-seats the serving holder's person when their party wins (`reelected`), without reading whether that person is on the ballot for another contest the same day; the candidacy engine (src/core2/modules/candidacy.ts) lets a serving holder decide to run for a higher office, weighing only what the move costs them (`officeOpportunity`). `officialCandidate` in src/core2/modules/officials.ts already keeps someone whose own seat is up that year off another ballot (`row.nextElectionYear !== year`); the candidacy path and the world race do not share that read.

**Fix.** One rule for both engines: a holder on the ballot for another contest decided the same day leaves their own seat open where the state's law bars one person from two offices' ballots (a row per state in the election law data), so the world race fields two non-incumbents and seats a new holder; where a state allows it, the seat stays theirs and the vacancy is filled by the state's vacancy law. Research which states bar dual candidacy (researcher), register the stopgap for any state not yet read.

**Time box.** 4 hours

**Rules.** One rule, all 56 places: whether a holder may run for two offices at once is each state's law read from data, never a state named in code, and no assertion is loosened or skipped.

**Done when.** A second session runs world-races.test.ts on main at GOLDEN_PATH_SEED=d20b4f73eb46d19790aaf3d25f94a91951c37ec54c815e522f8e47b460d52cd5 and at a fresh seed, naming each drawn state and place, and every case passes; at that seed Maine House seat 059 is won by someone other than the member seated in Congress, by record id, or held under the state's rule with its vacancy named.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, src/core2/modules/candidacy.ts
