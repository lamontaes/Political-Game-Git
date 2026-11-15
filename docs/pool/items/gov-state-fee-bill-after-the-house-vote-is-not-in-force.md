---
id: gov-state-fee-bill-after-the-house-vote-is-not-in-force
title: "A State House fee bill the House passes by the held vote does not reach the law in force"
area: gov
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: filed by hand on branch claude/project-thread-xy4wd4 (cluster 13, PR #9308)
after:
lead: governing
standard: 2
model: opus
effort: medium
root: none
---

**What.** After dev mode's hold-vote route passes a State House fee bill in the House, the bill is not seen in force: its stage reads on-the-floor, then failed after the later days, and the fee list still reads the take it had. The state half of the fee chain (Senate, desk, law in force, the changed take) is not shown played. Seen: on the draft card's Fees and charges list after the days, where the take stays at its old figure.

**Cause.** Measured: at Holiday Lakes, Texas, seed aa11, playing Aaron Powers (State Representative), `FEE_HOLD=1 node scripts/play-walks/fee-bill.mjs` holds HB 2 (hospital charges at 125 percent): the paper reads "Passed, 85 to 65" and the stage reads on-the-floor; after 95 more played days the stage reads failed and the fee list still reads "Public hospital charges $10.4 billion a year". Not yet found whether the other chamber, the desk or the session's end ended it, and not checked for a non-fee bill. A bill that passes and then reads failed is its own clue, unproven: the House result may be read as passed while the bill's own status never advances past the chamber it is in.

**Fix.** Read the stage and the calendar after the held vote to find which step ends the bill, fix that step in the one legislature path, and prove the state fee bill reaches the law in force and the take.

**Time box.** 3 hours for one opus session.

**Rules.** No dice. Pinned place and seed in the test; never loosen an assertion to get green.

**Done when.** A second session drafts a State House fee bill at a place and seed it did not choose, holds the vote in dev mode, and sees the law in force and the changed take on the draft card in the running game, with the bill's record id on the stage view.

**Waits on.** Nothing.

**Files.** src/core2/modules/world-legislating.ts, src/core2/fee-levels.ts

**Notes.** Found while replaying the State House fee walks for PR #9308.
