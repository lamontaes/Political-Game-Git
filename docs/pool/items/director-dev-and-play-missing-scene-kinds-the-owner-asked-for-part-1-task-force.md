---
id: director-dev-and-play-missing-scene-kinds-the-owner-asked-for-part-1-task-force
title: "A mayor or governor can form a task force, and its report is read afterward"
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
effort: high
root: rc7-player-cannot-drive
source: split from director-dev-and-play-missing-scene-kinds-the-owner-asked-for in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** A study committee or task force is a row in the body engine, formed when a body cannot settle a bill, and nothing stages it or forms one by an executive's order. Add a task-force scene: an executive or a body forms it, the cast is the members the world gives, the player answers with four replies, and the report it files is read by the next bill's positions and by the press. The executive's order that forms one belongs to the body engine (Legislation); until it exists the scene uses the study-referral record and a registered stopgap names the missing order. Seen: a mayor or governor forms a task force in a scene, and its report shows up in the next bill and the paper.

**Cause.** Found in code: `referToStudy` (`src/core2/modules/legislature.ts` line 4940) writes the committee row; its only reader is `studiesOf` in `src/bench/study-committees.test.ts`. Design: the Nov 8 to 9 task-force call in docs/coordination/OWNER-DECISIONS.md ("a record in the one body engine... Story writes the scenes on top").

**Fix.** Add a `task-force` kind to `src/director/data/situation-types.json` with a purpose in `src/director/data/purpose-arcs.json`, a recipe in dev mode that calls the game's own study-referral code, and a reader of the report in the bill positions and the press. Register a stopgap for the executive's order.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the scene's cause is a record an engine already keeps, or a registered stopgap naming the engine that should, and its ending moves something another engine reads. No dice: who joins, who carries and who shows up follow their records and reasons, never a roll. One rule, all 56 places: what an office may do is read from the place's data. This is a game, not a spreadsheet: the owner asked for this scene by name on Nov 8, and it adds no step the player must take.

**Done when.** A second session starts the bench in a drawn place (place and seed written down), takes the mayor's or governor's seat with Advanced, Play as, and finds the task-force kind in dev mode's scene list with a way to cause it. It forms one, answers the scene, and keeps a screenshot. It names the cause record id, how each member was cast, the report record the ending wrote, and the later record that shows the next bill's positions or the press read that report.

**Waits on.** Nothing.

**Files.** src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/purpose-scene.ts, src/core2/modules/legislature.ts, src/bench/dev-mode.ts, src/bench/study-committees.test.ts
