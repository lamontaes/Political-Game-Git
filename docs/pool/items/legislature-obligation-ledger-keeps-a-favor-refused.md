---
id: legislature-obligation-ledger-keeps-a-favor-refused
title: "A favor refused when called in is read by the later dealings of the two people,"
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

**What.** The endorsement-ask PR (#9431) gave the obligation ledger a refused state for the player: when a candidate calls in a favor and the player says no in the scene, `refuseObligation` writes `refusedBy` and `refusedOn` on the row, `obligationsOwedTo` stops returning it, and no campaign of that candidate calls it in again; the scene's ending strains the tie. Still missing: nothing else reads the refusal when the same two people deal again (a later deal, the sponsor's next talk with them, the paper's account of the race). Seen: the sponsor's next dealing with someone who refused a called-in favor can say so.

**Cause.** Found in code: `refuseObligation` and `obligationsOwedTo` in src/core2/modules/legislature.ts have one writer, `answerEndorsementAsk` in src/core2/modules/campaigns.ts, for the player's no. The legislature's deal weighing (`positionOn`, the deal functions near line 4090) and `askForEndorsement` do not read `refusedOn`.

**Fix.** Read `refusedOn` in two places, with no second ledger and no promise kind (the called-in favor is a debt on the legislature's obligation ledger, so the refused row is the one record): the deal weighing near `positionOn` reads it for that pair of people; and the sponsor's next talk with the person raises it once, the way src/director/promise-talk.ts raises a settled promise (a conversation subject built from the obligation row, said once, then marked said). The raise lines go to the Words lead. A simulated person's no stays as it is (`askForEndorsement` leaves the favor owed so it is asked again as views move, which fits no dice); no ruling makes it final, so the question goes to the CTO and nothing here builds finality.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes and say what is left.

**Rules.** No dice: a refusal is the person's own answer already kept on the endorsement row. Replace, never layer: one ledger. An effect is a read: another engine must read the refusal by record id.

**Done when.** A second session, not the builder, in a drawn place (named, with its seed) finds a refused favor on the ledger by obligation id, shows it is not asked again, and shows the engine that read it (a later deal or talk), named by record id.

**Waits on.** The endorsement-ask PR (#9431) for the refused state.

**Files.** src/core2/modules/legislature.ts, src/core2/modules/campaigns.ts
