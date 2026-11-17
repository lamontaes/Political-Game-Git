---
id: words-conflict-accuse-rewritten-with-inserts
title: "An accusation names what the complaint is over, and a denial of a bribe the player took is a lie the record catches"
area: words
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by:
pr: 9972
after:
blocked-on:
root: rc4-hand-written-words
lead: words
model: sonnet
effort: medium
source: owner, Nov 14, on the lines the world does not place, and Nov 16, "No. Count them again and rewrite them with inserts", "either that or remove them and start fresh"
---

**What.** The accusation (`accusation` in situation-types.json, purpose `conflict-accuse`) held 182 uses; 124 of them, the paper's story with no outlet and all three of `.friend`, `.hearsay` and `.taken`, said the shape of the record in general words ("Someone who knew told me about it") with no slot and no fact. The scene now says what the complaint is over, who told the accuser, and the paper that printed it, and a denial placed by the taken row is a lie the accuser's record catches.
Seen: a player who took a bribe is told on by colleagues, the justice engine writes a complaint naming them, and each accuser opens on the payment on the bill, with the denial caught or the confession offered.

**Cause.** Found in code: `excusedAs` in tests/guards/english/line-inserts.test.ts counts a line as placed when its use names any fact, and 124 of the 182 `conflict-accuse` uses in data/english/parts/scene-talk.json carried no `requiresFacts`, `excludesFacts` or `onlyWhen`; and `composeBinding` in src/director/purpose-scene.ts set no fact from the corruption engine's crime row a `justice.accused` or a printed story names, so no line could say the bill, what the complaint is over, whether the money was taken or who told the accuser, and a denial was never a lie the record caught.

**Fix.** Delete the 124 uses placed by nothing (the base's paper-story lines and `.friend`, `.hearsay`, `.taken`; the `.witness` variant is not named by the spec and keeps its lines). Add `accusationReads` in src/director/accusation-facts.ts, called beside the bribe block of `composeBinding`: `took-it`, `complaint-of`, `wanted`, `contract`, `source` (the corruption engine's `crime.told`), `knows-truth` and `in-chamber`. A reply whose line sets `lied` is a lie (scene-talk.ts), so a denial placed by `took-it` plays the engine's believed-or-caught branches. The bribe's reads and these unite in one file when #9953 lands.

**Time box.** 5 hours, Sonnet at medium effort.

**Rules.** No hand-written player text. No figure in talk. Wire to the world: each fact is read from the crime row, the complaint, the telling or the chamber's members, so a line plays only where its record holds.

**Done when.** In a drawn place (Town, State, seed nobody chose), a second session seats the player on a body with a bill before it, takes a bribe through the offer scene, has colleagues told, and finds each accuser's talk say the payment on the bill, the denial caught with the teller's name, the confession offered only on the taken row, and no thank after a refusal. A player whose offer was refused is never offered the confession.

**Waits on.** The recount of the line-inserts count (#9757) before the count can fall.

**Files.** data/english/parts/scene-talk.json, src/director/accusation-facts.ts, src/director/purpose-scene.ts, src/director/scene-talk.ts, src/director/data/arc-variants.json, src/core2/modules/justice.ts, src/director/accusation-reads.test.ts, scripts/words/accusation-walk.ts

**Notes.**

- 2026-11-17 (Story lead): drafted with a Sonnet writer. See the pull request for the counts, the played talks and the lines for the lead to sign.
- The `firm` read (a bid-list firm the player owns, from the contract award's bids and the business owner row) was left out: no drawn place held an award with a player-owned bid, so it was never seen, and the base bid-list lines that needed it came out. The base arc keeps its older lines.
- The printed-story scene (`bribe-reported`) was not reached: a leak to the town paper did not print within 40 days in the drawn places, so its eight new outlet lines are kept unseen so those spots are not bare.
- The `.witness` variant (the accuser was offered the bribe) is not named by the spec; its 38 lines are placed by nothing and stay until the lead rules.
- The two pairs sheets wait for fresh reviewers, so `tests/guards/english/line-rules.test.ts` reports two rules waiting until the verdicts are folded.
