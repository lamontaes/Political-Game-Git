---
id: release-pool-done-on-merge-per-pr-group
title: "Done-on-merge: per-PR concurrency group, eight push retries, nothing-staged is a finished flip"
area: release
kind: bug
priority: 1
size: S
status: in-pr
claimed-by:
pr: #5843
blocked-on:
source: added with npm run pool -- add
---

**What.** The done-on-merge workflow shares one concurrency group, pool-main-push, so in a merge burst GitHub cancels each run waiting behind a newer one and the item stays in-pr. The pool command also goes red when a merger already flipped the item on main before the workflow's fetch, because git commit finds nothing staged. This is the implementation slice of release-pool-done-on-merge-misses: the code and workflow change with tests that prove each behavior on the integrated head, while the ten-merge operational proof stays with the parent item.

**Rules.** Replace, never layer: the shared group is replaced by a per-PR group and the three-try push by eight tries, with no second sweeping workflow added beside them.

**Done when.** tests/release/pool-done-on-merge.test.ts asserts the workflow holds group pool-done-on-merge-${{ github.event.pull_request.number }} with cancel-in-progress false; scripts/pool/index.test.ts proves with a real bare origin that a claim already on main stages nothing and returns without error, that a push rejected every time ends with push to main failed 8 times after exactly eight attempts and restores the branch, and that a push refused three times then accepted lands the claim on main; the test files pass on the integrated head.

**Files.** .github/workflows/pool-done-on-merge.yml, scripts/pool/index.ts, scripts/pool/index.test.ts, tests/release/pool-done-on-merge.test.ts

**Notes.** Split from release-pool-done-on-merge-misses on 2026-10-23 at Merger A's send-back of PR #5843: that item keeps the operational acceptance (zero cancelled runs and every named item done after the next burst of ten or more merges), which can only be checked after this lands.
