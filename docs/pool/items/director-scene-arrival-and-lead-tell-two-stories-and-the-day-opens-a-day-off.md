---
id: director-scene-arrival-and-lead-tell-two-stories-and-the-day-opens-a-day-off
title: "A scene's opening line and its lead contradict each other (the phone rings, then the person has come in person) and every scene opens on a date a day off its own"
area: director
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: director
model: opus
effort: medium
root: none
source: Words lead's read of a played run, Salado TX seed review1:2, class B (/mnt/project-files/words-lead/regression/page-read-salado.md, Nov 15)
claimed-at:
---

**What.** In a played run at Salado, Texas (seed `review1:2`), the opening line and the lead of one scene disagree about where and how it happens, and the opening line names a date a day off the scene's own. Scene P1: "you pick up the phone and it's Karen Rivas", then "Karen ... has come to say so in person." Scenes P6 and P8: "you sit down at home with Anita", then "Anita stands on the doorstep." Scene P24: "out and about, you stop to talk with Craig", then "Today there's a knock at your door." Scenes P19 and P25: a town hall question plays "downtown" the day after the town hall. Scenes P1, P2, P19 and P25 open "First thing on August 25th" and the scene's own date is a day off it. Seen: on the opening line and the lead of every scene a player plays.

**Cause.** Found in code: `src/director/scene.ts` lines 216 to 258 build the opening from `binding.setting.kind` (phone, home, out) through `render({ part: "arrival", kind })`, whose only second choice is whether the person lives with the player (`stage` returns "other" or "alone"). The lead is a separate line chosen from the situation type's own bank (`data/english/parts/scene-talk.json` line 115627: "{name} sent {money} to your campaign and has come to say so in person.") and it states a place the setting never read. So one fact, where and how this scene happens, is held by the setting in one place and by the words of the lead in another. The date is `dayOpening(core.date, opensMinute())` (scene.ts line 222): the day the game is on, not the moment's own day; to confirm in the first hour which of the two is a day off in the Salado run (moment record date against `core.date`).

**Fix.** Make how a scene happens (phone, at home, at the door, out and about) and its date one record read by both the opening and the lead, the way the director's setting is: the lead's words take the arrival from the setting and never assert one of their own, and the opening names the moment's own day. Delete any lead line that says a place the setting does not. Do not add a second field that restates the setting.

**Notes.** Words lead, Nov 15, scenes P27 to P35 of the same run: the concession call and the loss at home both open "First thing on November 3rd... The count is in", which cannot be true on the morning of election day; a town hall question dated October 30 is narrated as October 31st, downtown. So the class is wider than a date a day off: a scene's opening must read the moment's own day and time, and whether its cause still holds on the day it plays.

**Time box.** 6 hours for one Opus session at medium effort.

**Rules.** One engine per mechanic: the director's setting is the one record of where a scene happens. Every screen and scene is a view of the same record. No hand-written player text in code: the words stay in the English engine's banks and the Words lead reads the changed lines.

**Done when.** In a played world at Salado, Texas (seed `review1:2`) the ten scenes P1, P2, P6, P8, P19, P24 and P25 and the three others the Words lead names open on their own date and never name a place or a way of arriving that the lead then contradicts, each scene named by its moment id; a second session replays it in a drawn place and seed nobody chose.

**Waits on.** The Words lead's second read of the changed lines.

**Files.** src/director/scene.ts, src/english/day-words.ts, data/english/parts/scene-talk.json
