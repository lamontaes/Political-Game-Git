---
id: director-bring-it-up-names-signer
title: "A reader of a printed law story names who signed it when the story says so, as well as the outlet and subject"
area: director
kind: feature
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
claimed-at:
source: added with npm run pool -- add
---

**What.** When a person brings up a printed story about a law (`bringItUp` in src/director/bring-it-up.ts, rows with `story: true`), the line now names only the outlet and the topic. Make it also name who signed the law when the story's own wire record says so: follow the story's `wireId` to the `executive-action:<billId>` record (facts `action: signed`, `executiveId`) and pass the signer's name as a `signer` fact to a new variant set in the bring-it-up bank (data/english/parts/bring-it-up.json, mined). A story about a vetoed or unsigned law, or whose record names no signer, uses the existing line. The reader still blames no one; naming the signer is what the story reported.

**Rules.** No hand-written player text: the new sentence is mined and graded in the English engine's bank; if the bank has no graded variant, register a Words-line pool item for mining it and the signer line stays unsaid (not shippable until graded). Ask why: the signer fact cites the executive-action record id. An effect is a read: the line is built from the press and legislature records at the moment it is spoken. One rule, all 56 places: the signer comes from the record, never from a role name in code. Wire to the world: the reader only names a signer they could have read in the story.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a place drawn from all 56 with a seed the builder did not choose, a reader of a printed signed-law story says the signer's name with the signing record id as a source, and a reader of a story without a signer does not, proven in src/director/bring-it-up-law.test.ts with place and seed named and the line held back when no graded variant exists.

**Files.** src/director/bring-it-up.ts, src/director/mined/scene-bank.ts, src/director/data/bring-it-up-rows.json, data/english/parts/bring-it-up.json, src/director/bring-it-up-law.test.ts

**Notes.** Oct 20 (pool feeder): spec written; the story record (`PrintedStory.wireId`, src/core2/press-desk.ts) leads to the executive-action record, and civic-roles.ts already reads its `executiveId`. Ownership call (acting CTO): any builder may build the director-side producer; every word comes from the mined bank.
