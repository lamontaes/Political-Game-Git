---
id: gov-played-world-counted-voters-tiny-town
title: "Golden path M0-13: counted voters cast no votes in a 15-adult town's municipal races (Corral Viejo, PR)"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
standard: 2
model: sonnet
effort: medium
lead: governing
root: rc9-place-facts-one-default
source: added with npm run pool -- add
after:
checked: fable 2026-11-10
---

**What.** The golden-path-year job's M0-13 assertion 'counted voters vote in local races' (tests/golden-path/played-world.node-test.ts) fails in Corral Viejo, Puerto Rico (place key 7220998, seed 1535847a3bc4628b67822b11fbd7cef189e4ea931e8e1a6ce9da641882a2bb7c). On clean main bd8947e723, 6 of 6 municipal legislator races decided in the played year had no votes from the counted population, although the town has 15 counted adults and each has a counted ballot record. It turned lamontaes/Political-Game-Git#6033 red twice, since the place follows the head commit. The Randall, Kansas fix (gov-played-world-counted-voters-red) and the township-board fix (gov-played-world-counted-voters-township-board) do not reach it. Find why a town this small casts no counted vote (no choice offered, a weight that rounds to zero, or turnout below one voter) and fix it at the root, or, if a handful of counted adults casting no vote is a fair outcome, have the check judge only a counted electorate large enough to expect votes, naming the numbers.

**Cause.** Needs cause. Looked at tests/golden-path/played-world.node-test.ts (the assertion 'counted voters vote in local races', line 791) and its fail text pointing at holdElection in src/core2/modules/voting.ts (line 2910). Not run in Corral Viejo, Puerto Rico (key 7220998, seed 1535847a3bc4628b67822b11fbd7cef189e4ea931e8e1a6ce9da641882a2bb7c), so why 15 counted adults cast no vote is not known.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted voter group is read by the same voting rule as a full person, times its count. One rule, all 56 places: nothing names Puerto Rico or the town in logic. Ask why: name the cause by file and line.

**Done when.** A second session finds the played-world test passing on the Corral Viejo seed above and on three fresh drawn places named in the PR body, and with counted voting switched off in a drawn place of a few thousand counted adults (seed named) the check still failing. In the running game, the election night results on Politics, Campaigns for Corral Viejo show votes from the counted population.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, tests/golden-path/played-world.node-test.ts

**Notes.** TODO

**Notes (re-run, 2026-11-11, main 79d23fa596).** `GOLDEN_PATH_PLACE_KEY=7220998 GOLDEN_PATH_SEED=1535847a...2bb7 node --max-old-space-size=8192 --expose-gc --import tsx --test-reporter=spec tests/golden-path/played-world.node-test.ts` (Corral Viejo, Puerto Rico): exit 0, 18 passed; the assertion 'counted voters vote in local races' passed without being exercised: "UNOBSERVED ... no local race was decided in the run". Fresh draw `GOLDEN_PATH_SEED=bf3319d282b6140c88a874df3adfe330` (Wheat Ridge, Colorado, 0884440): green, and exercised: "counted voters voted in all 4 local races". The item's own case is therefore unproved either way in Corral Viejo; the fresh draw is green and observed. Proposed for the CTO: drop as fixed on main.
