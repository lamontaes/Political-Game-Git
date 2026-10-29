---
id: release-pool-done-push-token
title: "No pool item has flipped to done since 03:46 UTC Oct 28: the flip job's push to main is refused by branch protection"
area: release
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/pool-done-push-token
pr: #6682
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T19:38:26.646Z
---

**What.** Every merged pull request's pool-done run that reaches its push fails with GH006: protected branch update failed, 2 of 2 required status checks are expected. The job pushes with the workflow token that actions/checkout stores, and branch protection refuses that token, as it refused the release publish until the owner added RELEASE_PUSH_TOKEN and #6608 passed it through. The last flip on main is 03:46 UTC; since 08:18 UTC 27 runs failed this way, and items merged all day still read in-pr.

**Rules.** Wire to the world: the pool is the backlog every session reads, and an item stuck in-pr after its merge hides finished work and blocks every after: gate on it. Replace, never layer: the job keeps its one push path and only changes the credential it pushes with.

**Done when.** tests/release/pool-done-on-merge.test.ts asserts the flip job checks out main with secrets.RELEASE_PUSH_TOKEN, falling back to the workflow token, and passes; the release workflow test passes; after merge, the next merged pull request's pool-done run pushes its done commit to main, named by run id.

**Files.** .github/workflows/pool-done-on-merge.yml, tests/release/pool-done-on-merge.test.ts

**Notes.** Found Oct 28 by the old engine session: run 40733896241 (PR #6643) failed with GH006 after eight push retries; no done commit on main since 03:46 UTC. Oct 29 07:05 UTC, Words and director: the flip runs for #6745, #6746, #6747, #6748, #6749, #6750 and #6751 (05:55 to 06:52 UTC) all failed; the latest, run 40831752697, with GH006 after eight retries. The last success was 05:43. #6682 is still open.
