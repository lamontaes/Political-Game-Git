---
id: office-budget-season-attend-hearing-part-1-agenda-placement
title: "The council's budget bill sits on a meeting agenda before the fiscal year starts"
area: office
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: office-the-budget-season
blocked-on:
lead: governing
model: opus
effort: medium
root: rc7-player-cannot-drive
source: split from office-budget-season-attend-hearing in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** On main a hearing on the budget exists (`holdCouncilBudgetHearing` in src/core2/modules/legislature.ts writes a budgetHearings row and the room speaks), but it and the vote run as direct calls on set days, so the budget bill never sits on the body's meeting agenda and a seated player with the every-meeting stop is never held at it. Place the bill on the agenda of the body's meeting before the fiscal year starts with `placeOnAgenda`, the meeting day coming from the body's own rule. The player then has a real meeting to attend. This is part 1 of office-budget-season-attend-hearing. Feeds: office-budget-season-attend-hearing-part-3-player-at-hearing, which holds the player at the budget meeting.

**Cause.** Found in code: `holdCouncilBudgetHearing` and `councilBudget` in src/core2/modules/legislature.ts (lines 940 and 996) draft and hear the budget bill without `placeOnAgenda` (src/core2/modules/office-day.ts, line 330).

**Fix.** Draft the bill ahead of the fiscal year and call `placeOnAgenda` for it on the body's next meeting before the year starts; the hearing row keeps the meeting date.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the meeting day comes from the body's own rule. No dice. No hand-written player text: hearing wording waits on words-budget-hearing-speakers. Replace, never layer: the direct hearing call is replaced.

**Done when.** A second session, not the builder, plays a drawn place and seed (named) up to the fiscal year and sees the budget bill on the body's meeting agenda before the year starts, by bill id and agenda date; src/core2/office-day-budget-season.test.ts still passes.

**Waits on.** Nothing. (office-the-budget-season, which it once waited on, was closed: its children are done.)

**Files.** src/core2/modules/legislature.ts, src/core2/modules/office-day.ts, src/core2/office-day-budget-season.test.ts
