---
id: director-dev-and-play-missing-scene-kinds-the-owner-asked-for-part-3-hard-meeting
title: "A mayor can sit down with a department head who disagrees"
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
effort: medium
root: rc7-player-cannot-drive
source: split from director-dev-and-play-missing-scene-kinds-the-owner-asked-for in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Meetings come from bills and budgets only. There is no secretary or department head the player can call in, and no scene for a meeting where the other person disagrees. Add a hard-meeting scene for an executive and a department head, a secretary or a legislator who disagrees, whose result moves the bill or budget line it was about. Seen: a meeting where a department head or secretary disagrees with the mayor, and the budget line or bill moves.

**Cause.** Found in code: `scheduleWeek` (`src/core2/modules/meetings.ts` line 238) and `standUpDrive` (line 347) keep meetings from bills and budgets only; the rulings check (docs/reports/rulings-check-2026-11-08.md) marks a contentious meeting "partly" built. Design: the owner on Nov 8, "Having a contentious meeting with a secretary or a legislator or an executive".

**Fix.** Add a `hard-meeting` kind whose cast comes from the offices engine (the executive and the person who disagrees, by their stance records), four replies, and an ending that changes the bill's or budget line's record the meetings engine holds. Add a dev mode recipe.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the scene's cause is a record an engine already keeps, or a registered stopgap naming the engine that should, and its ending moves something another engine reads. No dice: who joins, who carries and who shows up follow their records and reasons, never a roll. One rule, all 56 places: what an office may do is read from the place's data. This is a game, not a spreadsheet: the owner asked for this scene by name on Nov 8, and it adds no step the player must take.

**Done when.** A second session starts the bench in a drawn place (place and seed written down), takes a mayor's or governor's seat with Advanced, Play as, opens dev mode's scene list, finds the hard-meeting kind, causes it and answers it with a screenshot. It names the cause record id, the person who disagreed with the stance record that made them disagree, and the later record that shows the bill or budget line the meeting was about moved.

**Waits on.** Nothing.

**Files.** src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/purpose-scene.ts, src/core2/modules/meetings.ts, src/bench/dev-mode.ts
