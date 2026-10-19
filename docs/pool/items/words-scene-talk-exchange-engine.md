---
id: words-scene-talk-exchange-engine
title: "The exchange engine runs a purpose scene to a result: a person wants something, the stakes, an exchange"
area: words
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
after: words-scene-talk-openers-root
source: split from words-scene-talk (L) by the claiming session, Oct 19
claimed-at:
---

**What.** Build the exchange engine for purpose scenes: one person wants something, the stakes are stated from the records, and the exchange runs turn by turn to a result of granted, refused or put off. The result is recorded as an event the other engines can read, such as a promise kept or a favor owed. Each turn's words come from the scene-talk bank through the English engine.

**Rules.** No hand-written player text: every opener and reply is composed by the English engine from banked pieces in data/english/parts/. Ask why: each opener cites the record that earns it, and a talk with no record opens without a claim about the past. No dice: who says yes or no follows traits, relationships and the stakes, never a roll.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a fifteen-talk test beside src/director/conversation.test.ts runs fifteen purpose scenes to a result, each result written as a record that another engine reads, with the scene and record ids named.

**Files.** src/director/conversation.ts, src/director/scene-talk.ts, data/english/parts/scene-talk.json, src/director/conversation.test.ts

**Notes.** Remainder of words-scene-talk after pull request 4459 (catalog of 14 types, purpose arcs, the 250-piece scene-talk bank). Build on branch words/scene-talk once it is merged.
