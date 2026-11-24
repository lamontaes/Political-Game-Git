---
id: people-head-keeps-press-job
title: "A resident who is a press reporter named to a town post keeps the press job as their job instead of taking the post (Ulmer, South Carolina, seed 477e04dae2345b42, red on main)"
area: people
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/head-keeps-press-job
pr: #4835
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T21:36:51.945Z
---

**What.** `src/core2/office-day-name-head.test.ts` ("opens a post when its head dies...") fails on main in Ulmer, South Carolina with seed 477e04dae2345b42 (draw seed 19ef2fe44ef92df8272526ffcc0919c169a0d3bccf1aac636b185ba6b5970873): the city administrator named to the open post holds `job:public:press:outlet:television:1:...` as their job, not `job:public:town:city-administrator:...`. The candidate pool in `townPostInput` (src/core2/modules/executive.ts) takes any adult resident who is not heading another department, and a reporter drawn from the town's residents is one. Either the pool leaves out people already on a press payroll, or naming them gives the post's job and ends the press one; decide by what the records say (a person has one full-time job), and make the test's check hold in every place.

**Rules.** An effect is a read, not a record: the person's job is the one they are paid for. No dice. One rule, all 56 places.

**Done when.** The test passes on seed 477e04dae2345b42 and on two other seeds, with the appointed head's job and the press job's status named by record id.

**Files.** src/core2/modules/executive.ts, src/core2/office-day-name-head.test.ts

**Notes.** Found Oct 16 while taking office-appoint-pick-candidate; the failure is the same on main.
