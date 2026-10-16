---
id: core-residents-seams-single-home
title: "The counted-worker seams live in one file"
area: core
kind: cleanup
priority: 3
size: S
status: done
claimed-by:
pr: #4718
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** `rerateCountedJob` is defined in modules/residents.ts and its siblings in residents-economy.ts, and `rerateCountedJob` scans every flow per call. Keep one home for the seams and index the flows by job.

**Rules.** No dice (a death or a move comes from causes); an effect is a read; one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** One definition of each seam, no whole-flow scan on a rerate, and the speed guard unchanged or better in a drawn town.

**Files.** src/core2/residents-economy.ts, src/core2/modules/residents.ts

**Notes.** Split out of world-needs-world-98 (the "Needs from other sessions" section of docs/coordination/world.md), checked against main on Oct 16, 2026.

Sent back 2026-10-16 from PR #4718 (branch claude/residents-seams): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4718 (branch claude/residents-seams): Local changed-file checks pass, but GitHub refused the merge: {"message":"Pull Request is still a draft","documentation_url":"https://docs.github.com/rest/pulls/pulls#merge-a-pull-request","status":"405"}gh: Pull Request is still a draft (HTTP 405). The prescribed REST ready-for-review endpoint did not clear this blocker; finish on that branch, merge main into it first.
