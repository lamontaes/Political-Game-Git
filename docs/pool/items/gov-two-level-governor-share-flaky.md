---
id: gov-two-level-governor-share-flaky
title: "two-level-elections.test.ts fails one run in five in a random place: the Governor's share is 0.153, over the 0.15 bound"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #4861
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Sent back 2026-10-17 from PR #4861 (branch claude/governor-share-flaky): Morning check: src/core2/two-level-elections.test.ts widens the governor vote-share bound from 0.15 to 0.20 solely to admit larger results observed in the simulation. That loosens an existing test. Preserve the bound and fix the cause, or replace the comparison with an independently sourced/calibrated expectation that distinguishes candidate or incumbency effects from the underlying state electorate; do not choose a wider bound merely to turn failing seeds green.; finish on that branch, merge main into it first.
