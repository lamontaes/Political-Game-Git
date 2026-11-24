---
id: director-adult-pace-of-four-silences-office-duty-scenes
title: "An adult life carries four scenes a year, and the cap silences scenes that belong to the player's own office"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words-engine
model: opus
effort: medium
root: none
source: Account lead stopgap disposal, Nov 14 (a builder found it playing a mayor with a bill on the desk)
claimed-at:
---

**What.** A moment becomes a scene only if it ranks within the life's pace over the trailing 365 days, and an adult's pace is 4. A sitting mayor or member whose own bills, votes and desk acts are the year's biggest moments finds their sponsor's visit about a bill on their own desk silenced by the cap, because the rank is spent on other moments. The cap is a number with no row of its own and no spread note. Seen: the sponsor's visit and the desk scene play the day the bill reaches the player's desk.

**Cause.** Found in code: `src/director/data/situation-types.json` `scheduling.paces` (early-childhood 1, middle-childhood 2, adolescence 3, adult 4) read by `paceOf` in `src/director/scheduling.ts` (line 314) and applied by `paceRank` over `trailingDays` 365. Records that already bypass it are listed in `householdScenes`, `householdRecordScenes`, `ownRecordScenes` and `metWhereYouAre` in the same file; office duty (a bill on the player's desk, a vote the player must cast) is in none of them. No stopgap row covers the number.

**Fix.** Do not raise the number. Add the player's office duty (the stage view's desk, floor and committee records that name the player) to the existing `ownRecordScenes` list, which already bypasses the pace, and give `paces` a TUNABLE tag with its check range and spread. The thread "Write the mayor's and governor's desk" is designing the office-duty rule; build on its list, do not make a second one. The player sees the sponsor's visit and the desk scene the day the bill reaches the desk.

**Time box.** 3 hours for one Opus session at medium effort; stop and report if the desk thread's rule is not yet in.

**Rules.** An effect is a read, not a record: the pace list is read by the one scheduler when it ranks a moment. No dice: the list of office-duty records decides, never a chance. One rule, all 56 places: no place is named in the list.

**Done when.** In a played world where the player holds a mayor's or member's seat, a bill that reaches the player's desk or floor plays its scene though four other moments already outrank it, shown by the bill's record id and the scene's cause id; a second session replays it in a place and seed nobody chose.

**Waits on.** The thread "Write the mayor's and governor's desk" (its office-duty rule).

**Files.** src/director/data/situation-types.json, src/director/scheduling.ts, src/director/director.test.ts
