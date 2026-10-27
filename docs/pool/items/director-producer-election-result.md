---
id: director-producer-election-result
title: "A race's result reaches the player through a candidate they know, so the news-arrives row that waits on election-result fires"
area: director
kind: feature
priority: 1
size: M
status: done
claimed-by: claude/director-producer-election-result
pr: #6366
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T16:17:17.615Z
---

**What.** The scene web counts two rows waiting on the election-result producer: news-arrives, where someone tells the player how a race went, and celebration, a party for the one who won. The election module already writes an election-result record naming every candidate who filed, and no director row reads it for anyone but the player. A candidate the player knows (a relative, a neighbor, a colleague) should tell them how their race went. The player's own win is already celebrated by the race-won scene the night of the count, so the second row is a duplicate of it.

**Rules.** Wire to the world: the scene reads the election module's own election-result record and casts a candidate it names whom the player knows, never a drawn person. Replace, never layer: the celebration cause that would restage the player's own win beside race-won is deleted, not kept waiting. No dice: who tells is scored on tie and sociability.

**Done when.** In a buildBenchWorld drawn place with the seed named, a played year through the player clock in src/director/circumstance.test.ts stages news-arrives from an election-result record id, cast as a candidate the record names whom the player knows, and the scene web report shows two fewer rows waiting on a producer.

**Files.** src/director/data/circumstances.json, src/director/data/situation-types.json, src/director/circumstance.test.ts

**Notes.** TODO
