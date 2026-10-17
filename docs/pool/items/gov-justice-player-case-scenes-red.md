---
id: gov-justice-player-case-scenes-red
title: "justice-player.test.ts fails on main: a case on the player reaches no scenes (Elk River, Idaho, seed 49f900453d6680e5)"
area: gov
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/gov-justice-player-case-scenes-red
pr: #4642
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T17:05:21.509Z
---

**What.** justice-player.test.ts fails on main: a case on the player reaches no scenes (Elk River, Idaho, seed 49f900453d6680e5). The failure reproduces on clean main when the test file is run on its own with the repository's test command. Find the root cause in the code the test reads and fix it there, keeping the test's expectation unless the expectation itself is the defect.

**Rules.** Replace, never layer: fix the cause where it lives and delete anything the fix makes dead, rather than adding a parallel path or loosening the test. Ask why: the PR body names the root cause by file and line and says why the test and the code disagreed.

**Done when.** src/core2/justice-player.test.ts passes on clean main with the repository's test command, in a drawn place and a seed the builder did not choose wherever the test draws one, and the PR body names the root cause by file and line and the test run that proves it.

**Files.** src/core2/justice-player.test.ts

**Notes.** TODO

Sent back 2026-10-16 from PR #4642 (branch claude/gov-justice-player-case-scenes-red): Morning check: src/core2/justice-player.test.ts removes the requirement that a refusing member reports the offer and returns successfully when no complaint exists (lines 251–257). This loosens the test and lets the investigation path go untested. Keep the report/investigation assertion and arrange a generated-world case that reaches it; finish on that branch, merge main into it first.
