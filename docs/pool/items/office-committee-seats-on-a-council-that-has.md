---
id: office-committee-seats-on-a-council-that-has
title: "Committee seats on a council that has them."
area: office
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "docs/coordination/OFFICE-LOCAL.md line 31 (unchecked checklist line)"
---

**What.** Some councils and boards divide into standing committees (finance, public works, zoning), but the local office day has only the full meeting, so a member's committee seat and the committee meeting never appear. Where a body's data says it has committees, give the member a seat, put committee meetings on the body's calendar and let the committee send a bill to the full body. The player would notice a finance committee meeting before the budget reaches the full council and his own seat on it.

**Rules.** One rule, all 56 places: whether a body has committees and how many is data from the body's type and place, with no place or body named in code; An effect is a read, not a record: the full meeting reads the committee's recommendation at the moment it votes; Ask why: a committee's recommendation keeps the members' reasons by record id; No dice: assignment and votes follow traits, seniority and the law, never a roll; This is a game, not a spreadsheet: committee meetings are stops the player may skip, with the character acting; Replace, never layer: any single-meeting stand-in for committee work is deleted in the same change; No hand-written player text: the meeting scene words come from the English engine.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body) (draw a place whose council data lists committees): the bench player's council seat shows a committee assignment, a committee meeting appears on the calendar before the full-body vote on a bill, and the full body's vote cites the committee's recommendation (committee, meeting and bill ids named). Tests beside `src/core2/office-day-calendar.test.ts`. The owner plays it: sits on the finance committee and hears the budget there first.

**Files.** src/core2/modules/office-day.ts, src/core2/office-day-calendar.ts, src/core2/legislature-committees.ts, src/core2/data/office-day/parameters.json

**Notes.** Checklist line from OFFICE-LOCAL.md; verify against main before starting.
