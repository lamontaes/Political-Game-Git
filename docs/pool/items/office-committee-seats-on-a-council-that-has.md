---
id: office-committee-seats-on-a-council-that-has
title: "Committee seats on a council that has them."
area: office
kind: feature
priority: 2
status: done
claimed-by: claude/office-committee-meeting
pr: #4868
blocked-on:
milestone:
source: "docs/coordination/OFFICE-LOCAL.md line 31 (unchecked checklist line)"
claimed-at: 2026-10-17T04:17:59.357Z
---

**What.** Checked against main on Oct 16: PARTLY. Bodies above the committee-of-the-whole size get committees and a hearing in the engine (`leadership.ts`, `legislature.ts`), but the local office day and its calendar have no committee meeting at all. Next: A committee meeting on the council's calendar before the full-body vote, for councils large enough to have committees. The player would notice the act on the politics screen as a choice among people, never a form.

**Rules.** One rule, all 56 places: whether a body has committees and how many is data from the body's type and place, with no place or body named in code; An effect is a read, not a record: the full meeting reads the committee's recommendation at the moment it votes; Ask why: a committee's recommendation keeps the members' reasons by record id; No dice: assignment and votes follow traits, seniority and the law, never a roll; This is a game, not a spreadsheet: committee meetings are stops the player may skip, with the character acting; Replace, never layer: any single-meeting stand-in for committee work is deleted in the same change; No hand-written player text: the meeting scene words come from the English engine.

**Done when.** A test beside `office-day-calendar.test.ts`, in a drawn place with a large council (buildBenchWorld, seed named in the PR body), shows a committee meeting dated before the full meeting and the full vote citing the committee's report by record id. The owner plays it: A committee meeting on the council's calendar before the full-body vote, for councils large enough to have committees.

**Files.** src/core2/modules/office-day.ts, src/core2/office-day-calendar.ts, src/core2/legislature-committees.ts, src/core2/data/office-day/parameters.json

**Notes.** Checklist line from OFFICE-LOCAL.md; verify against main before starting.

Looked at Oct 17 (claude), claimed and released, not built. Checked on main: `committeeStage` in `legislature.ts` runs inside `countVote`, in the same call and on the same day as the floor vote, with no date on the `CommitteeRecord`. A body gets a committee only above `committeeOfTheWholeMaximum` (9 members), so in a drawn town it is a large council (rare among the 56 places) or a state or federal chamber. Dating the committee a week before the sitting means: (1) `scheduleVote` also schedules a `committee-meeting` calendar entry before the sitting (a lead in days, a new ESTIMATED parameter); (2) `committeeStage` becomes idempotent (reuse the record), gets a date, and a held bill fails on the committee's date so it never reaches the floor agenda; (3) the floor vote cites the committee record id. The hazard is the `beforeVote` hooks (`staff.ts` briefings, `interest-groups.ts` organizing, `meetings.ts` public comment, `office-day.ts` `ownVote`, the player's own vote): they run before the committee stage today, so a committee on an earlier day would decide before they ran, or they would have to run on both days (not idempotent as written). Decide first which hooks belong to the committee day and which to the floor day; then the change is small. The office-day stop for the player's committee meeting depends on `office-day.ts` and was not read. The test needs a drawn place with a chamber above nine members (a state legislature qualifies in every state place).
