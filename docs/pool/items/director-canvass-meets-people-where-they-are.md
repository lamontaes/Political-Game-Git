---
id: director-canvass-meets-people-where-they-are
title: "A canvass outing sometimes meets the person where they are at that hour: outside their job, at the library, not only at their door"
area: director
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The owner ruled on Oct 27 at 5 PM that every campaign act is a scene: sometimes uneventful, sometimes you meet someone at the library, sometimes someone waiting outside a job. The porch scene (director-producer-canvass-visit) stages every canvass at the resident's door. The campaign engine knocks household doors and keeps no record of meeting voters anywhere else. Where a person is at the canvass hour (at work, at a public building) is the integrator's settingHours and the work schedule, so this waits on that data path.

**Rules.** Wire to the world: the place is where the person's own records put them at the canvass hour (their job's shift, a public building's open hours), never a drawn place. One rule, all 56 places: the places come from each town's own workplaces and buildings. No dice: who is met is the day's door ranking, and where is their schedule.

**Done when.** In a buildBenchWorld drawn place with the seed named, a played year in src/director/circumstance.test.ts stages a canvass scene outside the resident's workplace on a day their shift covers the canvass hour, citing the door's campaign record and the job record id, and still stages it at the door on a day they are home.

**Files.** src/director/doors.ts, src/director/scheduling.ts, src/director/circumstance.test.ts

**Notes.** Waits on integration-day-lands-on-morning-and-places-keep-hours for a place's hours. Owner's words: OWNER-DECISIONS, Oct 27, 5 PM Eastern.
