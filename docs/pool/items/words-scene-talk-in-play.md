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

**What.** Purpose scenes do not yet play in the game. A fired situation with a purpose should play as a tree the player answers: the other person says what they want, the player picks a reply from controls, and the talk moves to a result. Connect the purpose arcs and the scene-talk bank to the scene the director stages, so the bench shows the player's choices and the result is recorded.

**Rules.** No hand-written player text: every line comes from the English engine and every control from the control data, never from a screen. The chain is the acceptance: one scene is followed from the cause record through the player's reply to the view or choice it moved and the journal line.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a fired situation with a purpose plays as a tree the player answers, with the replies from controls and the result recorded by scene and record id, and a test in src/bench proves the replies resolve through the engine.

**Files.** src/director/scene.ts, src/director/conversation.ts, src/bench/play.mjs, data/english/parts/

**Notes.** Written from the title and the evidence on the item when the quality gate was repaired (Oct 16).
