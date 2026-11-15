---
id: play-executive-bill-comes-to-the-desk-after-it-passes
title: "After a mayor's or governor's bill passes through a member, the player is not walked to the desk to sign or veto it and the law page does not show the new value"
area: play
kind: feature
priority: 2
size: S
status: open
standard: 2
after: play-bill-menu-for-mayors-and-governors
blocked-on:
lead: screens
source: Carry of #8341 (PR #9151), account lead thread, Nov 14, 2026; the gaps its body named
model: sonnet
effort: medium
root: rc7-player-cannot-drive
checked: carrier thread 2026-11-14
---

**What.** A bill an executive sent through a member passes the body, comes to the executive's desk to sign or veto (the desk stop the office switches already hold at), and the law page shows the new value after it is signed or lapses. Today nothing shows the player that it happened. Seen: the player signs at the desk and then reads the new value on the law page.

**Cause.** Found in code: `seatAsk` in src/bench/legislature.ts ends at the ask; PR #8341 proved the ask and the requester but did not run a carried bill to its vote and desk. The desk and its stop exist (src/bench office desk, PR #9126) and the engine rule that a bill past its deadline becomes law unsigned exists; whether a bill brought at the executive's request reaches that desk for the same executive has not been run.

**Fix.** Run a carried bill through the vote with dev mode's hold-vote route in two drawn places, fix whatever the run shows (if the engine already does it, add the test and say so), and prove the chain by record id: the bill, the vote, the desk act, the law in force.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: read from the office rows and the place's records, never a named place. Replace, never layer: use the one draft card and the one bill engine. No dice. Words come from the English engine and control names; the Words lead reads any new line.

**Done when.** A second session sends a bill as a mayor and as a governor in two drawn places, holds the vote, signs it at the desk, and the law page shows the new value; the chain is named by record id.

**Waits on.** PR #9151 (or #8341) folding into the train.

**Files.** src/bench/legislature.ts, src/bench/play.mjs, src/bench/handler.ts, src/bench/data/controls.json

**Notes.** Look-first, Nov 14: searched docs/pool/items for the executive bill menu, carry refusal and desk signature; the only neighbors are gov-carry-ask-player-decides (done) and play-bill-menu-for-mayors-and-governors (in-pr, carries this item's parent).
