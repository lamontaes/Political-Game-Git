---
id: words-scene-says-late-morning-at-six-in-the-evening
title: "A scene's opening line says \"Late in the morning\" when the clock reads 6:00 PM"
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: rc4-hand-written-words
source: lead's play walk as a council member on Nov 11, 2026 (Lino Lakes, Minnesota, seed 046d2235-27df-4daa-a680-423d6f24d0d7, the whip's scene before the council meeting of February 4, 2025)
checked:
claimed-at:
---

**What.** The line that opens a scene tells the player when and where they are. On the walk above the clock read Tuesday, February 4, 2025, 6:00 PM, the evening of the council's meeting, and the scene opened: "Late in the morning on February 4th, you walk into the chamber, and Kayla McIntosh turns to you." The owner asked on Nov 11 that words know the hour and the person. Seen: the opening line of any scene at 1440x900, where the part of the day it names is the one the clock shows.

**Cause.** Needs cause. Looked at: the line as played and the clock beside it. Not yet read in code: where the opening line takes its part of the day (the hour the moment was scheduled for, the hour it was staged, or the clock when it opens), and why this one read morning. Pull request #8822 adds src/director/day-part.ts for talk lines; the finder says whether the scene's opening line reads it.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one session to find the cause and write it here. When it runs out, write what was read and stop.

**Rules.** No hand-written player text in code: the part of the day is a slot read from the clock, not a word typed into a line. One rule, all 56 places: the check draws its place and names it with its seed. Ask why: the line's hour cites the record it read.

**Done when.** A second session, in the running game on main at 1440x900, plays a drawn place it writes down with its seed until three scenes have opened at three different hours, and each opening line names the part of the day its clock shows. A test in src/director opens scenes at a morning, an afternoon and an evening hour in a drawn place and checks the same.

**Waits on.** Nothing.

**Files.** src/director/purpose-scene.ts, src/director/scene-opening-hour.test.ts (new)

**Notes.** Written by the lead (Fable B), Nov 11, 2026, from a forty-day walk as a council member on main 382123f701.
