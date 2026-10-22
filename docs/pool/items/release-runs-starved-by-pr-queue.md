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

**Rules.** Replace, never layer: reduce runner load through the existing workflow push filters, preserving all other triggers instead of adding a parallel validation path. Fix the cause, not a workaround (owner rule: fix shared systems the same day). Don't make the simulation checks gate packaging again (owner ruling Oct 15). Don't cancel a run on a commit that is still a branch's tip without a stated reason.

**Done when.** Release runs on main complete within an hour of a merge on a normal day, shown by three consecutive successful Release runs on main whose run ids are in the PR body. Main's Deterministic validation completes at least once a day. The change and the measured queue before and after (queued count and oldest queued age) are in the PR body. The workflow trigger test must also show that pull requests and pushes touching executable code stay covered.

**Files.** .github/workflows/release.yml, .github/workflows/validate.yml, .github/workflows/m0-guard.yml, .github/workflows/audit-scan.yml

**Notes.** Options to weigh: give release jobs priority (a separate runner group or a larger runner), cut per-PR load (skip audit-scan or M0 guards on PRs that change no code, run the long jobs only when a PR is marked ready, or batch them), or run release on a schedule plus workflow_dispatch when the queue is deep. Measure first.

PR #5789 supplies the pool-only push filter for validation and M0 guards. The Oct 21 before-change measurements are in its body. Queue count, oldest queued age and release behavior after the change under a busy queue remain to be measured; this configuration slice does not complete the original Done when.
