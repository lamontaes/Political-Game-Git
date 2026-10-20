---
id: gov-committee-day-reads-records
title: "A committee's day runs what the records fire for a sitting day (ruling Oct 19); resolve SG-GOV-committee-day-hooks"
area: gov
kind: wiring
priority: 2
size: M
status: in-pr
claimed-by: claude/committee-day-records
pr: #5168
after:
blocked-on:
source: "acting CTO ruling Oct 19 (committee-day hooks); audit Oct 19, Part A 'What it fakes' 4"
claimed-at: 2026-10-20T13:40:41.991Z
---

**What.** A body with committees takes a scheduled bill to its committee a week ahead of the floor, but the committee decides on its own day without the pre-vote hooks that run on the floor day: staff briefings, interest groups organizing, public comment and the player's own vote. The Oct 19 ruling says the committee's day runs whatever the records already fire for a body on a sitting day, at the stage the body's own rules put them, from data, with nothing invented for the committee. Build that and resolve `SG-GOV-committee-day-hooks` so the release build stops refusing on an answered question.

**Rules.** One rule, all 56 places: which hooks a committee's day runs comes from the body's own rules in data, never a per-body list in logic. An effect is a read: a committee vote moves because members read their views, briefings and trades on that day.

**Done when.** A played year in a drawn place (`buildBenchWorld`) shows a bill's committee day with the hooks that fired (briefing, hearing, trade, the player's vote where the player sits) by record id and the committee's vote with its why; the stopgap row is resolved and the legislature tests run the case in a drawn place. The owner plays it: he sits on a committee and gets to vote on its day.

**Files.** src/core2/modules/legislature.ts, src/core2/data/stopgaps.json

**Notes.** From the Oct 19 rulings on cto/rulings-2026-10-19. office-session-days-committee-days-the-interim-the is the calendar side.

Sent back 2026-10-20 from PR #5168 (branch claude/committee-day-records-s2): a 'Done Oct 19' date note and owner attribution in the stopgap resolution; finish on that branch, merge main into it first.
