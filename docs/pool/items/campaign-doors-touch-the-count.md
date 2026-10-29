---
id: campaign-doors-touch-the-count
title: "A door touches the counted group: the player's evening of doors fills in only who a porch scene could cast"
area: elections
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The player's own canvass filled in every counted resident who opened as a full person, so a season of campaigning made about a thousand full people, held more than 4 GB and ran past fifty minutes. That breaks the two-level population rule (full people only where they matter) and the speed rule. The CTO ruled Oct 29 that a door touches the counted group and only someone the player talks with in a scene is filled in; the owner's Oct 27 ruling is a short scene at one or two doors.

**Rules.** One model, two tiers: a counted resident who opens is reached and answers the ask for the vote by the same rule as a full person, from their record, times their count. Speed: a season of doors must not grow the population by the thousand, so the year stays under two minutes.

**Done when.** src/core2/door-fill-in.test.ts passes in a buildBenchWorld drawn place with the seed it prints: an evening of doors with the player's limit fills in at most playerDoorFillIns households, and counted openers keep counted pledge rows; undoing the limit fills in dozens of households (37 in Mellwood AR) and fails the test.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-day.ts, src/core2/data/campaigns/parameters.json, src/core2/door-fill-in.test.ts

**Notes.** TODO
