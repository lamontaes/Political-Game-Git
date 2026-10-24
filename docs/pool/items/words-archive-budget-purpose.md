---
id: words-archive-budget-purpose
title: "Archived budget stories carry the largest spending line so the budget lede can name a purpose"
area: core
kind: feature
priority: 3
size: S
status: open
claimed-by:
pr: #5240
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** A budget adopted in the year before day one is archived as a news story. Its words name only that a budget passed, not what it buys. The archived story should carry the budget's largest spending line and its amount, so the archive lede can say what the budget is for, using the budget screen's own line names.

**Rules.** One rule, all 56 places: the test draws places from all 56 with bounded redraws and names the place and seed. No hand-written player text: the lede comes from the English engine's archive wording and the line name from the budget line-name table.

**Done when.** An archived `budget-adopted` story carries `largestLine` and `largestLineMinor` read from the adopted budget's record; `wordArchiveStory` words it as "The budget includes $X for <line name>."; `src/bench/archive-words.test.ts` draws places from all 56 (bounded) until one archives an adopted budget, checks every such story's wording, and fails naming the places tried when none does.

**Files.** src/core2/past-news.ts, src/bench/archive-words.ts, src/bench/archive-words.test.ts

**Notes.** Sent back 2026-10-20 from PR #5240 (branch claude/words-archive-budget-purpose): budget wording test can pass with no budget-adopted stories; assert the collection is nonempty and keep its wording assertions; finish on that branch, merge main into it first.
