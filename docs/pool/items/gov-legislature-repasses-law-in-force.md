---
id: gov-legislature-repasses-law-in-force
title: "A legislature passes a bill for a law already in force"
area: gov
kind: bug
priority: 3
size: S
status: done
claimed-by:
pr: #5778
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** In Colorado ward charter 0820000 (seed 66bfd7556936bacdd58270aee92c6eddc549823a, law-wiring-government.test.ts), the state legislature passed automatic voter registration four times in one month (HB25-1003, 1015, 1018, 1019) while it was already law, two on the same day. A body should not draft or pass a bill whose answer is the law in force.

**Rules.** No dice; the agenda reads the law in force; one rule for all 56 places.

**Done when.** In a played year in two drawn places, no body passes a bill whose answer equals the law in force at that level; the test names the place, seed and bill ids.

**Files.** src/core2/legislature*.ts

**Notes.** TODO

Sent back 2026-10-23 from PR #5778 (branch claude/repass-law-in-force): New legislature-repass regression fails in St. Leon IN 1866978, seed fc26f909e5d5b49dc5d8a2796b7220e913cc95143777de03a7dccc69445ac090: council bill re-enacts right-to-counsel 0 over existing 0; finish on that branch, merge main into it first.

Sent back 2026-10-24 UTC from PR #5778 (branch claude/repass-law-in-force): Done-when needs two drawn-place played years, but legislature-repass.test.ts sets WANTED to PINNED.length + 1 and counts both pinned regressions, guaranteeing only one fresh draw; require two fresh witnessed draws and update the evidence table; finish on that branch, merge main into it first.
