---
id: words-scene-talk-in-play
title: "Purpose scenes play in the game: a fired situation with a purpose plays as a tree the player answers"
area: words
kind: wiring
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
after: words-scene-talk
source: added with npm run pool -- add
claimed-at:
---

**What.** Purpose scenes do not yet play in the game. When the director stages a scene (`composeScene` in src/director/scene.ts, whose `talkToId` names who opens it) for a situation with a purpose, the scene should hand over to the exchange engine that words-scene-talk builds (src/director/scene-talk.ts, on that item's branch): the other person says what they want, the player picks a reply from the control rows (never typed), and the talk moves to a result. Connect the purpose arcs and the scene-talk bank to `conversation.ts` so a talk started from a staged scene runs the exchange, then show it in the bench play loop (src/bench/play.mjs) with the replies as controls, and record the result as an event the journal and the other person's views read. Today scene.ts and conversation.ts hold no purpose field, so the first step is to read the purpose from the situation type's row once words-scene-talk lands.

**Rules.** No hand-written player text: every line comes from the English engine and every control from the control data, never from a screen. The chain is the acceptance: one scene is followed from the cause record through the player's reply to the view or choice it moved and the journal line. An effect is a read, not a record: the result must be read by the views engine or the journal when it decides. Ask why: each opener and result cites the record that earns it. One rule, all 56 places: purposes come from situation-type rows, not named places.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a fired situation with a purpose plays as a tree the player answers, with the replies from controls and the result recorded by scene and record id, and a test in src/bench proves the replies resolve through the engine.

**Files.** src/director/scene.ts, src/director/conversation.ts, src/bench/play.mjs, data/english/parts/

**Notes.** Written from the title and the evidence on the item when the quality gate was repaired (Oct 16).
Oct 20 (pool feeder): spec written; the build gate is `after: words-scene-talk` alone (PR in flight), and src/director has no scene-talk.ts yet, so the builder starts when that item is done.
