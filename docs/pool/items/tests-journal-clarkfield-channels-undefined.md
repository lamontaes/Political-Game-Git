---
id: tests-journal-clarkfield-channels-undefined
title: "journal.test.ts fails in Clarkfield, Minnesota (seed 0c7cebcc3d2046e5) on main"
area: tests
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/director/journal.test.ts fails two cases in Clarkfield, Minnesota on seed 0c7cebcc3d2046e5, on clean main and on PR branches alike: the M4-01 law-and-raise case throws reading 'channels' of undefined, and the child-at-birth case sees zero lines. Run GOLDEN_PATH_SEED=0c7cebcc3d2046e5 npx vitest run src/director/journal.test.ts.

**Rules.** no-dice; one-rule-all-places: fix the test or engine for every place, not this one.

**Done when.** journal.test.ts passes in a drawn place (Clarkfield, Minnesota seed 0c7cebcc3d2046e5 and one fresh seed), with the cause named by file and line.

**Files.** src/director/journal.test.ts

**Notes.** TODO
