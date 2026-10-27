---
id: words-scene-ending-writes-its-record
title: "A scene's ending writes the record it names, not only a label"
area: words
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
lead: words
source: added with npm run pool -- add
---

**What.** Every purpose arc's endings carry keeps (for example favor-owed, trust-lost, bribe-taken), but src/director/scene-talk.ts only reads keeps into the ending's label; the only record a scene writes in play is scene.reply (purpose-scene.ts replyInScene). So a scene's outcome is not yet a read for any other engine. Found Oct 27 by Helper E building bribe-offer.

**Rules.** No consequence, no scene (scene-standard rule 1). An effect is a read, not a record: the writer calls an existing engine writer (relationship, promise, crime row) and never invents a parallel table. No dice.

**Done when.** In a drawn place and seed, finishing a scene of each of the arc's ending kinds writes one record by id (a promise or owed favor on the relationship, a trust change, a crime row state), a different engine reads it on a later day (named by record id), the journal gets a dated line from it, and a test fails when an ending writes nothing. The ending kinds without an existing writer are listed as SMART items with their lead.

**Files.** src/director/scene-talk.ts, src/director/purpose-scene.ts, src/director/data/purpose-arcs.json

**Notes.** Filed by Helper E. lead: words. Blocks the claim that any scene in play writes its outcome.
