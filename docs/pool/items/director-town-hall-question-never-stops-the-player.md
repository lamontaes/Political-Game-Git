---
id: director-town-hall-question-never-stops-the-player
title: "A town-hall question for a seated member never stops the player: it is scheduled as a journal line"
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

**Notes.** Needs the Words lead's ruling on the replacement lines first (report-1.md, items 6 to 8).
