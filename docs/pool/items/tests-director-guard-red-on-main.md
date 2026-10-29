---
id: tests-director-guard-red-on-main
title: "The director's stopgap and numbers guard is red on main: literals in coming-of-age.ts and a TUNABLE row with no stopgap"
area: director
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/director-coming-of-age-one-rule
pr: #6434
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T22:50:15.978Z
---

**What.** director.test's guard that registers every stopgap and keeps numbers in data fails on clean main at 8466239598. src/director/coming-of-age.ts computes a leap year with literal numbers, and it puts a February 29 birthday's coming of age on March 1 while the core's own ageOnDate counts that person of age on February 28. The parameter directorVolunteerOfferImpact in src/director/data/director.json is TUNABLE with no stopgapId or checkRange. Every PR that runs director.test is red until this lands.

**Rules.** No hand-written numbers in director code: the guard is the standing rule that every number lives in a parameter table, tagged, with a stopgap for a TUNABLE one. One source per fact (owner, Oct 27, 4 PM Eastern): the coming-of-age day is the core's own dateAtAge, the same day every age read uses.

**Done when.** src/director/director.test.ts passes its stopgap and numbers test with GOLDEN_PATH_SEED=m3-dc1 and fails on clean main; src/director/volunteer-offer-weight.test.ts and src/director/journal.test.ts still pass; the coming-of-age day equals dateAtAge for every birthday, a February 29 one included.

**Files.** src/director/coming-of-age.ts, src/director/data/director.json

**Notes.** TODO
