---
id: legislature-ask-waits-for-the-players-committee
title: "No one is asked for a vote the evening before on a bill the player's own committee will hold the next morning"
area: gov
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
source: "bargaining thread, Nov 14, 2026 (Brandon, Montana, HB 30), relayed by the Account lead; follows legislature-ask-skips-bills-the-committee-will-hold (#7165)"
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** The evening before a floor day, a sponsor asks colleagues (the player among them) for their votes on a bill that its committee then holds on the floor day, so the ask and the player's answer are about a bill that never reaches a roll call. Nothing reads that answer. Seen: the evening-before vote ask scene for a bill that the next day's paper and Journal say died in committee.

**Cause.** Found in code: src/core2/modules/legislature.ts `committeesBeforeTheFloor` skips a bill when `committeeWaits` says so (registered in src/core2/modules/office-day.ts, `registerCommitteeWait`: the player's own body, the bill placed on the agenda, the player on the committee), because that committee meets inside the vote on the floor day so the player's seat votes in it. `askBeforeTheRoll` then skips a bill only when `committeeRecords` already shows it held, and none exists yet, so the asks go out; `committeeStage` holds it the next morning. #7165 closed the same gap for every other bill by holding the committee the evening before; this branch was left out of it.

**Fix.** Move the chair's hearing decision in `committeeStage` (the cast `hear` choice, else the chair's agreement after a hold, else `chairHearsBill` on the chair's position and trait) into one exported function, and have `askBeforeTheRoll` call it for a bill whose first-chamber committee waits on the floor day: a bill the chair will not hear draws no ask. One rule, read in both places; no second copy. A heard bill the committee then votes down on the day is left as it is (the player's own committee vote is still to come).

**Time box.** 3 hours for one Sonnet session.

**Rules.** An effect is a read, not a record: an ask no roll call reads is an unregistered placeholder. No dice. askBeforeTheRoll is the bargaining thread's; tell it before changing the function. No new stopgaps.

**Done when.** A second session plays a state legislator who sits on the committee for a bill on the next floor day, in a drawn place with its seed printed, and sees no evening-before ask on a bill the chair then holds, and an ask on a bill the chair hears; a pinned test in src/core2/legislature-ask-reaches-roll.test.ts covers the player-on-the-committee case and fails with the old rule.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts, src/core2/modules/office-day.ts, src/core2/legislature-ask-reaches-roll.test.ts
