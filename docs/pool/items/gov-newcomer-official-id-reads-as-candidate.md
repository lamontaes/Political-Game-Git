---
id: gov-newcomer-official-id-reads-as-candidate
title: "A newcomer drawn for a race has a person id that reads as a filed candidate"
area: gov
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: governing
source: S6 (brief J), Words lead's read of batch 1, Nov 14 2026
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** A person filled in as a newcomer for a race keeps the id `official:candidate:<contest>:<party>`, so anyone reading records or a dev Trace takes them for a filed candidate. In Chalkyitsik AK the Words lead read Susan Greer, offered as the player's running mate, as already on a ticket; she held no filing. The id should say what the person is: someone drawn who could run. Seen: dev Trace and the person card of a running-mate newcomer.

**Cause.** Found in code: `candidateChoices` in src/core2/modules/officials.ts (the `newcomers` list, `const id = \`official:candidate:${contest.id}:...\``) names a drawn newcomer by the contest it was drawn for, and `offerNewcomer` in src/core2/modules/voting.ts fills them in under that id.

**Fix.** Name newcomers `person:drawn:<hash of seed, contest and party, i>` (no ":candidate:", no "|"), keeping the draw's own key for `drawOfficialIdentity` and `drawOfficial` so the same person comes back; update the tests that pin the id.

**Time box.** 2 hours for one sonnet session.

**Rules.** No dice; one rule, all 56 places; the same seed draws the same person.

**Done when.** A second session, in a drawn joint-ticket state with a seed it did not choose, files for governor in the running game and sees a newcomer offered as running mate whose id in dev Trace carries no "candidate", and the same person returns after a reload.

**Waits on.** nothing.

**Files.** src/core2/modules/officials.ts, src/core2/modules/voting.ts
