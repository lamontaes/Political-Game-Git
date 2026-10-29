---
id: words-scene-town-hall-question
title: "Scene: a resident's question at a town hall, and the answer they got"
area: words
kind: feature
priority: 2
size: M
status: done
claimed-by:
pr: #6299
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Scenes-from-life episode 2 (docs/design/scenes/from-life/town-hall-goes-wrong.md, from the August 2009 Lebanon, Pennsylvania town hall). A town-hall record fires the office-hours scene, whose lines are about a lost job or an eviction and say nothing of the question the resident asked or the answer the host gave. This moves the town-hall cause to its own situation type with lines read from the townHalls row.

**Rules.** No dice. scene-standard. Replace, never layer: the town-hall cause leaves office-hours in the same change. No real name or quoted line in any player-facing file.

**Done when.** In a played year in a drawn place and seed the builder did not choose, a host's town-hall record fires town-hall-question for a resident who asked, naming the town hall id and the resident's question; the lines say the issue the resident asked about and whether the host's answer agreed, opposed or was not given; a test fails when the townHalls row is absent; the cause is gone from office-hours; two other lives are named as covered by the same producer.

**Files.** src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/purpose-scene.ts, data/english/parts/scene-talk.json, scripts/english-corpus/scene-talk-pieces.py

**Notes.** Filed by Helper E. lead: words. Time box 4 h.
Sent back 2026-10-27 from PR #6239 (branch helper-e/town-hall-pushback): four conflicts with main after #6136 (scene-talk.json, purpose-arcs.json, director.test.ts, purpose-scene.ts); finish on that branch, merge main into it first.
