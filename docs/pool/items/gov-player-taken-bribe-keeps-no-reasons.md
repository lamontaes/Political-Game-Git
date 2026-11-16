---
id: gov-player-taken-bribe-keeps-no-reasons
title: "A bribe the player took keeps what the money was for and why they took it"
area: gov
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: S3
pr: 9401
after:
blocked-on:
lead: gov
model: sonnet
effort: medium
root: rc3-thin-life-record
source: Account lead, from the reporter's-call reply set, Nov 15, 2026
checked: s3 2026-11-15
---

**What.** When the player takes a bribe in the bribe-offer scene, the crime record keeps the offerer's reasons for offering but none of the player's for taking, so a later scene that asks the player why they took it (the reporter's "Why did you take it?", the accusation) has nothing on the record to place its answers on: the player's money trouble at the time and the tie to the briber. Seen: any bribe the player takes through the scene, for example at Cinco Bayou FL in src/director/bribe-offer-player-seat.test.ts.

**Cause.** Found in code: `takePendingBribe` in src/core2/modules/corruption.ts puts the pending record back with `taken: true` and the offerer's `reasons.offer` only; an official the engine decides for gets `reasons.take` (their money pressure, the tie, their temperament) from `decide`, the player's seat gets none.

**Fix.** In `takePendingBribe`, keep the same take reasons an engine-decided official keeps (`takeValues`: need, pressure, tie; temperament; and the player's choice as `picked: 1` beside what the engine would have said), through the one `decide` function, so a scene reads them from the record the same way for everyone. What the money was for is already the record's `subjectId`.

**Time box.** 1 hour, Sonnet medium.

**Rules.** No dice; one decision function for every official; the player's reasons are the values the engine weighs plus their own pick, never a percentage.

**Done when.** In a drawn place and seed, a bribe the player takes in the scene has `reasons.take` with need, pressure, tie, temperament and `picked` 1 beside `reasons.offer`, and its `subjectId` names the bill or contract; src/director/bribe-offer-player-seat.test.ts reads them. A second session plays one on main.

**Waits on.** Nothing.

**Files.** src/core2/modules/corruption.ts, src/director/bribe-offer-player-seat.test.ts

**Notes.** Built on claude/gov-bribe-player-taken-keeps-reasons.
