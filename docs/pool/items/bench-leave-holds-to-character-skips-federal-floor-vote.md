---
id: bench-leave-holds-to-character-skips-federal-floor-vote
title: "The bench's leave-holds-to-the-character helper never clears a federal floor-vote hold"
area: play
lead: filing-counter
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: medium
root: none
source: "Account lead builder, Nov 15 (state and federal duty-need measurement, coordinator's request)"
checked:
---

**What.** `leaveHoldsToCharacter` (src/bench/office.ts line 347) clears a local meeting, desk bills and state entries but not a federal floor-vote hold, so a bench script that plays a U.S. Representative with the days left to the character stops at the first floor vote and never moves. At Edmore, North Dakota (`drawPlace("mayor-acts-1:1", "mayor-acts")`, the Representative `official:term:seat:US-ND:us-house:00:2025-01-20`) the stop was on 2025-09-01 with hold `federal-floor:bill:federal:us-house:2025-01-26:official:seat:US-KY:us-house:04:6:2025-09-01`; the run repeated the same stop until its step limit. Seen: a bench script that leaves holds to the character stays on one date, while a player votes or switches the floor stop off. Possible twin to merge with: `bench-office-stop-switch-floor-stop-never-held` if it covers the same helper (the coordinator named it; it was not found on the Train or main on Nov 15).

**Cause.** Found in code: `leaveHoldsToCharacter` in src/bench/office.ts calls `leaveMeeting`, `takeUpItem`, `adjourn`, `leaveDeskToCharacter` and `actOn` on state entries only; `leaveVoteToCharacter` in src/core2/office-day-federal.ts (the federal counterpart that casts the vote from the character's own position and releases the hold) is not called from it.

**Fix.** Call `leaveVoteToCharacter` in `leaveHoldsToCharacter` for each federal floor hold waiting on the controlled holder (the hold id `federal-floor:<billId>:<date>` names the bill without its date), with a test that plays the Edmore Representative through 2025-09-01 and past it. The player's own route is unchanged.

**Time box.** 2 hours for one Sonnet session.

**Rules.** One engine per mechanic: the helper calls the federal engine's own function; skill `pinned-tests`.

**Done when.** At the drawn place Edmore, North Dakota (`mayor-acts-1:1`, the same draw every run) the Representative left to the character moves past 2025-09-01 to at least 2025-12-01 in a bench run, in under two minutes, and a second session reruns it on main and sees the same.

**Waits on.** Nothing.

**Files.** src/bench/office.ts

**Notes.** Found while measuring the federal duty need (Nov 15).
