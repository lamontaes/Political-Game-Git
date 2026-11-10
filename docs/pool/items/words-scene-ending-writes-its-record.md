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
blocked-on: words-scene-ending-writes-its-record-part-1-favor-and-promise, words-scene-ending-writes-its-record-part-2-trust-and-crime, words-scene-ending-writes-its-record-part-3-keep-nothing-kinds, words-scene-ending-writes-its-record-part-4-guard
lead: words
source: added with npm run pool -- add
after:
standard: 2
model: opus
effort: high
root: design-story-director
---

**What.** Every purpose arc's endings carry keeps (for example favor-owed, trust-lost, bribe-taken), but src/director/scene-talk.ts only reads keeps into the ending's label; the only record a scene writes in play is scene.reply (purpose-scene.ts replyInScene). So a scene's outcome is not yet a read for any other engine. Found Oct 27 by Helper E building bribe-offer.

**Cause.** Found in code: src/director/scene-talk.ts reads an ending's `keeps` (line 56 and the use near line 689) only into the ending's label, and the one record a scene writes in play is scene.reply (replyInScene, src/director/purpose-scene.ts, line 1700); the endings in src/director/data/purpose-arcs.json carry keeps (counted in the file: "none" 266 times, "promise" 79, "relationship-strained" 61, "trust-lost" 16, "favor-owed" 16, plus the bribe kinds) that no other engine reads, which is stopgap SG-WORDS-favor-promise-keeps-unread (src/director/data/stopgaps.json, line 436, open). Of 103 kinds, 9 have endings that all keep "none" (race-told, diploma-home, no-diploma-home, filing, door-signature, family-win, family-loss, desk-bill, new-baby) and 17 keep only a promise or nothing (Nov 10, read by the keeps field of purpose-arcs.json).

**Fix.** Make each ending kind call the existing engine writer (the legislature's keepReply and obligationsOf for a favor owed, the campaigns engine's promises, the relationship record, the trust change, the crime row) so a different engine reads it on a later day, list the kinds that have no writer as items, and add a test that fails when an ending writes nothing and is not listed. Four parts, each its own item.

**Time box.** 12 hours for one Opus session across the parts; each part has its own box. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No consequence, no scene (scene-standard rule 1). An effect is a read, not a record: the writer calls an existing engine writer (relationship, promise, crime row) and never invents a parallel table. No dice. Replace, never layer: the stopgap is deleted when its parts land.

**Done when.** A second session, not the builder, plays a year in a drawn place (buildBenchWorld, place and seed named), finishes a scene of each of the arc's ending kinds, and finds one record by id for each (a promise or owed favor on the relationship, a trust change, a crime row state), a different engine reading it on a later day (named by record id), a dated journal line from it, and a test that fails when an ending writes nothing and is not listed. The ending kinds without an existing writer are listed as SMART items with their lead.

**Waits on.** The four parts (blocked-on). The director side, that a kind with no read write-back does not play, is director-no-scene-without-a-purpose.

**Files.** src/director/scene-talk.ts, src/director/purpose-scene.ts, src/director/data/purpose-arcs.json, src/director/data/stopgaps.json

**Notes.** Filed by Helper E. lead: words. Blocks the claim that any scene in play writes its outcome.

Nov 10, Fable audit: the audit (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 4) read main as of Nov 9 and found that of 99 kinds of scene, ten end keeping nothing, and for 18 what they keep is a favor owed or a promise made that no engine reads (stopgap SG-WORDS-favor-promise-keeps-unread, src/director/data/stopgaps.json:436, still open on Nov 10). Read on Nov 10's main (commit 8ac2262853), by the `keeps` field of purpose-arcs.json only: of 103 kinds, 9 have endings that all keep "none" (race-told, diploma-home, no-diploma-home, filing, door-signature, family-win, family-loss, desk-bill, new-baby) and 17 keep only a promise or nothing (care, hallway, campaign-stop, speech-afterward, door-ask, party-recruit, desk-visit, cause-invite, floor-debate, interview-invite, debate-invite, volunteer-offer, manager-offer, job-offer, rival-word, rival-filed, budget-cut). In the audit's browser play (Blodgett Landing, New Hampshire, ten weeks, no seed kept) seven scenes played and none had a purpose. The director's side, a kind with no read write-back does not play, is director-no-scene-without-a-purpose.
