---
id: words-director-watches-officeholders
title: "An officeholder's records fire scenes: an address is a speech scene, a signing brings staff and press, and some endings open a game screen"
area: people
kind: feature
priority: 2
size: L
status: blocked
claimed-by: claude/political-game-pool-yucp92-bb
pr: #5180
blocked-on:
after: director-officeholder-address-scene, director-signing-staff-and-press, director-term-ending-scene
source: added with npm run pool -- add
claimed-at: 2026-10-20T02:31:57.448Z
---

**What.** This is the roll-up for three parts that make the director watch an officeholder's own records and stage what they show: an address given (the office-day `state-of-the-city` act and the speech engine's `speech.heard` record) becomes a speech scene with its audience; a signing (the legislature's `executive-action:<billId>` record) brings the sponsor, the signer's staff and the press to the room; and a term ending (the offices engine's `TermRow` end date, `seat-vacated` and `inauguration` records) becomes a farewell or handover scene, and for the player's own seat opens the existing campaign or filing screen. Nothing is built here beyond the parts; this item is done when all three are done.

**Rules.** Wire to the world: each part reads a record another engine wrote and moves a person's scene, not a new log. No hand-written player text: every word comes from the English engine's mined bank; a situation the bank has no graded sentence for is registered as a Words-line pool item and stays out of play until graded. Replace, never layer: the parts share one officeholder-record reader in src/director and add no parallel log. The chain is the acceptance: one signing is followed from the bill record to the scene line.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose, an address, a signing and a term ending each stage a scene citing their record ids, shown by the three parts' tests (src/director/officeholder-address-scene.test.ts, signing-scene.test.ts and term-ending-scene.test.ts); this roll-up needs no code of its own.

**Files.** src/director/government-scenes.test.ts, src/director/civic-roles.ts, src/director/data/situation-types.json

**Notes.** Oct 20 (pool feeder): spec written; split into three M parts because it touches the speech, legislature and offices records and the screen opener. Ownership call (acting CTO): any builder may build the director-side producer; every word still comes from the English engine's mined bank (src/director/mined, data/english); where the bank has no graded sentence, register a Words-line item for mining it and keep the scene out of play until graded.
