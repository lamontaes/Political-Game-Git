---
id: elections-party-asks-next-member-after-player-declines
title: "When the player says no to a party's ask to run, the party asks its next member for the seat"
area: elections
kind: stopgap
priority: 3
size: S
status: in-pr
claimed-by:
pr: 9174
after:
blocked-on:
source: stand-in triage Nov 10 2026 (docs/stopgaps/triage-2026-11-10/p15.md)
lead: governing
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** The party's chair asks its members to run for an open seat on the day filing opens. When the member asked is the player, the party stops asking at once and waits for the scene's answer. If the player says no or not now, nothing returns the party to its list, so the seat goes unasked while filing is still open. Make the candidacy engine read the player's no or not-now reply and ask the party's next member for the seat, in the same order the party already uses. Closes SG-P15-party-ask-after-player. Seen: in the news and on the filing screen, where the seat's next candidate is named after the player says no.

**Cause.** Found in code: `src/core2/modules/candidacy.ts` line 1565 (the loop over `partyProspects` calls `api.stopgap("SG-P15-party-ask-after-player")` and `break`s when the person asked is the player), and `answerPartyAsk` (line 1650) handles only agreeing moves (`AGREEING_MOVES`), so a refusal changes nothing.

**Fix.** In `answerPartyAsk`, when the reply to a `party-asked` record is a no or not-now move, find the same contest and party, take the members `partyProspects` returns that have no `party-asked` record for this contest yet, and run the same ask-and-decide step the loop runs for the next one (write the `party-asked` record, then `decideToRun`), while filing is open. Reuse the loop's body as one function both call; do not write a second asking path. Delete the `break` and the stopgap call once the answer path asks the next member. Cost: it runs only on a `scene.reply` event, so no daily scan.

**Time box.** 3 hours for a Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** No dice: the next member is the next in the existing order (inroads with the chair first, then standing), decided by `decideToRun` from their own traits and records. Ask why: the next member's decision cites the new `party-asked` record. One rule, all 56 places: nothing names a party or place.

**Done when.** A second session, in a one-year `buildBenchWorld` in a drawn place (place and seed named in the PR), makes the player answer no to a party's ask for a seat while filing is open and sees, by record id, a new `party-asked` record for the party's next member and that member's candidacy decision citing it. A test in `src/core2/modules/candidacy.ts`'s test file covers the refusal path, and SG-P15-party-ask-after-player is resolved in `src/core2/data/stopgaps/p15.json`.

**Waits on.** Nothing.

**Files.** src/core2/modules/candidacy.ts, src/core2/data/stopgaps/p15.json

**Notes.** Nov 14 (Cluster 29 thread): built in `askNextAfterRefusal` (src/core2/modules/candidacy.ts) by running the same `askForCandidates` for the player's party after a decline or stall reply; no second asking path. Pinned test src/director/party-ask-refused.test.ts (Floydale SC, Denver PA).
