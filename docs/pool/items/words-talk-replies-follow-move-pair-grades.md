---
id: words-talk-replies-follow-move-pair-grades
title: "The owner's move-pair grades decide which replies an everyday talk offers first"
area: words
kind: wiring
priority: 2
size: S
status: claimed
claimed-by: lane3/talk-one-engine
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T16:38:30.597Z
---

**What.** Split from words-everyday-talk-one-engine (its calibration line). The calibration table's move-pair grades (movePairs, 'ask>react') reached only composed speeches: the scene and talk word makers pick wordings of one move at a time, so a pair grade could not change their pick. In everyday talk the four replies offered (rankChoices in src/director/conversation.ts) are cut from a larger pool, and which reach the player was set by the reply-reach lean alone.

**Rules.** Calibration is one (owner, Oct 29). No dice: the grade orders what the player is offered, never what a person decides. Ungraded, the order is unchanged.

**Done when.** In a played world (buildBenchWorld) in two drawn places with the seed printed, grading the first offered reply's move-pair unnatural after the other person's last line moves a reply of another move ahead of it, in talks the player opens over 30 days.

**Files.** src/director/conversation.ts, src/director/talk-move-pairs.test.ts

**Notes.** Lane 3, Nov 4: built on lane3/talk-one-engine.
