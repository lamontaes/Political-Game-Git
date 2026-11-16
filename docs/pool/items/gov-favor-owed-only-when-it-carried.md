---
id: gov-favor-owed-only-when-it-carried
title: "A favor a colleague did the player is spent once, and owed only when it carried the yes"
area: gov
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "the Account lead, Nov 15: a yes the colleague gave on their own lean wrote a favor debt, and a favor already done still counted in full on the next ask"
claimed-at:
after:
lead: laws
model: sonnet
effort: medium
root: rc3-thin-life-record
---

**What.** When the player asks a colleague for a vote the evening before the roll, a yes the colleague gave on their own lean (the player only thanked them) wrote a favor the player owed them, and a favor the player already owed still counted at full worth on the next ask, so one colleague could be pleaded with again and again with the same goodwill. A debt written for a yes that was never a favor is also read by the campaign, which calls it in as an endorsement ask. Seen: the evening before a floor vote at South Glastonbury, Montana (place 3069713), where one colleague who stood against two of the player's bills stalls to the same plea on both.

**Cause.** Measured: at South Glastonbury, Montana (place 3069713, world seed 5e3ce505c6be1f0f5f34db9c8d806153ae0189235f6565a4e2342b65f6c38af8): `keepReply` in `src/core2/modules/legislature.ts` wrote the `obligation:<bill>:<colleague>:reply` row for every yes whose ending kept `favor-owed`, whether the favor carried it or not, and `favorWorth` read only the colleague's closeness to the player, never whether a favor was already owed, so a colleague at lean -0.11 who said yes to the plea on one bill still stalled to the same plea (favor 0.51) on the next.

**Fix.** `keepReply` writes the favor owed only for a yes that came after the player's plea, with the reply's id on the row (`replyId`). `favorWorth` is 0 while the asker still owes that member an unsettled favor, and counts again once the debt is repaid through `settleObligation` (the campaign's call-in path). `favorReturnedSince` counts only yeses that wrote a favor. `dealWeight` is untouched. Dev mode's Trace on a favor row shows the reply that wrote it, whether it is still owed and what a favor to the asker is worth now; on a committee record it shows the chair's lean term by term and their sum.

**Readers of favor rows.** `favorWorth` (the next ask's lean plus favor; 0 while owed). `favorReturnedSince`, read by `arc-variant.ts` `favorsGiven` (two are square only after a carried yes). `backingOf`, `askPlayerForEndorsement`, `billOfObligation` and the campaign turn's call-in loop in `campaigns.ts` (fewer rows are written, so fewer debts are called in; each debt that remains is one a plea earned).

**Time box.** 4 hours for one Sonnet session at medium effort. When it runs out, write what was read in this item and stop.

**Rules.** No dice: the colleague's lean and what they already did for the player decide. No stopgap: nothing is capped or flagged.

**Done when.** A second session on main, in a place and seed it names, sees a plea carry a yes once and the same colleague refuse the next ask; and at place 3069713 (world seed above) by the player's own presses, a plea carries a colleague who stood against the bill, writes one favor row, `favorWorth` reads 0, and the same colleague on another bill the same evening gives the plain no; Dev mode's Trace on the row shows the reply, "still owed" and the worth. Not claimed: that a played life reaches `settleObligation` (the call-in is played only by the campaign's endorsement ask, `src/core2/favor-called-in.test.ts`), so a debt counting again once repaid is proved there, not here.

**Waits on.** Nothing. The player sees the debt taken on in the plea's reply, and the no on the next ask.

**Files.** src/core2/modules/legislature.ts; src/bench/dev-trace.ts; src/director/favor-carried-once.test.ts (new)
