---
id: release-red-record-broken-promise-voters
title: "record test: an incumbent's broken promise weighs 0 for a voter who should weigh 61 (record.test.ts:210, voter 2336500 958acb9b...)"
area: elections
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/pool-red-promise
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T01:55:58.936Z
---

**What.** The record test for an incumbent's broken promise fails at record.test.ts:210: voter 2336500 958acb9b... weighed 61 and the test expects the weight to be above zero, but it is 0. A broken promise should change specific voters' choices with a record id for each. Find whether the voter is never reached by the promise or the choice is never written.

**Rules.** Fix at the root: a red test is fixed in place or the code it guards is, never skipped or loosened. No dice. One rule, all 56 places: place facts come from data, and the test names the place and seed it drew.

**Done when.** In a drawn place (name and seed in the PR body) a broken promise changes named voters' choices, each with a record id and a weight above zero, and src/core2/record.test.ts passes.

**Files.** src/core2/record.test.ts, src/core2/modules/record.ts

**Notes.** Found running src/core2 on main, Oct 19 to 20 (release-suite-red-list-on-main). The place and seed were not printed; print them first.
