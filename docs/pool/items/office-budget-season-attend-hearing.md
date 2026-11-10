---
id: office-budget-season-attend-hearing
title: "The player attends the budget hearing as a choice: the council's budget bill sits on a meeting agenda before the fiscal year starts"
area: office
kind: feature
priority: 2
size: L
status: blocked
standard: 2
claimed-by: claude/budget-hearing-agenda
pr:
blocked-on: office-budget-season-attend-hearing-part-1-agenda-placement, office-budget-season-attend-hearing-part-2-vote-at-meeting, office-budget-season-attend-hearing-part-3-player-at-hearing
source: added with npm run pool -- add
claimed-at: 2026-10-20T06:41:35.954Z
after:
lead: governing
model: opus
effort: medium
root: rc7-player-cannot-drive
---

**What.** On main a budget hearing exists (`holdCouncilBudgetHearing` in src/core2/modules/legislature.ts), but it and the budget vote run as direct calls on set days, so the budget bill never sits on a meeting agenda and a seated player with the every-meeting stop is never held at a budget meeting. Make the budget hearing a player choice in three parts: place the bill on the body's agenda before the fiscal year starts, vote it at that meeting through `holdVote`, and let a seated player speak. A computer-run body still votes it the same day.

**Cause.** Found in code: `holdCouncilBudgetHearing` and `councilBudget` in src/core2/modules/legislature.ts (lines 940 and 996) draft, hear and vote the budget without `placeOnAgenda` (src/core2/modules/office-day.ts, line 330) or `holdVote`.

**Fix.** Build the three parts in order; this item adds no code of its own.

**Time box.** 12 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the one-call draft-and-vote path is deleted; No dice; One rule, all 56 places: the meeting day comes from the body's own rule; No hand-written player text: hearing wording waits on words-budget-hearing-speakers.

**Done when.** A second session, not the builder, plays a drawn place and seed (named), with a seated player holding the every-meeting stop, and sees them stopped at the meeting that votes the budget, speak on it, and the adopted budget id and the kept act id named; src/core2/office-day-budget-season.test.ts still passes.

**Waits on.** The three parts: office-budget-season-attend-hearing-part-1-agenda-placement, office-budget-season-attend-hearing-part-2-vote-at-meeting, office-budget-season-attend-hearing-part-3-player-at-hearing. Part 1 also waits on office-the-budget-season (open, PR #5533) and part 3 on words-budget-hearing-speakers (open).

**Files.** src/core2/modules/legislature.ts, src/core2/modules/budgets.ts, src/core2/modules/office-day.ts

**Notes.** TODO

Oct 25 audit: blocked-on now names the item that carries PR #5533 (office-the-budget-season).

**Notes (pool redo, Nov 10).** The brief's "blocked-on" for this item was office-the-budget-season; it now lists the parts, and part 1 carries the old gate as its `after:`.
