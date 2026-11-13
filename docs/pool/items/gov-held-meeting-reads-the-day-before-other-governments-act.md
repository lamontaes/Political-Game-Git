---
id: gov-held-meeting-reads-the-day-before-other-governments-act
title: "A meeting the player votes at reads the day before the state or Congress acts on it; an unattended one reads it after"
area: gov
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: gov-held-meeting-decides-as-unheld
blocked-on:
lead: governing
model: opus
effort: medium
root: none
source: found while building gov-held-meeting-decides-as-unheld; filed by hand
---

**What.** A council or board the player sits on can vote differently on a day the state legislature or Congress passes a law on the same question, only because the player was at the meeting. Pull request #9022 closed the case of two local bodies meeting the same day (Heber Springs, Arkansas, key 0531090, place seed fb9b371a2c260c1e5bd2ea80924b870a320f30742d81a7daca8fe7535f0c943d: the county board passed civilian oversight of police on February 4, 2025, and council member person_10f2e9664daa2721 voted no on council Ordinance 2025-4 at the player's stop and yes with the player away). The same gap is open for a law another government passes that day. Seen: the meeting panel's roll call on the item and the town's ordinances afterward.

**Cause.** Found in code: not reproduced for a state or federal law. The player lives a day before the world's day runs, so `takeUpItem` and `adjourn` in src/core2/modules/office-day.ts vote before any of that day's institutional work. An unattended meeting votes in `closeMeeting`, which is that day's calendar work, dispatched in the order the work was placed (src/core2/module-calendar.ts, `runModuleCalendar`). A state or federal floor vote placed on the calendar earlier than the meeting runs first. A member's position reads the newest law on the question across the town's whole chain and the nation (`lawKeysOf`, `settledness` and `recordConsistency` in src/core2/modules/legislature.ts), so the law passed that morning counts in the unattended vote and not in the attended one.

**Fix.** A local meeting's vote reads the world as the day opened, attended or not: the office-day module's meeting work for a date is dispatched before any other institutional work of that date. The calendar keeps placement order today, so this needs one ordering rule in `runModuleCalendar` (a work row may ask to run at the day's opening) or the meeting's close moved to the first step of the day; pick the one that adds no scan. No second vote path and no change to how a position is worked out. Extend the seated twin in src/core2/office-day-attend.test.ts with a place and seed where the state passes a law on a question the council votes that day, found by drawing and waiting, and keep it there.

**Time box.** 3 hours

**Rules.** One engine per mechanic: the vote stays `voteAtMeeting`. No dice. Drawn-place tests: name the place and seed that showed it and what was passed over. Speed: no scan of the calendar each day.

**Done when.** A second session sees it in the running game: in a drawn place and seed where another government passes a law on a question a local body votes the same day, the same played world run twice, once with the player held at the meeting casting each member's own vote and once away, shows the same votes by member in dev mode's bill outcome; the speed:year time is no more than 20 percent over main.

**Waits on.** gov-held-meeting-decides-as-unheld

**Files.** src/core2/module-calendar.ts, src/core2/modules/office-day.ts, src/core2/office-day-attend.test.ts
