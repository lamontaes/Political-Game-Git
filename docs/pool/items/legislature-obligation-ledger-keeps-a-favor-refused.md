---
id: legislature-obligation-ledger-keeps-a-favor-refused
title: "A favor refused when called in is read by the later dealings of the two people, and a refusal by anyone other than the player is kept too"
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

**What.** The endorsement-ask PR (#9431) gave the obligation ledger a refused state for the player: when a candidate calls in a favor and the player says no in the scene, `refuseObligation` writes `refusedBy` and `refusedOn` on the row, `obligationsOwedTo` stops returning it, and no campaign of that candidate calls it in again; the scene's ending strains the tie. Still missing: nothing else reads the refusal when the same two people deal again (a later deal, the sponsor's next talk with them, the paper's account of the race), and a no from anyone other than the player is not written, because `askForEndorsement` leaves the favor owed so it is asked again as views move. Seen: the sponsor's next dealing with someone who refused a called-in favor can say so.

**Cause.** Found in code: `refuseObligation` and `obligationsOwedTo` in src/core2/modules/legislature.ts have one writer, `answerEndorsementAsk` in src/core2/modules/campaigns.ts, for the player's no. The legislature's deal weighing (`positionOn`, the deal functions near line 4090) and `askForEndorsement` do not read `refusedOn`.

**Fix.** Make the deal weighing and the sponsor's next scene with that person read `refusedOn` (the promises thread adds the promise-kind that settles on the refusal event; join it, never a second ledger), and decide with the owner's rulings whether a refusal by a simulated person is final too.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes and say what is left.

**Rules.** No dice: a refusal is the person's own answer already kept on the endorsement row. Replace, never layer: one ledger. An effect is a read: another engine must read the refusal by record id.

**Done when.** A second session, not the builder, in a drawn place (named, with its seed) finds a refused favor on the ledger by obligation id, shows it is not asked again, and shows the engine that read it (a later deal or talk), named by record id.

**Waits on.** The endorsement-ask PR (#9431) for the refused state; the promises thread ("Make promises kept, broken and remembered") for the read.

**Files.** src/core2/modules/legislature.ts, src/core2/modules/campaigns.ts
