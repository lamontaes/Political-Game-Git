---
id: test-law-reach-group-b-red-on-main
title: "law-reach-group-b.test.ts fails two tests on clean main"
area: laws
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On main at 13:20 UTC on Oct 20, src/core2/law-reach-group-b.test.ts fails two of its 31 tests. One assertion reads 'expected 34 to be 35', and a counted-group payment check reads 'expected +0 to be 173' (Caesars Head, South Carolina, seed a1cbdd1ba948906c50ccef54d5c9c516e60a557be8709315780ae9d882c63289) and '+0 to be 165' (Hendersonville, Tennessee). The cause is not yet traced; it predates #5288, which was merged with the same two failures.

**Rules.** Fix the root cause in the engine or the test; never skip, loosen or return early from a test. Tests draw places from all 56 and name place and seed in every failure.

**Done when.** law-reach-group-b.test.ts passes on main in three random drawn places (seeds named in the PR body), with the two failing assertions passing unchanged or tightened, and the cause named by file and line in the PR body.

**Files.** src/core2/law-reach-group-b.test.ts, src/core2/law-reach/group-b-money.ts, src/core2/counted-money.ts

**Notes.** TODO
