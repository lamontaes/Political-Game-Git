---
id: words-staff-news-bill-lost
title: "When a bill fails, the sponsor's aide brings the news in a scene"
area: words
kind: wiring
priority: 1
size: S
status: claimed
claimed-by: words/staff-news-bill-lost
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T17:25:06.641Z
---

**What.** The staff-news scene, where an aide comes in and closes the door with bad news, waits on a press record that needs a bribe and a tip, so it never fires. A bill that loses its vote is the bad news most sponsors actually get, but the legislature writes nothing about the loss except the roll call, which doesn't say the bill failed or who sponsored it. This item has the legislature record a bill's failure (held in committee or voted down on the floor) for the sponsor, the director size it, and the staff-news scene fire from it with one of the sponsor's own aides as the one bringing the news. The talk names the bill from the record and uses lines about a lost vote, which outrank the lines about a news story exactly when the bill-lost fact is present.

**Rules.** Wire to the world: the scene fires from the legislature's own failure record, read by the director, and the aide is a staffer the official really hired. Ask why: the scene names its cause record, and the bill it speaks of comes from that record. One rule, all 56 places: the test draws places from all 56 until one has a sponsor with staff whose bill failed.

**Done when.** src/director/staff-news-scene.test.ts in the played world (buildBenchWorld), on places drawn from all 56 with a seed nobody chose, watches the town's officials and shows each bill-failed record for a watched sponsor with staff firing the sponsor's staff-news scene, with one of their serving staff as the aide, composed in the lines that play with a statement that the vote was lost on the record's bill, and citing the record id.

**Files.** src/core2/modules/legislature.ts, src/director/data/director.json, src/director/data/situation-types.json, src/director/purpose-scene.ts, data/english/parts/scene-talk.json, src/director/staff-news-scene.test.ts

**Notes.** Builds on the branch of words-office-hours-scene (#5955), which carries the staff cast fill from words-desk-bill-scene (#5953); the PR carries that chain until it merges.
