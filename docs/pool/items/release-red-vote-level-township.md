---
id: release-red-vote-level-township
title: "vote-level.test fails on main: a township board's vote carries level township, which the wire's level map and the test do not know (Michigan place 2326875)"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/vote-level-township
pr: #5827
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T19:35:29.308Z
---

**What.** On main, src/core2/vote-level.test.ts fails with GOLDEN_PATH_SEED=ddf761dc712e0696c7f81e42df8e78bd18532fec (place 2326875, Michigan): 'expected [ Array(4) ] to include township'. Commit 57a6538a40 gave the law chain a township level, so a township board's roll call carries facts.level township, but press-topics.ts LEVELS has no township entry and the test's level list and filing map stop at city. Both cases also run 62 to 83 seconds on a 4-core container against vitest's 30-second default, so they time out on most seeds.

**Rules.** Never loosen or skip a test; a timeout is raised only with a measured reason. One rule, all 56 places: the wire files a township's act by the same rule as a town's.

**Done when.** vote-level.test.ts passes on the Michigan seed and on two random seeds, the wire files a township board's vote at the level its government covers, named by event id, and each case's timeout cites its measured run time.

**Files.** src/core2/vote-level.test.ts, src/core2/press-topics.ts

**Notes.** TODO
