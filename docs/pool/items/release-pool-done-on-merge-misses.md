---
id: release-pool-done-on-merge-misses
title: "The done-on-merge workflow misses most merges: a shared concurrency group cancels the waiting run"
area: release
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 
---

**What.** The pool-done-on-merge workflow is meant to flip an item to done the moment its PR merges, but 303 of its last 400 runs were cancelled and 42 merged PRs still showed in-pr on Oct 23. The cause is the shared concurrency group pool-main-push: GitHub keeps one running and one pending job per group, so in a merge burst each newer merge cancels the run waiting behind it. A second, smaller miss is a red run when a merger already flipped the item on main between the checkout and the fetch, because git commit finds nothing staged. Give each pull request its own group, let the push retry cover a burst, and treat nothing-to-commit as finished.

**Rules.** Speed: the merger must never do by hand what the workflow is for, so the workflow has to land every flip, not one in four; Replace, never layer: the one shared group is replaced by a per-PR group rather than a second workflow that sweeps misses.

**Done when.** The tests in tests/release/pool-done-on-merge.test.ts and scripts/pool/index.test.ts pass with the workflow holding a per-PR concurrency group and no cancellation, the pool command retries its push eight times, and an applyAndCommit with nothing staged returns without error; after the next merge burst of ten or more PRs, the run list for the workflow shows zero cancelled runs and every merged PR that named an item is done.

**Files.** .github/workflows/pool-done-on-merge.yml, scripts/pool/index.ts, scripts/pool/done-on-merge.ts, tests/release/pool-done-on-merge.test.ts

**Notes.** Found by the Oct 23 reconcile (CTO). Meeting P1 rules: the fix is a build, with its gate in the PR.

Sent back 2026-10-23 from PR #5843 (branch cto/pool-done-on-merge-fix): The required ten-merge operational proof is explicitly absent, and routing would prematurely complete the broad item; the changed no-op and exhausted-retry paths also lack behavior coverage; finish on that branch, merge main into it first.
