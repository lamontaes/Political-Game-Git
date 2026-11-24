---
id: play-offices-keep-their-hours
title: "A public office the player travels to is open only in its hours"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by: play-first/play-offices-keep-their-hours
pr: #7083
blocked-on:
source: owner playtest of v0.73.0, Nov 1, 23:05 UTC (third batch, a Massachusetts life)
lead: play-first
milestone: play-first
claimed-at: 2026-11-01T22:46:47.621Z
---

**What.** The owner's v0.73.0 playtest screenshots show the player walking into the City Clerk's office at 8:30 PM on Monday, January 20, 2025, Inauguration Day evening, and filing there. A clerk's office keeps weekday business hours, and the game already keeps office hours for some places (src/core2/office-day-acts.ts, src/core2/modules/constituent-cases.ts). Travel should read the office's hours: outside them, the card says it is closed and when it opens, and Go waits or is unavailable.

**Rules.** Wire to the world: Travel reads the hours an engine already keeps, never a second table; look for the existing hours record before adding one. No hand-written player text: closed and the next opening are worded by the English engine. One rule, all 56 places: hours come from data, estimated with their source where unknown.

**Done when.** In a drawn place (named with seed), Travel to the clerk at 8:30 PM shows it closed with its next opening, and at 10 AM on a weekday opens the visit; a browser check asserts both. Choosing Go at 8:30 PM plays the visit the next morning at the office's opening hour, and the clock shows that time.

**Time box.** 3 hours.

**You will see.** The clerk's office is closed in the evening and tells you when it opens.

**Screenshot.** The clerk's Travel card at 8:30 PM and at 10 AM.

**Files.** src/bench/play.mjs, src/core2/office-day-acts.ts

**Notes.** Filed by the CTO from the owner's v0.73.0 playtest, third batch (Nov 1, 23:05 UTC, five screenshots, a Massachusetts life). Read: OWNER-DECISIONS (town council seats elected as each place's records say, at-large, by district or mixed; six offices and playerMayFile, Oct 29; every campaign act is a scene), the pool for twins.

Owner, Nov 1 23:30 (Northampton, Massachusetts): "I went to the office after the president's speech ended. So it should have not fast-forwarded, but it should have started the next day because obviously the office isn't open at 8:30 p.m." Going to a closed office makes the trip at its next opening: the clock moves to the next morning it opens and the visit plays then, instead of a closed card.
