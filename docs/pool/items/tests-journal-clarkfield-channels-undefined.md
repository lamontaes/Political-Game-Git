---
id: tests-journal-clarkfield-channels-undefined
title: "journal.test.ts fails in Clarkfield, Minnesota (seed 0c7cebcc3d2046e5) on main"
area: director
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/director/journal.test.ts fails two cases in Clarkfield, Minnesota on seed 0c7cebcc3d2046e5, on clean main and on PR branches alike: the M4-01 law-and-raise case throws reading 'channels' of undefined, and the child-at-birth case sees zero lines. Run GOLDEN_PATH_SEED=0c7cebcc3d2046e5 npx vitest run src/director/journal.test.ts. Merger 2 found it on Oct 26 while gating PR 6147, and it reproduces on origin/main.

**Rules.** one-rule-all-places: the fix must hold in every place, so the test or engine is corrected for all of them and never special-cased to Clarkfield.

**Done when.** journal.test.ts passes in a drawn place (Clarkfield, Minnesota seed 0c7cebcc3d2046e5 and one fresh seed), with the cause named by file and line, and the seed written in the PR body.

**Files.** src/director/journal.test.ts

**Notes.** Found while gating PR 6147; the failure is identical on clean main.
