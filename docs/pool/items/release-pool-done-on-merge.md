---
id: release-pool-done-on-merge
title: "Pool items flip to done on main when their PR merges"
area: release
kind: wiring
priority: 1
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
milestone:
source: "acting CTO, Oct 19: 17 of 88 in-pr items point at merged PRs"
---

**What.** Add a GitHub Actions workflow on `pull_request: closed` that runs only when the PR was merged (`merged == true`). It reads the pool item id from the first line of the PR body, either in the `Pool item: <id>` form or as a bare id, and if the body has none it finds the item whose `pr: #N` matches the PR in docs/pool/items. On main it runs `npm run pool -- status <id> done --pr N --by cto` and pushes the one-file commit, so the index updates itself and no merger step can be skipped. A PR with no id is logged, not failed.

**Rules.** The pool is the only backlog: an item that stays in-pr after its PR merged hides finished work and keeps Next up stale. This workflow applies that rule by making the done flip automatic at merge, so no merger has to remember it. Replace, never layer: reuse the existing pool status command and index generator rather than creating a second task store or a second way of calculating item status.

**Done when.** A merged test PR on a scratch pool item flips that item to done on main within five minutes with no human step, and the PR body names the workflow run id that did it. After that, `npm run pool -- --check` passes on main. `tests/release/release-workflow.test.ts`, or a new workflow test beside it, asserts the workflow's `pull_request` closed trigger and its merged guard. Until this exists, the merger runs the done step by hand.

**Files.** .github/workflows/pool-done-on-merge.yml, scripts/pool/index.ts, tests/release/

**Notes.** Opened by the acting CTO on Oct 19 from CTO-HANDOFF-2026-10-19.md, which lists the 17 in-pr ids that point at merged PRs and their done flips. Until this item is done, the merger runs those flips by hand with `npm run pool -- status <id> done --pr <N> --by cto`.
