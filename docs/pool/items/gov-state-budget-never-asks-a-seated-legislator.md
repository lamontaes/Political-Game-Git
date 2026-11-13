---
id: gov-state-budget-never-asks-a-seated-legislator
title: "A seated state legislator or member of Congress is never asked to vote the budget, and abstains"
area: gov
kind: bug
priority: 2
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
root:
source: "Account lead T35, Nov 13, 2026 (office-board-vote-cast-for-the-player-without-a-stop-again)"
checked:
claimed-at:
---

**What.** An Advanced start as a state representative, state senator or member of Congress never sees the state's or the nation's budget come to a vote. The roll call records the player as abstaining. Before office-board-vote-cast-for-the-player-without-a-stop-again, the player's own position was cast without asking, as "Decided for me". Seen: the budget's roll call on the bill's record, and Politics, then Your office.

**Cause.** Found in code: a legislature has no meeting row in office-day.ts, so `placeBudgetVote` leaves its budget to the budgets calendar (`adoptBudget`, then `councilBudget` in legislature.ts). That roll reads each member's cast vote, and the player, never asked, has none. The floor-vote stop (`state-floor-vote` and `floor-vote` in ownVote) covers ordinary bills by their floor day; the budget has no floor day.

**Fix.** Give the budget a floor day on the chamber's session calendar and hold the player there with the floor-vote stop, through the same `voteBudgetAtMeeting` route the town bodies use, so the vote is the player's press, their own position when they leave it to the character, or an abstention when they stay silent.

**Time box.** 4 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No vote is cast in the player's name without the player (CTO, Nov 13, 04:18Z). One rule, all 56 places.

**Done when.** A second session plays a seated state legislator in a drawn place, on main, through the state budget's vote, is stopped for it, and the roll call holds the vote they pressed.

**Waits on.** office-board-vote-cast-for-the-player-without-a-stop-again merging.

**Files.** src/core2/modules/legislature.ts, src/core2/modules/office-day.ts, src/core2/state-session-calendar.ts

**Notes.**
