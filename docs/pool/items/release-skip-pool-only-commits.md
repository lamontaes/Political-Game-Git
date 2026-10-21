---
id: release-skip-pool-only-commits
title: "Pool-only commits to main do not start the Release workflow"
area: release
kind: cleanup
priority: 2
size: S
status: in-pr
claimed-by: claude/skip-pool-commits-s8
pr: #5130
after:
blocked-on:
source: "acting CTO, Oct 19, from the Actions run history"
claimed-at: 2026-10-19T20:02:34.017Z
---

**What.** Every `pool:` one-file commit to main (a claim, a status change, an add) triggers the full Release workflow, and the next one cancels it: 373 of 714 runs since Oct 17 were cancelled as superseded. Add `paths-ignore: ["docs/pool/**"]` to the push trigger in `.github/workflows/release.yml`, keeping `workflow_dispatch`, and update tests/release/release-workflow.test.ts if it asserts the trigger's shape. A merge commit that changes code or declarations still runs the full workflow.

**Rules.** Checks stay light: the gate runs when code or declarations change, not on bookkeeping commits that touch only the pool. Replace, never layer: adjust the existing Release push trigger while preserving workflow_dispatch and code checks, rather than adding another release pipeline.

**Done when.** A pool status commit on main starts no Release run, a merge commit after it does start one and finishes, and the release-workflow test passes on main; the PR states both run ids (the one that did not start, by commit sha, and the one that did). The owner plays it: nothing; the Actions page stops filling with cancelled runs.

**Files.** .github/workflows/release.yml, tests/release/release-workflow.test.ts

**Notes.** Counted by the acting CTO from `gh run list` on Oct 19. The merger's "cancel stale runs" step keeps working for the runs that do start.
