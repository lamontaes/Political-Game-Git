---
id: gov-standins-jobs
title: "Jobs-engine stand-ins replaced or relabeled as sourced estimates"
area: world
kind: stopgap
priority: 2
size: M
status: claimed
claimed-by: claude/standins-jobs
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T22:05:27.650Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Oct 19 (claude/standins-jobs): row SG-WORLD-jobs-layoff-decider closed: the owner decides in every played layoff (3 drawn places, one year each: 37 of 37, 15 of 16 and 3 of 3 at owned businesses name the owner; the one miss is a business whose owner changed since), and an organization with no owner decides as itself, so the marker is gone and a test (jobs-layoff-owner.test.ts) holds it. Left open: SG-WORLD-jobs-opening-seekers (the PR #4146 resolution says the two-level population now holds the labor force as counts; the marker is still on two lines in jobs.ts and needs a played-year check before it closes), SG-WORLD-jobs-counted-choices (#4146 called it "by design"; counted workers still decide by summed pulls, not the shared chooser, which AGENTS.md "one model, two tiers" says to replace), and the rest of the family.
