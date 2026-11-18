---
id: core-speed-year-matawan-and-kimberly-over-120-seconds
title: "A town year at Matawan NJ and Kimberly ID runs over the 120-second bar"
area: core
lead: laws
kind: bug
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: none
source: "Account lead builder, Nov 14 (world address PR, coordinator's request)"
checked:
---

**What.** A year of the played world at Matawan, New Jersey (drawPlace("mayor-acts-1:2","mayor-acts")) takes 210 to 237 s and at Kimberly, Idaho (drawPlace("mayor-acts-1:4","mayor-acts")) 125 to 143 s, with and without the mayor-acts change. Seen: npm run speed:year at those places passes the bar.

**Cause.** Needs cause. Where the time goes at these two places is not yet measured; the years were timed with a 365-day advanceCore after buildBenchWorld on the train at 5fe71dec: Matawan 216.9 and 236.7 s, Kimberly 133.1 and 142.9 s (Edmore 24.1 s and Odessa 53 s beside them), one process at a time.

**Fix.** None until the cause is found.

**Time box.** 4 hours for one Opus session.

**Rules.** No dice; one engine per mechanic (the offices engine's acts, no second scheduler); cadence-and-summaries (a yearly event, never a daily scan); an effect is a read, not a record.

**Done when.** Matawan and Kimberly each run a year under 120 s on npm run speed:year, by the same bar as every place, and a second session reruns it and sees the same.

**Waits on.** Nothing.

**Files.** src/core2/modules, scripts/speed-years/run.ts

**Notes.** Filed from the mayor-acts and world-address measurements; the older speed items (core-speed-year-four-years) name other places.
