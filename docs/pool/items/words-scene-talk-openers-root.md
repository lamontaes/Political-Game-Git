---
id: words-scene-talk-openers-root
title: "Talk openings need a long-ago record: no opener without one, and a yes or no is always followed up"
area: words
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: split from words-scene-talk (L) by the claiming session, Oct 19
claimed-at:
---

**What.** Fix the root of talk openings so that no opener claims anything about the past without a record behind it. A talk with no such record opens without a claim about the past, and the opener cites the record that earns it. Whenever a person answers yes or no, the conversation follows up on it instead of ending, using banked pieces only.

**Rules.** No hand-written player text: every opener and reply is composed by the English engine from banked pieces in data/english/parts/. Ask why: each opener cites the record that earns it, and a talk with no record opens without a claim about the past. No dice: who says yes or no follows traits, relationships and the stakes, never a roll.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a test beside src/director/conversation.test.ts opens fifteen talks and shows every opener citing a record id from at least a day back, or making no claim about the past, and every yes or no followed up, naming the scene and record ids.

**Files.** src/director/conversation.ts, src/director/scene.ts, data/english/parts/, src/director/conversation.test.ts

**Notes.** Remainder of words-scene-talk after pull request 4459 (catalog of 14 types, purpose arcs, the 250-piece scene-talk bank). Build on branch words/scene-talk once it is merged.
