---
id: owner-bail-bonds
title: "Should a defendant who cannot pay the whole bail be able to pay a bail bond company a fee and go home? Owner said yes on Oct 23; CTO to confirm with him"
area: gov
kind: owner-decision
priority: 2
size: S
status: blocked
claimed-by:
pr:
blocked-on: owner
source: "owner, in a pool-worker session, Oct 23"
---

**What.** The game has one cash bail of $10,000 (`pretrialBailMinor`, ESTIMATED), and a charged defendant without that much cash is held until the hearing, 33 to 227 days depending on the state. In most states a defendant who cannot pay the whole bail can instead pay a commercial bail bond company a fee they do not get back, and go home; a few states ban commercial bail, Kentucky among them (`docs/research/starting-law-2026/batch-2/end-cash-bail.json`). The owner answered yes on Oct 23, 2026, and asked that the CTO check it, confirm it with him and bring it back up to him before anything is built.

**Rules.** Look before you ask: neither `OWNER-DECISIONS.md` nor the decision register rules on bail bonds (searched Oct 23). This is a game, not a spreadsheet: a real-world step the game lacks is the owner's call, which he has made provisionally and wants confirmed.

**Done when.** The CTO confirms the ruling with the owner and writes it into `docs/coordination/OWNER-DECISIONS.md` in his words. Then a build item is added to the pool whose done-when shows, in a drawn place (`buildBenchWorld`, one played year), a defendant paying a bond fee on the journal and waiting at home, or this item is dropped if the owner reverses.

**Files.** docs/coordination/OWNER-DECISIONS.md, src/core2/justice-pretrial.ts, src/core2/data/justice/parameters.json

**Notes.** Raised in PR 5847 (`justice-bail-moves-the-cash`). The owner's words, Oct 23: "Mark that as something for the CTO to check, double check with me, and also bring this back up to me. But yes, for the decision." The fee share (commonly said to be about a tenth of the bail) and which states ban commercial bail need sourcing (`researcher`) before building.
