---
id: core-voter-groups-town-cast-zero
title: "The voter-groups contract test counts no votes cast in some drawn towns (Ceex Haci, WI)"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/voter-groups.test.ts fails on clean main for Ceex Haci, Wisconsin (5513587), seed 3050e3fdcb63b57a763c6a47974171ebd405b29c2f4100823cd3f64e8a012bcf (the test's own draw from GOLDEN_PATH_SEED 59807099296d91428042c64b143c38aaa564706f15f126a1ca8a7d60256219f6): countPlaces gives the town place cast 0, so the assertion at line 154 (counted.places[0].cast > 0) fails. It reddens golden-path spec M0-09 on any PR whose commit draws this seed (seen on #5914, head 12359e3cda; reproduced on main 1852663b02).

**Rules.** Ask why: follow the sample's weights, the town's eligible count and the turnout rule to the zero before changing any assertion. One rule, all 56 places: the fix holds for every drawn place, not this one.

**Done when.** voter-groups.test.ts passes on the recorded seed and on three fresh drawn places named in the PR body, with the zero explained by record (which sample rows, which weights) and every existing assertion kept or replaced by a demonstrated invariant.

**Files.** src/core2/voter-groups.test.ts, src/core2/voter-groups.ts

**Notes.** TODO
