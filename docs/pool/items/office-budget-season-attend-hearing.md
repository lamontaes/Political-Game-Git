---
id: office-budget-season-attend-hearing
title: "The player attends the budget hearing as a choice: the council's budget bill sits on a meeting agenda before the fiscal year starts"
area: office
kind: feature
priority: 2
size: L
status: blocked
claimed-by: claude/budget-hearing-agenda
pr:
blocked-on: PR #5533 (the budget hearing before the vote) is not merged; the hearing is a calendar work, not a meeting, and the vote on the heard bill is at the year's start, so attending needs a stop at the hearing that does not call holdVote on the budget bill (adjourn would). Build on #5533 once merged.
source: added with npm run pool -- add
claimed-at: 2026-10-20T06:41:35.954Z
---

**What.** Today the budget bill is drafted and voted in one call at the year's start (legislature.ts adopt path, budgets enacted or failed), so it never sits on a meeting agenda and a seated player with the every-meeting stop is never held at a budget meeting. Place the bill on the agenda of the body's meeting before the fiscal year starts (placeOnAgenda), vote it at that meeting through the same holdVote the other items use, and let the seated player speak (speakOnItem) or take it up; a computer-run body still votes it on the same day.

**Rules.** Replace, never layer: the one-call draft-and-vote path is deleted; No dice; One rule, all 56 places: the meeting day comes from the body's own rule; No hand-written player text: hearing wording waits on words-budget-hearing-speakers.

**Done when.** In a drawn place and seed (named in the PR body) a seated player holding the every-meeting stop is stopped at the meeting that votes the budget, speaks on it, and the adopted budget id and the kept act id are named; office-day-budget-season.test.ts still passes.

**Files.** src/core2/modules/legislature.ts, src/core2/modules/budgets.ts, src/core2/modules/office-day.ts

**Notes.** TODO
