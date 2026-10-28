---
id: tests-scene-narration-once-no-lead-sample
title: "scene-narration-once finds no scene whose lead names its opener in some drawn places since the school acquaintances went"
area: director
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/director/scene-narration-once.test.ts needs at least one scene in four drawn places whose lead names the one who opens it. Since #6585 (engine map line 12) an 18-year-old player opens knowing family only (SG-WIRE-PEOPLE-SCHOOLMATES), so far fewer people are watched, and #6585 also fixed the artifact the test had counted (a lead that looked the opener up without saying the name). With seed 66ed52ba766be6d0873ae3c267b94d47255aa977 it fails on main: Keizer, Oregon, 22 scenes with an opener and none whose lead names them. Widening the watch to the household's known people still found none in Keizer (54 scenes).

**Rules.** One rule, all 56 places: the test draws its places and must hold in every drawn world. Never skip or loosen the check; widen the sample through records (more months, the household's circle) or a lead row that names the opener.

**Done when.** In four drawn places from all 56, with seed 66ed52ba766be6d0873ae3c267b94d47255aa977 and two random seeds named with their places, the test finds at least one scene whose lead names its opener by record id and passes; the break-it (opening said after such a lead) fails it.

**Files.** src/director/scene-narration-once.test.ts,src/director/scene.ts,data/english

**Notes.** Twin of `tests-journal-margin-and-narration-once-flaky-on-drawn-seeds` (found after filing); the evidence is in that item. CTO: drop this one. Filed by wire-people-and-director (Oct 28). Read: OWNER-DECISIONS (Oct 28), the engine map line 12; searched the pool for narration-once, lead, opener.
