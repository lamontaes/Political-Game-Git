---
id: core-collapse-lease-unsupported
title: "The two-level collapse fails on a housing lease (seed playtest-0712)"
area: core
kind: bug
priority: 3
status: done
claimed-by:
pr: #4703
blocked-on:
milestone:
source: 'docs/coordination/play.md "Needs from other sessions" (line 147); triage in play-needs-play-147'
claimed-at:
---

**What.** Opening a two-level world with seed playtest-0712 on 2026-10-12 failed with Unsupported collapsed purchase terms for a household lease. The throw is still at the collapse of a household's purchase contracts in residents.ts, which rejects a contract with arrears, a credit facility, recipient income or an external inflow. Reproduce it first, since the line may be fixed on main. If it still fails, make the collapse carry the lease as counted terms rather than refuse it.

**Rules.** One model, two tiers: a counted household carries the same lease terms as a full one, times its count. Speed: the collapse stays within the year limit. No dice. One rule, all 56 places.

**Done when.** In the played world (buildBenchWorld, every module installed) with seed playtest-0712 and the place that seed draws (name both in the PR body), the two-level opening completes and a test beside src/core2/residents.test.ts proves the lease's rent is paid by the counted household, naming the contract record id. If it no longer fails, the PR body says so and closes the line.

**Files.** src/core2/residents.ts, src/core2/residents.test.ts

**Notes.** Found while triaging play-needs-play-147.

Sent back 2026-10-16 from PR #4703 (branch claude/collapse-lease): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4703 (branch claude/collapse-lease): Local changed-file checks pass, but GitHub refused the merge: {"message":"Pull Request is still a draft","documentation_url":"https://docs.github.com/rest/pulls/pulls#merge-a-pull-request","status":"405"}gh: Pull Request is still a draft (HTTP 405). The prescribed REST ready-for-review endpoint did not clear this blocker; finish on that branch, merge main into it first.
