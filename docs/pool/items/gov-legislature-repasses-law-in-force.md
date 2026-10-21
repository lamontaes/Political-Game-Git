---
id: gov-legislature-repasses-law-in-force
title: "A legislature passes a bill for a law already in force"
area: gov
kind: bug
priority: 3
size: S
status: claimed
claimed-by: claude/repass-law-in-force
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T02:21:31.090Z
---

**What.** In Colorado ward charter 0820000 (seed 66bfd7556936bacdd58270aee92c6eddc549823a, law-wiring-government.test.ts), the state legislature passed automatic voter registration four times in one month (HB25-1003, 1015, 1018, 1019) while it was already law, two on the same day. A body should not draft or pass a bill whose answer is the law in force.

**Rules.** No dice; the agenda reads the law in force; one rule for all 56 places.

**Done when.** In a played year in two drawn places, no body passes a bill whose answer equals the law in force at that level; the test names the place, seed and bill ids.

**Files.** src/core2/legislature*.ts

**Notes.** TODO
