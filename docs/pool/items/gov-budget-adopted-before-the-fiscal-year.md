---
id: gov-budget-adopted-before-the-fiscal-year
title: "Town and county bodies adopt their budget on the fiscal year's first day, not at a meeting before it"
area: gov
kind: realism
priority: 3
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

**What.** A seated council member sees the budget on the meeting panel on the fiscal year's first day (Jul 1 in Danville, Iowa, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6). Where no regular meeting falls that day, the body meets that day at its usual hour only to vote the budget. Real councils and boards adopt their budget at a regular meeting before the fiscal year starts, often weeks before, as their charter or state law sets. Seen: the meeting panel on the year's first day, and the Politics calendar, which does not list that meeting.

**Cause.** Found in code: budgets.ts schedules `budget-adoption` on `${fy}-${fiscalYearStart}` and computes the fiscal year from the date it runs (`fiscalYearOf(api.state.date, ...)`); office-day.ts `placeBudgetVote` puts the budget on that day's meeting, holding one if none is regular (stopgap SG-OFFICE-budget-meeting-on-the-year-start).

**Fix.** Read each body's adoption deadline from data (state law or charter, by place type), place the budget on the last regular meeting before it, and have the adoption name its fiscal year explicitly instead of reading it from the date. Moving the date moves every world's budget, so the speed and divergence rule applies.

**Time box.** 4 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places. Real data calibrates the date; nothing names a state in code.

**Done when.** A second session plays a seated member in a drawn place, on main, and votes the budget at a regular meeting before the fiscal year starts; the enacted budget takes effect on the year's first day. SG-OFFICE-budget-meeting-on-the-year-start is cleared.

**Waits on.** office-board-vote-cast-for-the-player-without-a-stop-again merging.

**Files.** src/core2/modules/budgets.ts, src/core2/modules/office-day.ts, src/core2/modules/legislature.ts

**Notes.**
