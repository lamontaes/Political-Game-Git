---
id: office-local-town-hall-cadence
title: "A local town hall has a cadence, not five days in eight"
area: office
kind: feature
priority: 3
size: S
status: done
claimed-by:
pr: #4732
blocked-on:
milestone:
source: "split from office-needs-office-federal-23 (Oct 16, 2026)"
claimed-at:
---

**What.** In one Maine run on an earlier build, the local kit's town hall was taken by a member's character five days in eight. Decide a cadence from the place's data (how often a member of Congress or a legislator holds a town hall in the district) and keep it in the local kit, so the act is offered on that cadence and the character takes it on that cadence.

**Rules.** No dice: cadence and lines follow records and traits. An effect is a read, not a record. No hand-written player text: lines are worded by the English engine. One rule, all 56 places.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place, seed named) a member's town halls fall on the cadence, by act record id, and a test beside src/core2/office-day-federal.test.ts covers it. The owner plays it: holds a town hall a few times a year, not every week.

**Files.** src/core2/office-day-federal.ts, src/core2/modules/office-day.ts

**Notes.** Split out of the OFFICE-FEDERAL needs list after checking main.

Sent back 2026-10-16 from PR #4732 (branch claude/town-hall-cadence): GitHub refuses to merge a draft pull request (HTTP 405: "Pull Request is still a draft"). The merger skill's prescribed REST ready-for-review endpoint returns HTTP 404. Mark this PR ready for review, retain the named changed-file checks at the top, and push any needed corrections; finish on that branch, merge main into it first.
