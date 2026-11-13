---
id: director-dev-and-play-missing-scene-kinds-the-owner-asked-for-part-2-start-movement
title: "A resident can start a movement, not only join one"
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

**What.** A resident in a crowd can found a standing group in the public-action records. The player can join one through the cause-invite scene, but the player cannot start one. Add a scene where a resident or officeholder founds a group around a cause they hold, people with a reason to join do join, and the group and its members are records the public-action engine and the press read. Seen: a scene where you or a resident start a movement, and its members join.

**Cause.** Found in code: `organize` (`src/core2/modules/public-action.ts` line 201) founds a standing group from a crowd, and `playerJoins` (line 334) after `inviteThePlayer` (line 291) is the only way the player meets one. Design: the owner on Nov 8, "can you start a movement?" (docs/coordination/voice-notes/2026-11-08-story-and-night.md).

**Fix.** Add a `start-movement` kind with a purpose and four replies, a founding action that calls the public-action engine's own founding code, and a dev mode recipe. Members join by their records (cause held, ties, time), not by a roll.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the scene's cause is a record an engine already keeps, or a registered stopgap naming the engine that should, and its ending moves something another engine reads. No dice: who joins, who carries and who shows up follow their records and reasons, never a roll. One rule, all 56 places: what an office may do is read from the place's data. This is a game, not a spreadsheet: the owner asked for this scene by name on Nov 8, and it adds no step the player must take.

**Done when.** A second session starts the bench in a drawn place (place and seed written down), plays a resident or officeholder, opens dev mode's scene list and finds the start-movement kind with a way to cause it. It founds a group, answers the scene, and keeps a screenshot. It names the group's record id in the public-action records and the member records that joined, each with the reason on record.

**Waits on.** Nothing.

**Files.** src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/purpose-scene.ts, src/core2/modules/public-action.ts, src/bench/dev-mode.ts
