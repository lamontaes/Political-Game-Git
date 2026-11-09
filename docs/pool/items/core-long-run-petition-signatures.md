---
id: core-long-run-petition-signatures
title: "Every petition signature is kept after the clerk's check (Montpelier, Vermont: 132,276 rows at year 8)"
area: core
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: memory/petition-signatures
pr: #8080
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-09T21:01:48.037Z
---

**What.** The elections engine keeps one petitionSignatures row per signer and filing (signPetition) and never removes one. Signatures are read only while a petition circulates (signPetition, the director's door talk) and by the clerk's check (voting.ts checkPetition), which keeps its own result (valid count, names struck). At Montpelier, Vermont (5046000, world seed mont1, fast-forward) the table grew from 54,506 rows at year 4 to 132,276 at year 8 (14 to 38 MB of live heap by removal).

**Rules.** Keep results, not their history (owner, Oct 7, Nov 5, Nov 8): once the clerk has checked a petition, its signatures go and the check keeps what counted. Bookkeeping is a debug switch (Oct 11): tests and proofs keep every signature.

**Done when.** In play a checked petition's signatures are gone after keepPetitionCheck, the check keeps the valid count, and with bookkeeping on they stay; a test shows both; petition-filing.test still reads the signatures against the check; speed:year --seed mont1 --place 5046000 --years 2 records proof against the same main differs only in core2-elections-v1.petitionSignatures.

**Files.** src/core2/modules/elections.ts, src/core2/petition-signature-retention.test.ts, src/core2/petition-filing.test.ts

**Notes.** TODO
