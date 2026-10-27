---
id: director-signing-staff-and-press
title: "A signing brings staff and press: the executive-action record stages the signer, the sponsor, the signer's staff and the reporter"
area: director
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
after: director-officeholder-address-scene
blocked-on:
source: split from words-director-watches-officeholders by pool feeder Oct 20
---

**What.** The legislature already writes `executive-action:<billId>` (signed or vetoed, with `executiveId`, `number`, `level`) and the director already reaches the sponsor with a bill-signed moment. Extend that moment so a signing also seats the signer's staff (the officeholder's appointed department heads or clerk from the offices records) and the press reporter the press engine names for the place, using the shared reader from the address part. The signer, sponsor and staff take moves from the existing `bill-signed` type rows in src/director/data/situation-types.json, and the reporter asks. Where the mined bank has no graded sentence for staff or press at a signing, register a Words-line pool item and keep that line out of play.

**Rules.** No hand-written player text: staff and press lines come from the English engine's mined bank. Wire to the world: the staff and reporter are people the records name; nobody is invented. Ask why: each line cites the executive-action record and the bill id. One rule, all 56 places: the form of government and veto power come from the record. Replace, never layer: extend the existing bill-signed moment, do not add a second signing producer.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a place drawn from all 56 with a seed the builder did not choose, an `executive-action` record with action signed produces a moment whose present ids include the sponsor, the signer, at least one staff member and the reporter, each cited by record id, and the scene is held back when a line has no graded sentence; proven in src/director/signing-scene.test.ts beside government-scenes.test.ts, naming place and seed.

**Files.** src/director/civic-roles.ts, src/director/officeholder-records.ts, src/director/data/situation-types.json, src/director/government-scenes.test.ts, src/core2/modules/legislature.ts, src/core2/modules/press.ts

**Notes.** Oct 20 (pool feeder): spec written; civic-roles.ts already names the executive who signed from the act record. Part 2 of 3 for words-director-watches-officeholders.
