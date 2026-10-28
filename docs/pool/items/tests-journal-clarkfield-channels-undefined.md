---
id: tests-journal-clarkfield-channels-undefined
title: "journal.test.ts fails in Clarkfield, Minnesota (seed 0c7cebcc3d2046e5) on main"
area: director
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/journal-clarkfield
pr: #6262
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T07:46:10.721Z
---

**What.** src/director/journal.test.ts fails two cases in Clarkfield, Minnesota on seed 0c7cebcc3d2046e5, on clean main and on PR branches alike: the M4-01 law-and-raise case throws reading 'channels' of undefined, and the child-at-birth case sees zero lines. Run GOLDEN_PATH_SEED=0c7cebcc3d2046e5 npx vitest run src/director/journal.test.ts. Merger 2 found it on Oct 26 while gating PR 6147, and it reproduces on origin/main.

**Rules.** One rule, all 56 places: the test draws a place from all 56 and names the place and seed, and the fix holds in every place. Never skip or narrow the test to get green.

**Done when.** journal.test.ts passes in a drawn place (Clarkfield, Minnesota seed 0c7cebcc3d2046e5 and one fresh seed), with the cause named by file and line, and the seed written in the PR body.

**Files.** src/director/journal.test.ts

**Notes.** Found while gating PR 6147; the failure is identical on clean main.
