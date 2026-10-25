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
source: added with npm run pool -- add
---

**What.** The golden-path-year job's M0-13 assertion 'counted voters vote in local races' (tests/golden-path/played-world.node-test.ts) fails in Corral Viejo, Puerto Rico (place key 7220998, seed 1535847a3bc4628b67822b11fbd7cef189e4ea931e8e1a6ce9da641882a2bb7c). On clean main bd8947e723, 6 of 6 municipal legislator races decided in the played year had no votes from the counted population, although the town has 15 counted adults and each has a counted ballot record. It turned lamontaes/Political-Game-Git#6033 red twice, since the place follows the head commit. The Randall, Kansas fix (gov-played-world-counted-voters-red) and the township-board fix (gov-played-world-counted-voters-township-board) do not reach it. Find why a town this small casts no counted vote (no choice offered, a weight that rounds to zero, or turnout below one voter) and fix it at the root, or, if a handful of counted adults casting no vote is a fair outcome, have the check judge only a counted electorate large enough to expect votes, naming the numbers.

**Rules.** One model, two tiers: a counted voter group is read by the same voting rule as a full person, times its count. One rule, all 56 places: nothing names Puerto Rico or the town in logic. Ask why: name the cause by file and line.

**Done when.** The played-world test passes on the Corral Viejo seed above, and on three fresh drawn places named in the PR body; and with counted voting switched off in a drawn place of a few thousand counted adults (seed named), the check still fails.

**Files.** src/core2/modules/voting.ts, tests/golden-path/played-world.node-test.ts

**Notes.** TODO
