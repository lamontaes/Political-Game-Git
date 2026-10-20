---
id: words-archive-budget-death-ledes
title: "Archived budget and parent-death stories are worded in the news"
area: words
kind: feature
priority: 3
size: S
status: done
claimed-by: claude/words-archive-budget-death
pr: #5237
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T02:00:29.715Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Sent back 2026-10-20 from PR #5237 (branch claude/words-archive-budget-death): Morning check: the new parent-death test in src/bench/archive-words.test.ts only loops over stories filtered by recordKind === parent-died, without requiring any matching story. When that list is empty it calls no formatter and runs no assertion, so this new feature can pass unchecked. Require or draw an eligible generated-world parent-death record with bounded exhaustion, and assert the rendered name and date as well as its source record.; finish on that branch, merge main into it first.
