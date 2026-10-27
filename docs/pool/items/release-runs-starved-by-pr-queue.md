---
id: release-runs-starved-by-pr-queue
title: "Main has not published a release since Oct 20 18:37 UTC: every release run waits behind about 255 queued PR runs and is replaced by the next merge"
area: release
kind: bug
priority: 1
size: M
status: done
claimed-by:
pr: #5839
blocked-on:
source: added by the CTO from the Oct 20 night check
claimed-at:
---

**What.** The last successful Release run on main was at 2026-10-20T18:37Z (2321e9aa0). Every run since (for example on 260fb1ae8, f495d2c42 and ff3a41c18 between 23:29 and 23:45Z) ends canceled. release.yml already ignores docs/pool-only pushes, so pool commits are not the cause. Each run sits pending behind about 255 queued pull-request runs (144 Deterministic validation, 64 M0 guards, 42 Audit scan at 21:40Z, the oldest queued since 13:56Z), and the next merge to main replaces the pending one before a runner frees. Main's own Deterministic validation and M0 guards runs never finish either, so nobody can tell whether main is green.

**Rules.** Replace, never layer: reduce runner load through the existing workflow push filters, preserving all other triggers instead of adding a parallel validation path. Fix the cause, not a workaround (owner rule: fix shared systems the same day). Don't make the simulation checks gate packaging again (owner ruling Oct 15). Don't cancel a run on a commit that is still a branch's tip without a stated reason.

**Done when.** Release runs on main complete within an hour of a merge on a normal day, shown by three consecutive successful Release runs on main whose run ids are in the PR body. Main's Deterministic validation completes at least once a day. The change and the measured queue before and after (queued count and oldest queued age) are in the PR body. The workflow trigger test must also show that pull requests and pushes touching executable code stay covered.

**Files.** .github/workflows/release.yml, .github/workflows/validate.yml, .github/workflows/m0-guard.yml, .github/workflows/audit-scan.yml

**Notes.** Options to weigh: give release jobs priority (a separate runner group or a larger runner), cut per-PR load (skip audit-scan or M0 guards on PRs that change no code, run the long jobs only when a PR is marked ready, or batch them), or run release on a schedule plus workflow_dispatch when the queue is deep. Measure first.

PR #5789 supplies the pool-only push filter for validation and M0 guards. The Oct 21 before-change measurements are in its body. Queue count, oldest queued age and release behavior after the change under a busy queue remain to be measured; this configuration slice does not complete the original Done when.

After-change measurement, Oct 22 (with #5789 merged at 00:59 UTC). Ten merges reached main between 02:30 and 04:32 UTC. Release runs 10311 to 10316 were each superseded by a newer merge and canceled. Run 39716151646 (10317, merge #5045) was created at 03:18:56 and published at 03:53:17: 35 minutes. Its longest job waits were 6 minutes for the build job (behind the release-main-validate group) and 9.7 minutes for the Windows packager. The next two runs also succeeded: 39719387921 (03:54 to 03:58) and 39722902098 (04:32 to 04:33). Main's Deterministic validation succeeded on the same three merges: 39716151645, 39719387882 and 39722902067. At 07:50 UTC no run was queued in the repository (list_workflow_runs status queued: 0) and four were in progress, all for one pull request. The workflow trigger tests (tests/release/validate-workflow.test.ts and release-workflow.test.ts, 22 tests) pass on main: pull requests and code-changing pushes keep their triggers.

Sent back 2026-10-23 from PR #5839 (branch claude/release-queue-measured): The notes-only diff lacks the required impact-none release declaration; the first two reported successful Release runs and timestamps were independently verified; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5784 (branch claude/release-queue): the dated queue note has no release declaration in docs/release/changes and no evidence table for its bounded report-only delivery; preserve the still-open queue work and add an accurate impact-none declaration; finish on that branch, merge main into it first.

Measured Oct 21 07:00Z (claude, claude/release-queue, no workflow change): the queue has drained without a change to the workflows. Queued runs across the repository: 3 (one M0 guards run on a PR branch, one Deterministic validation on main, one M0 guards run on a PR branch), against about 255 on Oct 20 night. Release runs on main since 05:10Z: 10255 (39548078476) success, 10256 and 10257 canceled within minutes by the next merge, 10258 (39548519649) success, 10259 (39549940627) canceled 35 seconds after it started by 10260, 10260 (39549992463) success in 47 minutes, 10261 (39553251880) success in 50 minutes. So the last three completed Release runs that were not replaced by a newer merge (10258, 10260, 10261) all succeeded, and the two that finished in under an hour from their merge are 10260 and 10261, but the run time is still 47 to 50 minutes, close to the hour the Done when asks for, and a merge within that time still cancels a pending run. The gap is not closed: main's Deterministic validation run 29802 (39558872073, on 7e0d7e6067) was still queued at 07:00Z, and no change keeps the queue from refilling. Left open for the CTO: confirm whether the drain was an owner action (a runner added or runs canceled), and decide whether a priority change is still wanted.
