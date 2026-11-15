---
id: director-town-hall-question-never-stops-the-player
title: "A town-hall question for a seated member never stops the player: it is scheduled as a journal line"
area: director
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: filed by hand by the meetings and floor builder, Nov 14 2026
checked: meetings and floor builder 2026-11-14
---

**What.** A resident's question at a town hall, put to a member who sits on the body, is scheduled as a journal line and never stops the player's clock, so the member never hears it. The scene composes whole when forced, so the fault is only that it never reaches a stop. It matters because town halls are where residents speak to their member, and the member never sees one. Seen: a seated member at Roy, Montana, held at a town hall question on its day.

**Cause.** Measured: at Roy, Montana (seed meet-a1:1) the question scheduled on 2025-01-27 came out journal-line (run `node --import tsx scripts/dialogue-batch/meetings-seat.ts --seed meet-a1 --places 1 --from 1 --days 30` and read the SCHEDULED, NO STOP block); over 150 days at three drawn places (meet-a1:0 to :2) eight town-hall questions were scheduled and none stopped the player; seven were journal-line, one scene-waiting. Found in code: src/director/scheduling.ts (about line 1115) keeps a moment only when rank <= pace and its impact reaches interruptImpact; a town-hall question ranks below both.

**Fix.** Make the town-hall question a stop for a seated member by giving its circumstance row the impact a question put to the player's own seat carries, read from the situation type's data; keep the one scene engine. Replace its lectern lines (Easy to say from up there) with a small board's wording and make the question the resident's own.

**Time box.** 8 hours.

**Rules.** One engine per mechanic; no new stopgaps; no figures or counts in any scene line; plain American English. Names the place and seed.

**Done when.** A second session seats a member at a drawn place, runs 150 days, and the clock stops for a resident's question at a town hall, with the scene played whole and its ending read by the Journal. Names place and seed.

**Waits on.** Nothing.

**Files.** src/director/scheduling.ts, src/director/data/situation-types.json, src/director/data/circumstances.json, data/english/parts/scene-talk.json

**Notes.** Words lead ruled the replacement lines (#8928 Nov 14 16:28Z). Built locally Nov 14: `stopsDay: true` on the town-hall-question type (the same flag took-office carries) stops the player at Roy, Montana (meet-a1:1): 5 stops in 30 days before, 6 after, the new one the town hall on 2025-01-28. The cause above (rank, impact) was not it: a hall the member hosts is selfNamed and `stopsDay` is the data switch for that.

Built in the stop PR: the two lectern lines ("Easy to say when the room is listening.", "Thanks for letting me ask.") and the unmarked lie replies out (rule 113: five lie pieces removed, "lie" off the town-hall-question replies and moves, the same arc the protest and strike type uses). Not built, left for the meetings engine and the Words lead: the resident's question is still the one they feel most strongly of all policy questions, so a small town's hall can hear a federal wage question the board cannot decide, and "I'd like a date" has no thing it is a date for (rules 115, 116). Filed as the Notes of words-run-town-hall-question-lines-are-composed.
