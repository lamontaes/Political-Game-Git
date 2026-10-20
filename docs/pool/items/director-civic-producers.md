---
id: director-civic-producers
title: "The civic situation types fire from the records that already exist: sign or veto, hearing, filing, recall, scandal, layoff, eviction, election result"
area: director
kind: wiring
priority: 1
size: M
status: blocked
claimed-by: claude/director-civic-producers
pr:
blocked-on:
after: director-civic-producers-government,director-civic-producers-government-rest
source: "director-reach, PR #4508"
claimed-at: 2026-10-19T18:01:34.276Z
---

**What.** This is the roll-up for the director's civic situation types that were waiting on a producer: election.result (race-won, race-lost), legislature.sign-or-veto, legislature.hold-hearing, legislative-vote, candidate-filed, recall-petition, press.exposed, work.job-lost, housing.eviction, law.effect-learned, economy.board-appointment and office.approached. The ledger (src/director/ledger.ts) writes a moment for the person each record reaches and the awaitingProducer mark is dropped from each type in src/director/data/situation-types.json. The parts are director-civic-roles, -electoral, -filing-stop, -household and -government-last (done), and -government and -government-rest (in review). When those land this item is closed by the reach report showing each type fired in one played year.

**Rules.** No dice: a scene fires from a recorded cause, never a roll, and a quiet day fires nothing. The chain is the acceptance: each fired scene is traced from its cause record to the scene to the journal line. Speed: the ledger acts on the day a record is written, never by scanning the world each day. One rule, all 56 places: a drawn place and a seed the builder did not choose.

**Done when.** In a one-year run of the played world (`buildBenchWorld`) in a drawn place and a seed the builder did not choose (both named in the PR body), the reach report (scripts/dialogue-batch/scene-year.ts, src/director/reach.ts) shows each of these types fired from its cause record by record id, or names a real reason it could not in that place and year, and src/director/director.test.ts and src/director/scene.test.ts pass. The year runs within the speed rule. The owner plays it: he signs a bill and the signing scene opens.

**Files.** src/director/ledger.ts, src/director/scheduling.ts, src/director/data/situation-types.json, src/director/reach.ts, src/director/director.test.ts

**Notes.** Size L in practice (found while claiming it): the civic types also need their roles filled from records, so it is split into director-civic-roles, director-civic-producers-electoral, director-civic-producers-government and director-civic-producers-household. This item is done when those four are.

Original note: Found by the reach report in director-reach (PR #4508): in a played year of Rarity Bay, Tennessee, no type fired from the household's year except the reunion kind, and forty types said why not.

Sent back 2026-10-16 from PR #4600 (branch claude/director-civic-producers-government): Merging current main into claude/director-civic-producers-government conflicts in docs/pool/items/director-civic-producers-government-rest.md, src/director/civic-roles.ts, src/director/data/director.json. Resolve and push these conflicts on this branch before local checks can run; finish on that branch, merge main into it first.

Sent back 2026-10-17 from PR #4600 (branch claude/director-civic-producers-government): Morning check: the new src/director/government-scenes.test.ts returns successfully when no full-person seat exists and again when the bill was not voted. Both paths bypass every floor-vote/signing/veto assertion. Draw an eligible generated-world case with bounded retries and fail if none reaches the case, then preserve the scene and role assertions. A logged reason followed by return is still a skipped acceptance test.; finish on that branch, merge main into it first.

Sent back 2026-10-17 from PR #4606 (branch claude/director-civic-producers-government-rest): Morning check: new press-scenes.test.ts returns successfully when no outlet or seated resident exists, bypassing all published-interview and role assertions. The stacked government-scenes.test.ts likewise returns before assertions when there is no full-person seat or no vote. Draw an eligible case with bounded retries and fail when the case cannot be reached. Also record Government-area agreement for the recalls.ts event changes, or split that edit into its owning-area PR.; finish on that branch, merge main into it first.

Oct 20 (pool feeder): spec written; the old blocked-on named the two parts still in review; the others are done, so this is the roll-up and closes with the reach report on main.
