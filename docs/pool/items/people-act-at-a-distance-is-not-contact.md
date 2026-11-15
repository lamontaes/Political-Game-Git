---
id: people-act-at-a-distance-is-not-contact
title: "A veto or a whip's answer moves a tie without the two meeting, but the greeting the next day says \"I saw you yesterday\""
area: people
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: none
lead: effects
source: desk thread, played file for desk item 5 (Nov 15, 2026)
---

**What.** An act that changes how two people feel about each other without them meeting (a mayor's or governor's veto of a member's bill, a member's answer to the whip, a reply about a veto) is written through the one relationship writer, which also stamps the tie's last contact as today. The next day the sponsor greets the mayor with "You again. I saw you yesterday." though the two never met. Played at sha 8ee50dd0 in Havre, Montana (3035050) and Elk River, Idaho (1625120), seed 4276344481a2b078e70633cfee47d0caccb65f74:2 and :4: all six talks the day after a veto opened on a seen-you-yesterday line (/mnt/project-files/words-lead/desk/veto-talk-played-8ee50dd0.md).
Seen: the sponsor's greeting the day after a veto.

**Cause.** Found in code: the `relationship` writer in src/core2/state.ts (line 1153) sets `row.lastContactDate = at` for every change, whatever its reason; `lastContact` in src/director/relation-facts.ts (line 32) reads that date as the last time the two were together, and the greeting's seen-recently lines read it. `decideDesk` in src/core2/modules/office-day.ts and the whip answer in src/core2/office-day-federal.ts (line 505) write their steps through it.

**Fix.** Give the relationship writer's reason a way to say the change happened apart (no meeting): the level moves by the hours given, faded as now, and the date the two were last together stays what it was, kept beside the level so the fade is computed once (the level is re-based to today, the last-together date is not). `decideDesk`, the whip answer and `answerVeto` (src/director/veto-talk.ts) pass it. No new table and no second writer.

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic: the one relationship writer, not a second tie store. No dice. Speed: no scan of ties; the change is on the one row written.

**Done when.** A second session in a drawn place with a mayor who has a veto (dev mode's bill controls) vetoes a council member's bill, advances a day and opens a talk with the sponsor: the greeting does not say they met yesterday, and the tie's closeness still shows the veto's step. The whip answer does the same for a member of Congress.

**Waits on.** Nothing.

**Files.** src/core2/state.ts, src/core2/closeness.ts, src/core2/modules/office-day.ts, src/core2/office-day-federal.ts, src/director/veto-talk.ts, src/director/relation-facts.ts

**Notes.** Found by the desk thread's played file for item 5 (the veto said at the next talk), branch claude/project-thread-hkqdh2-veto-remembered.
