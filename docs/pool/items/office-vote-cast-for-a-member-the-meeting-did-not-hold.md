---
id: office-vote-cast-for-a-member-the-meeting-did-not-hold
title: "Stop the player at every vote by default; a seat whose stop the player switched off is absent, never cast from their position"
area: office
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after: office-board-vote-cast-for-the-player-without-a-stop-again
blocked-on:
lead: governing
model: opus
effort: medium
root: none
source: "Account lead T35, Nov 14, 2026 (route check for office-board-vote-cast-for-the-player-without-a-stop-again); owner's card answer Nov 14, 2026, 02:03Z, relayed by the Account lead"
checked:
claimed-at:
---

**What.** A seated player whose stops did not hold them at a vote finds "Decided for me" in Your office and a yes or no on the roll call that they never pressed. On the governor's desk, with the desk stop off, a bill is signed or vetoed from the player's lean. The owner answered by card on Nov 14, 2026 at 02:03Z ("Stop me at every vote", as the Account lead relayed it): meetings, floor votes and the governor's desk stop for the player by default; if the player switches a stop off themselves, they are recorded absent and bills wait on the desk; nothing is cast or signed from their position or leanings. Seen: Politics, then Your office, and the bill's roll call.

**Cause.** Found in code: `ownVote` in src/core2/modules/office-day.ts (around line 1031) runs at every vote on the player's seat and casts the player's own position (`castOwnPositionVote`), kept as an "own-choice" act, whenever the player was not held. There are three cases:

1. A town or county meeting whose stop did not hold them. "Every meeting" is off by default, and on a body larger than `decidingSeats` only the player's own bill holds them.
2. A state or federal floor vote when the "state floor vote" or "floor vote" stop is off.
3. A bill voted with no meeting row, through the `placeFiled` fallback in the same file.

Beside it:

- `eveOfVotes` in src/core2/office-day-federal.ts records a member of Congress at home in the district as abstaining, but keeps the act as how "own-choice" with detail "missed: at home in the district", so Your office can read it as "Decided for me".
- `deskOwnChoice` in src/core2/modules/office-day.ts signs or vetoes from the player's lean when the desk stop is off.

Every roll call already has a player with no cast vote abstain (`councilBudget`, `countVote` and the override roll in src/core2/modules/legislature.ts).

**Fix.** Design: build the owner's answer of Nov 14, 2026, 02:03Z.

- Every stop that holds the player for a vote of their seat is on by default in the stops data: every meeting, state floor vote, floor vote and desk.
- When the player has switched a stop off and is not held, `ownVote` casts nothing and keeps an act that reads absent, not "own-choice". Every roll records them as not voting.
- `deskOwnChoice` leaves the bill waiting on the desk instead of signing or vetoing it.
- The Congress "missed: at home in the district" act is kept as absent, not "own-choice".
- The "Decide for me" press stays the player's own choice.

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No vote is cast or bill signed in the player's name without the player (CTO, Nov 13, 04:18Z; owner's card answer, Nov 14, 2026, 02:03Z). One rule, all 56 places: stops and meeting rules come from data, never a named place.

**Done when.** A second session plays a seated member in a drawn place, on main, with every stop at its default. Through three meetings and a floor vote they are stopped at each vote. They then switch the meeting stop off, and the next meeting records them absent, with no "Decided for me" in Your office.

**Waits on.** office-board-vote-cast-for-the-player-without-a-stop-again reaching the train.

**Files.** src/core2/modules/office-day.ts, src/core2/office-day-federal.ts, src/core2/office-day-state.ts

**Notes.**
