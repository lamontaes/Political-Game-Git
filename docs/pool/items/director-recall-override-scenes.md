---
id: director-recall-override-scenes
title: "The press and the director read recall results and veto override votes"
area: director
kind: wiring
priority: 3
size: S
status: done
claimed-by: claude/recall-override-scenes
pr: #4817
blocked-on:
source: "split from gov-recalls-and-overrides-write-outcomes"
claimed-at: 2026-10-16T20:15:52.108Z
---

**What.** A recall result (`recall-outcome`) and a vote to override a veto (`veto-override`) are now public events with ids and counts, but only the recall petition and the executive's action have a director situation and a press topic. Add the situation types and the press topics for the two new kinds, with their words from the English engine, so a town hears that a petition fell short, that a member was removed or kept, and that a veto was overridden. The player would notice these in the news and in a neighbor's talk.

**Rules.** An effect is a read: the director and the press read the event by id. No hand-written player text: the lines come from the English engine. One rule, all 56 places. No dice.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): a veto-override or recall-outcome event id appears in a press story or a director moment for a named person, and a test beside src/director/government-scenes.test.ts covers both kinds.

**Files.** src/director/data/situation-types.json, src/core2/press-topics.ts

**Notes.** The director data and words belong to the Words and director line.
