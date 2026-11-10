---
id: office-budget-season-attend-hearing-part-3-player-at-hearing
title: "A seated player with the every-meeting stop is held at the budget meeting and can speak"
area: office
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: office-budget-season-attend-hearing-part-2-vote-at-meeting
blocked-on:
lead: governing
model: opus
effort: medium
root: rc7-player-cannot-drive
source: split from office-budget-season-attend-hearing in the pool redo, Nov 10, 2026
---

**What.** With the budget on a meeting agenda and voted there, a seated player who holds the every-meeting stop must be stopped at that meeting and be able to speak on the budget (`speakOnItem` in src/core2/modules/office-day.ts, line 568) or take it up. The wording of the hearing comes from the English engine's banks. This is part 3 of office-budget-season-attend-hearing.

**Cause.** Found in code: the every-meeting stop is read in src/core2/modules/office-day.ts (line 420) for meetings on the agenda; the budget meeting is not among them until parts 1 and 2 land.

**Fix.** Hold the player at the budget meeting and offer `speakOnItem` on the budget item; the wording comes from words-budget-hearing-speakers.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: hearing wording waits on words-budget-hearing-speakers. An effect is a read, not a record: the player's remark is read by the vote that follows. No dice.

**Done when.** A second session, not the builder, plays a seated council member with the every-meeting stop in a drawn place and seed (named), is stopped at the meeting that votes the budget, speaks on it, and sees the adopted budget id and the kept act id named; src/core2/office-day-budget-season.test.ts still passes.

**Waits on.** office-budget-season-attend-hearing-part-2-vote-at-meeting and words-budget-hearing-speakers (open).

**Files.** src/core2/modules/office-day.ts, src/core2/modules/legislature.ts, src/core2/office-day-budget-season.test.ts
