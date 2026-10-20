---
id: core-outside-wage-obligation
title: "A private employer outside the town can pay a worker's wages from the place's outside account, against an exact due record"
area: core
kind: feature
priority: 2
size: L
status: open
claimed-by:
pr: #5076
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** Sent back Oct 20 from PR #5076 (branch claude/peaceful-ritchie-03780x): loosened tolerance in counted-weight-money.test.ts, unstated timeout increases in two tests, and new features added to src/simulation; finish on that branch, merge main into it first.

Oct 20 (claude/fixed-on-main-notes), handed back: the item text is an empty shell, and PR #5076's branch (`claude/peaceful-ritchie-03780x`) is a 218-file branch carrying many other items (about 790,000 added lines of generated data and tooling, outlets, allocation cuts), so "finish on that branch" cannot be done as one unit. What its title asks for, a private employer outside the town paying a worker through a recorded outside account, is the same missing piece as `world-lodes-commutes-split-flow` (the commuter flow paid from a recorded commute-destination account, read by the nonresident local tax). Write the spec once for both, and build it from a fresh branch off main with the split flow and its reader; take only the allocation-cut commits of #5076 (`99e6b394ee`, `17d1996fab`) if they are still wanted, each on its own PR.
