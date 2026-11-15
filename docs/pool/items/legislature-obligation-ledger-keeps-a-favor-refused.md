---
id: legislature-obligation-ledger-keeps-a-favor-refused
title: "A favor called in and refused is kept on the obligation ledger as broken, and the ones who dealt with that person read it"
area: gov
kind: wiring
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
source: "Endorsement-ask builder, Nov 15, 2026; the Account lead's ruling of 02:47Z"
model: sonnet
effort: medium
root: none
---

**What.** A colleague who took a deal in office owes the sponsor a favor; when the sponsor's campaign calls it in and the colleague says no, nothing on the ledger says so. The favor stays "owed" forever and is asked again, and nobody who dealt with the person can read that they refused. Seen: after a colleague refuses an endorsement they owed, the next deal they are offered, the sponsor's next talk with them and the paper's account of the race can say the favor was refused.

**Cause.** Found in code: `ObligationRow` in src/core2/modules/legislature.ts (line 3687) has only `settled: boolean`, `settledBy` and `settledOn`; `settleObligation` (line 3722) is the one writer, and only a yes calls it. A no on the endorsement row (src/core2/modules/campaigns.ts, `answerEndorsementAsk` for the player, `askForEndorsement` for everyone else) leaves the obligation row untouched.

**Fix.** Give `ObligationRow` a refused state next to `settled` (`refusedBy`, `refusedOn`, written by one `refuseObligation` beside `settleObligation`), call it from the two endorsement paths on a no to a favor, make `obligationsOwedTo` stop returning a refused favor so it is not asked again, and read it where the legislature weighs a deal with the same person (the promises thread owns how promises are kept, broken and remembered: join it, never a second ledger). The player sees it in the sponsor's next talk with the person and in the Journal line for the refusal.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes and say what is left.

**Rules.** No dice: a refusal is the person's own answer already kept on the endorsement row. Replace, never layer: one ledger. An effect is a read: another engine must read the refusal by record id.

**Done when.** A second session, not the builder, in a drawn place (named, with its seed) finds a refused favor on the ledger by obligation id, shows it is not asked again, and shows the engine that read it (a later deal or talk), named by record id.

**Waits on.** The promises thread ("Make promises kept, broken and remembered"); the endorsement-ask PR for the player's no.

**Files.** src/core2/modules/legislature.ts, src/core2/modules/campaigns.ts
