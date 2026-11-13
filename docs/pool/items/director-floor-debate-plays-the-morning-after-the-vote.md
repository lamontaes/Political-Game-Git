---
id: director-floor-debate-plays-the-morning-after-the-vote
title: 'The floor debate on a bill plays the next morning on the street, after the vote is over: "you head out … The chair recognizes Robert Hopkins on Ordinance 2025-2"'
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
checked: fable
source: Playtester P2, Nov 13 (Sundance, Wyoming, seed 594763ce-9fa4-467f-b1f5-b0f8b081cd31)
---

**What.** On main 596d5127, an Advanced start in Sundance, Wyoming (seed 594763ce-9fa4-467f-b1f5-b0f8b081cd31) as Council member Debra Glover. The Sundance Town Council met on February 4, 2025 at 6:00 PM. The meeting panel showed Ordinance 2025-2, the Immigration Enforcement Partnership Ordinance, "Failed / 2 yes, 3 no", and the player adjourned. At 8:00 AM on February 5 a scene opened:

> First thing on February 5th, you head out, and Robert Hopkins comes over.
> The chair recognizes Robert Hopkins on Ordinance 2025-2.
> Robert Hopkins: Thank you, Chair. I rise to speak against Ordinance 2025-2.

The replies were "Thank you, Chair. I'll be voting with the member." and "Will the member yield for a question?". The vote was already a day old. The player can't move a vote that is over, and the debate happens on the street. Seen: the first scene after any meeting where a body voted on a bill with members on both sides.

**Cause.** Found in code: `recordFloorDebate` (`src/core2/modules/legislature.ts`, line 3856) emits a `floor-debate` record "before the roll", dated the meeting day. The roll is taken in the same step, and the meeting panel shows its result. The director turns the record into a moment and stages it at the next scene slot, the next morning, with the ordinary opener ("you head out"). `purpose-scene.ts` (line 903) gives it the floor-debate purpose with no check that the bill is still waiting on that floor.

**Fix.** The director stages a `floor-debate` moment only while its bill is still waiting on that body's vote. That is the same reading of the bill's stage the meeting panel uses (`billStage` for the bill in the record's `billId`). A moment whose roll is recorded is dropped as stale, with its reason kept for dev mode. Nothing in the record or the bank changes. Where a meeting is played, the debate is told inside the meeting, which is the panel's own item.

**Time box.** 2 hours

**Rules.** A scene exists only if it writes something back, and an answer that can no longer change the vote writes nothing (`scene-standard`). The simulation is the one layer that knows anything: the director reads the bill's stage, never its own copy. One rule, all 56 places: the test draws its place and names it with its seed.

**Done when.** A test in src/director plays a drawn place's first council meeting through the meeting panel and finds no `floor-debate` scene staged after the roll on its bill. A second session then sees, on the bench on main, a drawn Advanced start as a council member with no floor-debate scene the morning after a meeting (screenshot with the place and seed).

**Waits on.** Nothing.

**Files.** src/director/purpose-scene.ts, src/core2/modules/legislature.ts, src/bench/bill-stage.ts

**Notes.** At the same meeting the player's own Budget Ordinance (Highways raised 19.8% to $271,000) passed 3 to 2 and showed "Vetoed" at once on the meeting panel, before the mayor had any day to consider it. That may be how a mayor's veto is recorded; it is noted here and not filed.
