---
id: people-care-frail-relatives
title: "People care for sick and frail relatives, drawn by closeness"
area: people
kind: feature
priority: 2
size: S
status: done
claimed-by:
pr: #4702
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
claimed-at:
---

**What.** `care-for-relative` now answers children at home but not adult relatives in poor health, and the tie never raises it. Draw care from a relative's health need and the closeness between the two. ATUS household care is 22.0% of person-days; the check printed 0% in January and February 2021.

**Rules.** No dice; sliding scales; research calibrates totals only.

**Done when.** `node --import tsx scripts/core2-year/time-use.ts <seed>` in three drawn towns shows caring for household members above 0 percent of person-days, the act records named by id, a test for a frail relative's care traced to their health record, and ATUS 22.0% recorded as the target.

**Files.** src/core2/data/content.json, src/core2/modules/people.ts, scripts/core2-year/time-use.ts

**Notes.** core.md line 185, checked Oct 15: partly built in f4f4a18bd for children. Socializing (17 to 20% against 30.4%), civic activity and work attendance are separate gaps; file them if the check still shows them.

Looked at 2026-10-16: the care read is easy (a relative at home with a recorded serious illness, weighted by the tie), but a played year gives no town resident a serious illness (see people-health-cases-for-residents), so it could not be shown to fire. Take this after that item.

Sent back 2026-10-16 from PR #4702 (branch claude/people-care-frail-relatives-2): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4702 (branch claude/people-care-frail-relatives-2): Local changed-file checks pass, but GitHub refused the merge: {"message":"Pull Request is still a draft","documentation_url":"https://docs.github.com/rest/pulls/pulls#merge-a-pull-request","status":"405"}gh: Pull Request is still a draft (HTTP 405). The prescribed REST ready-for-review endpoint did not clear this blocker; finish on that branch, merge main into it first.
