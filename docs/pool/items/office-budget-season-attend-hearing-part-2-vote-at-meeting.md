---
id: office-budget-season-attend-hearing-part-2-vote-at-meeting
title: "The budget bill is voted at that meeting through the same holdVote the other items use"
area: office
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: office-budget-season-attend-hearing-part-1-agenda-placement
blocked-on:
lead: governing
model: opus
effort: medium
root: rc7-player-cannot-drive
source: split from office-budget-season-attend-hearing in the pool redo, Nov 10, 2026
---

**What.** With the bill on the agenda, vote it at that meeting through `holdVote`, as every other item does, and delete the one-call draft-and-vote path so a computer-run body still votes it the same day but through the meeting. The vote record then belongs to a meeting like every other item's. This is part 2 of office-budget-season-attend-hearing.

**Cause.** Found in code: `councilBudget` in src/core2/modules/legislature.ts (line 996) votes the budget in a direct call at the year's start; `holdVote` (line 5106) is the vote every agenda item uses.

**Fix.** Route the budget bill's vote through the agenda item and `holdVote`, adopt or fail the budget from that vote, and delete the one-call path.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the one-call draft-and-vote path is deleted. No dice. One rule, all 56 places: the meeting day comes from the body's own rule.

**Done when.** A second session, not the builder, plays a drawn place and seed (named) and sees the budget voted at the meeting the bill sat on, by the vote record id, with the adopted budget id named and no other path that adopts a budget; src/core2/office-day-budget-season.test.ts still passes.

**Waits on.** office-budget-season-attend-hearing-part-1-agenda-placement.

**Files.** src/core2/modules/legislature.ts, src/core2/modules/budgets.ts, src/core2/modules/office-day.ts
