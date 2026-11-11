---
id: owner-bail-bonds
title: "Should a defendant who cannot pay the whole bail be able to pay a bail bond company a fee and go home? Owner said yes on Oct 23; CTO to confirm with him"
area: gov
kind: owner-decision
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: "owner, in a pool-worker session, Oct 23"
after:
standard: 2
model: sonnet
effort: medium
root: none
lead: cto
checked: fable 2026-11-10
---

**What.** The game has one cash bail of $10,000 (pretrialBailMinor, ESTIMATED), and a charged defendant without that much cash is held until the hearing, 33 to 227 days depending on the state. In most states a defendant who cannot pay the whole bail can instead pay a commercial bail bond company a fee they do not get back, and go home; a few states ban commercial bail, Kentucky among them (docs/research/starting-law-2026/batch-2/end-cash-bail.json). The owner said yes on Oct 23, 2026 and the Oct 25 audit ruled this "simulate it, don't ask", so it is a build item. Build it when the justice engine is scheduled. Seen: a defendant's card and the court scene, where a poor defendant goes home on a bond for a fee.

**Cause.** Design: owner ruling Oct 23, 2026 ("But yes, for the decision", quoted in the Notes) and the Oct 25 audit; the single $10,000 bail is read at src/core2/justice-pretrial.ts line 47 (pretrialBailMinor) and the share unable to post it in unableToPost in src/core2/public-safety.ts (line 978).

**Fix.** Source the bond fee share and the states that ban commercial bail (a researcher step inside this item), then let a charged defendant who cannot pay the whole bail pay a commercial bond company's non-refundable fee where the state's law allows commercial bail, and go home. Write the owner's ruling into docs/coordination/OWNER-DECISIONS.md in his words.

**Time box.** 8 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: whether a defendant pays a fee comes from their cash, the bail and the state's law, never a roll. Research before building: the fee share and the state table are SOURCED or ESTIMATED with their spread. One rule, all 56 places: the ban list is state data, no state is named in code. Wire to the world: the fee moves cash on the journal, and the justice engine reads that the defendant is at home. Look before you ask: the ruling is found, so nothing here asks the owner.

**Done when.** A second session plays one year in a drawn place (buildBenchWorld, place and seed named) where commercial bail is allowed and sees a charged defendant who cannot pay the whole bail pay a bond fee on the journal and wait at home, and in a drawn place whose state bans commercial bail sees the same defendant held; the fee share and the ban table carry sources in the parameter data, and the justice engine's pretrial record names the release.

**Waits on.** Nothing. The sourced bond-fee share and state-ban table are made inside this item.

**Files.** docs/coordination/OWNER-DECISIONS.md, src/core2/justice-pretrial.ts, src/core2/public-safety.ts, src/core2/data/justice/parameters.json

**Notes.** Raised in PR 5847 (`justice-bail-moves-the-cash`). The owner's words, Oct 23: "Mark that as something for the CTO to check, double check with me, and also bring this back up to me. But yes, for the decision." The fee share (commonly said to be about a tenth of the bail) and which states ban commercial bail need sourcing (`researcher`) before building.

Oct 25 audit: ruled under "simulate it, don't ask": the owner said yes on Oct 23, so a defendant who cannot pay the whole bail may pay a commercial bond company's fee where the state's law allows commercial bail. Build it when the justice engine is scheduled (the owner put crime later on Oct 16).
