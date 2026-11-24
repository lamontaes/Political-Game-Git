---
id: gov-played-world-counted-voters-tiny-town
title: "Golden path M0-13: counted voters cast no votes in a 15-adult town's municipal races (Corral Viejo, PR)"
area: gov
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr:
blocked-on:
standard: 2
model: haiku
effort: low
lead: governing
root: rc9-place-facts-one-default
source: added with npm run pool -- add
after:
checked: fable 2026-11-10
---

**What.** The golden-path-year job's M0-13 assertion 'counted voters vote in local races' (tests/golden-path/played-world.node-test.ts) fails in Corral Viejo, Puerto Rico (place key 7220998, seed 1535847a3bc4628b67822b11fbd7cef189e4ea931e8e1a6ce9da641882a2bb7c). On clean main bd8947e723, 6 of 6 municipal legislator races decided in the played year had no votes from the counted population, although the town has 15 counted adults and each has a counted ballot record. It turned lamontaes/Political-Game-Git#6033 red twice, since the place follows the head commit. The Randall, Kansas fix (gov-played-world-counted-voters-red) and the township-board fix (gov-played-world-counted-voters-township-board) do not reach it. Find why a town this small casts no counted vote (no choice offered, a weight that rounds to zero, or turnout below one voter) and fix it at the root, or, if a handful of counted adults casting no vote is a fair outcome, have the check judge only a counted electorate large enough to expect votes, naming the numbers. Seen: the vote totals of a small town's council election, which must include its residents' ballots.

**Cause.** Measured: it does not reproduce on main. On main 903b659706, a probe built the played world (`buildBenchWorld`, two levels) at place 7220998 with seed 1535847a3bc4628b67822b11fbd7cef189e4ea931e8e1a6ce9da641882a2bb7c and played to Nov 15, 2028, the first municipal general election after the opening. All 17 local races were decided on Nov 7, 2028: 15 municipal legislator seats of `municipio:72113`, the mayor and one more board seat. Every one of the 16 races with someone on its ballot recorded counted votes: 2 counted votes from 3 counted eligible voters, with the kept counted ballot record `voted` [0.937, 0.861, 0.065]. The one-year golden-path run cannot see this, because no local race falls in its year (the Nov 11 re-run note: "no local race was decided in the run"). One race had no one on its ballot (`contest:seat:municipio:72113:board:2:2028-11-07`). That is the separate check "every race has someone on the ballot", which items such as gov-empty-ballot-stay-out-and-late-vacancy cover.

**Fix.** Nothing to build. Proposed: the CTO closes the item (`npm run pool -- status gov-played-world-counted-voters-tiny-town done --by=cto`). The fault does not reproduce on main in this town at its first local election, and a fresh draw (Wheat Ridge, Colorado, Nov 11 note) shows counted voters voting in all 4 local races.

**Time box.** 0.5 hours for one Haiku session, only if the CTO keeps the item.

**Rules.** One model, two tiers: a counted voter group is read by the same voting rule as a full person, times its count. One rule, all 56 places: nothing names Puerto Rico or the town in logic. Ask why: name the cause by file and line.

**Done when.** The CTO closes the item. If it is kept, a second session plays place 7220998 (seed above) to Nov 15, 2028 in the running game and sees election night on Politics, Campaigns show votes from the counted population in every local race with someone on its ballot, by contest record id.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, tests/golden-path/played-world.node-test.ts

**Notes.** TODO

**Notes (re-run, 2026-11-11, main 79d23fa596).** `GOLDEN_PATH_PLACE_KEY=7220998 GOLDEN_PATH_SEED=1535847a...2bb7 node --max-old-space-size=8192 --expose-gc --import tsx --test-reporter=spec tests/golden-path/played-world.node-test.ts` (Corral Viejo, Puerto Rico): exit 0, 18 passed; the assertion 'counted voters vote in local races' passed without being exercised: "UNOBSERVED ... no local race was decided in the run". Fresh draw `GOLDEN_PATH_SEED=bf3319d282b6140c88a874df3adfe330` (Wheat Ridge, Colorado, 0884440): green, and exercised: "counted voters voted in all 4 local races". The item's own case is therefore unproved either way in Corral Viejo; the fresh draw is green and observed. Proposed for the CTO: drop as fixed on main.

Nov 11 (cause finder for Fable B): played Corral Viejo to its first municipal election (Nov 7, 2028) on main 903b659706. Counted voters voted in all 16 local races with a ballot. The fault no longer reproduces, and the one-year golden-path run cannot exercise it, since the town has no local race in its first year. I propose the CTO closes the item.

Closed as done Nov 13, 2026 (Account lead T43, CTO's ruling on #8928 comment 6865473498, checked against the code on the train, draft PR #9052, eb349e5d76): its own Fix says nothing is left to build. Code check: the assertion 'counted voters vote in local races' exists at `tests/golden-path/played-world.node-test.ts` line 832 and reads unobserved, not failed, when no local race falls in the run; the item's Nov 11 probe in Corral Viejo (place 7220998) to its first municipal election found counted votes in all 16 local races with a ballot.

Code reading Nov 14, 2026 (Account lead T43, train eb349e5d76): the fault is excluded in two places. (1) `src/core2/modules/voting.ts` holdElection writes a `countedBallots` row for every contest (`table(api, "countedBallots").put({id: `counted:${contestId}`...})`, line 3455) and rounds each candidate's counted votes after scaling (line 3467), so a counted ballot record always exists. (2) The check in `tests/golden-path/played-world.node-test.ts` calls a race silent only when the record is missing, nobody was backed, or `expected >= 2 && recorded === 0` (lines 813-817), and reads unobserved when no local race falls in the run (line 832). A town with under two expected counted voters, such as the 15-adult Corral Viejo, can therefore record zero votes without failing. The golden path was not run.
