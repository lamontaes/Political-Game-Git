---
id: release-runs-starved-by-pr-queue
title: "Main has not published a release since Oct 20 18:37 UTC: every release run waits behind about 255 queued PR runs and is replaced by the next merge"
area: release
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added by the CTO from the Oct 20 night check
claimed-at:
---

**What.** The last successful Release run on main was at 2026-10-20T18:37Z (2321e9aa0). Every run since (for example on 260fb1ae8, f495d2c42 and ff3a41c18 between 23:29 and 23:45Z) ends cancelled. release.yml already ignores docs/pool-only pushes, so pool commits are not the cause. Each run sits pending behind about 255 queued pull-request runs (144 Deterministic validation, 64 M0 guards, 42 Audit scan at 21:40Z, the oldest queued since 13:56Z), and the next merge to main replaces the pending one before a runner frees. Main's own Deterministic validation and M0 guards runs never finish either, so nobody can tell whether main is green.

**Rules.** Fix the cause, not a workaround (owner rule: fix shared systems the same day). Don't make the simulation checks gate packaging again (owner ruling Oct 15). Don't cancel a run on a commit that is still a branch's tip without a stated reason.

**Done when.** Release runs on main complete within an hour of a merge on a normal day, shown by three consecutive successful Release runs on main whose run ids are in the PR body. Main's Deterministic validation completes at least once a day. The change and the measured queue before and after (queued count and oldest queued age) are in the PR body.

**Files.** .github/workflows/release.yml, .github/workflows/validate.yml, .github/workflows/m0-guard.yml, .github/workflows/audit-scan.yml

**Notes.** Options to weigh: give release jobs priority (a separate runner group or a larger runner), cut per-PR load (skip audit-scan or M0 guards on PRs that change no code, run the long jobs only when a PR is marked ready, or batch them), or run release on a schedule plus workflow_dispatch when the queue is deep. Measure first.

Measured Oct 21 07:00Z (claude, claude/release-queue, no workflow change): the queue has drained without a change to the workflows. Queued runs across the repository: 3 (one M0 guards run on a PR branch, one Deterministic validation on main, one M0 guards run on a PR branch), against about 255 on Oct 20 night. Release runs on main since 05:10Z: 10255 (39548078476) success, 10256 and 10257 cancelled within minutes by the next merge, 10258 (39548519649) success, 10259 (39549940627) cancelled 35 seconds after it started by 10260, 10260 (39549992463) success in 47 minutes, 10261 (39553251880) success in 50 minutes. So the last three completed Release runs that were not replaced by a newer merge (10258, 10260, 10261) all succeeded, and the two that finished in under an hour from their merge are 10260 and 10261, but the run time is still 47 to 50 minutes, close to the hour the Done when asks for, and a merge within that time still cancels a pending run. The gap is not closed: main's Deterministic validation run 29802 (39558872073, on 7e0d7e6067) was still queued at 07:00Z, and no change keeps the queue from refilling. Left open for the CTO: confirm whether the drain was an owner action (a runner added or runs cancelled), and decide whether a priority change is still wanted.
