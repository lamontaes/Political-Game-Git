---
id: director-canvass-meets-people-where-they-are
title: "A canvass outing sometimes meets the person where they are at that hour: outside their job, at the library, not only at their door"
area: director
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: director
model: opus
effort: high
root: design-director-on-core2
source: added with npm run pool -- add
claimed-at: 2026-11-04T16:21:08.503Z
checked: fable 2026-11-10
---

**What.** The owner ruled on Oct 27 at 5 PM that every campaign act is a scene: sometimes uneventful, sometimes you meet someone at the library, sometimes someone waiting outside a job. The porch scene stages every canvass at the resident's door, because the campaign engine knocks household doors and keeps no record of meeting voters anywhere else. Where a person is at the canvass hour (at work, at a public building) comes from the work schedule and place hours, which exist now. This item makes the engine reach a resident away from home, records where, and stages the scene there. Seen: a canvass scene where you meet a voter at the library or outside their job instead of at the door (owner, Oct 27).

**Cause.** Found in code: `src/core2/modules/campaigns.ts` line 1260, where the door walk keeps only adults at home (`athome`), so every `campaign.door` cause already means the resident was home and the director cannot honestly stage a scene at a job or the library. The item's own Nov 4 note records that Lane 3 reached this.

**Fix.** Part 1 (campaigns engine): let a canvass reach a resident away from home (a workplace or public building, from the job shift and building hours) and record where. Part 2 (director): add a circumstance row and a `their-workplace` setting in `resolveSetting` that read that record, with bank lines from Story. The home door scene stays for residents who are home.

**Time box.** 10 hours for one Opus session, in two PRs (engine record, then director).

**Rules.** Wire to the world: the place is where the person's own records put them at the canvass hour (their job's shift, a public building's open hours), never a drawn place. One rule, all 56 places: the places come from each town's own workplaces and buildings. No dice: who is met is the day's door ranking, and where is their schedule.

**Done when.** A second session plays a year in a drawn place from `buildBenchWorld` (place and seed written down) with the player canvassing, and finds at least one canvass scene staged outside a resident's workplace on a day their shift covers the canvass hour, citing the door's campaign record id and the job record id. It also finds a canvass scene still staged at the door on a day the resident is home. `src/director/circumstance.test.ts` covers both.

**Waits on.** Nothing. This item builds the engine's side itself as part 1 (a canvass reaching a resident away from home, with where recorded).

**Files.** src/core2/modules/campaigns.ts, src/director/doors.ts, src/director/scheduling.ts, src/director/data/circumstances.json, src/director/circumstance.test.ts, src/bench/story.ts

**Notes.** Waits on integration-day-lands-on-morning-and-places-keep-hours for a place's hours. Owner's words: OWNER-DECISIONS, Oct 27, 5 PM Eastern.

Lane 3 (Nov 4), the design (its dependency on place hours is done):

- **Where the resident is (`src/director/doors.ts`, Lane 3):** `doorsKnocked` reads the resident's work commitments over the canvass window (`campaignParameter("canvassStartHour")` and `volunteerShiftHours`, through `minutesAtWork`, the same reading the campaign engine's `canvassHoursFree` uses for volunteers). It adds `at: "work"` with the job's id, or `at: "home"`.
- **Which scene (`circumstances.json`, Lane 3):** a `door-at-work` row (`recordFactEquals` `at: ["work"]`) staged at a new setting kind, `their-workplace`. The door rows take `at: ["home"]`.
- **Where it plays (`scheduling.ts` `resolveSetting`, Lane 3):** `their-workplace` resolves to the counterpart's job's employer, with an opening in `director.json` `settingHours`.
- **The picture (`src/bench/story.ts` `SETTINGS`, Lane 4):** `their-workplace` needs the workplace pictures, or the scene falls back to a home picture. Proposed in `agreements/3-4.md`. Not started on a branch.

Lane 3 (Nov 4, evening), the design above was wrong and is replaced: the campaign engine opens a door only to an adult who is home at the minute of the knock (`src/core2/modules/campaigns.ts`, the `athome` filter in the door walk), so every `campaign.door` cause already means the resident was at home. Reading their shift in `doors.ts` would always say home, and staging the scene at a job would contradict the record. Meeting someone where they are needs the campaign engine to reach them there and record it. Asked of Lane 1 in `agreements/1-3.md` ("Asked by Lane 3, Nov 4: a resident met away from home"). Lane 3's side (the circumstance row, `their-workplace` in `resolveSetting`, the bank lines) follows Lane 1's record. Put back to open; the branch `lane3/canvass-at-work` holds nothing.
