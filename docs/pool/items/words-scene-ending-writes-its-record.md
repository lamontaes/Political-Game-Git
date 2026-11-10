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

Nov 10, Fable audit: the audit (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 4) read main as of Nov 9 and found that of 99 kinds of scene, ten end keeping nothing, and for 18 what they keep is a favor owed or a promise made that no engine reads (stopgap SG-WORDS-favor-promise-keeps-unread, src/director/data/stopgaps.json:436, still open on Nov 10). Read on Nov 10's main (commit 8ac2262853), by the `keeps` field of purpose-arcs.json only: of 103 kinds, 9 have endings that all keep "none" (race-told, diploma-home, no-diploma-home, filing, door-signature, family-win, family-loss, desk-bill, new-baby) and 17 keep only a promise or nothing (care, hallway, campaign-stop, speech-afterward, door-ask, party-recruit, desk-visit, cause-invite, floor-debate, interview-invite, debate-invite, volunteer-offer, manager-offer, job-offer, rival-word, rival-filed, budget-cut). In the audit's browser play (Blodgett Landing, New Hampshire, ten weeks, no seed kept) seven scenes played and none had a purpose. The director's side, a kind with no read write-back does not play, is director-no-scene-without-a-purpose.
