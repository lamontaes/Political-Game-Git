---
id: people-journal-taking-office
title: "The journal of a person the player continues as records taking office"
area: people
kind: feature
priority: 3
size: S
status: dropped
claimed-by:
pr:
blocked-on:
milestone:
source: "split from office-needs-office-federal-23 (Oct 16, 2026)"
claimed-at:
---

**What.** The journal of a person the player continues as shows nothing of taking office, an interview or a town hall, though the office-day act record holds them. Have the journal read the act record (taking office first) so the line cites the act by id, worded by the English engine.

**Rules.** No dice: cadence and lines follow records and traits. An effect is a read, not a record. No hand-written player text: lines are worded by the English engine. One rule, all 56 places.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place, seed named) the journal for a continued member lists taking office and a town hall with act record ids, and a test in src/director/journal.test.ts covers it. The owner plays it: reads his journal after his first week in Congress and sees what he did.

**Files.** src/director/journal.ts, src/core2/modules/office-day.ts

**Notes.** Split out of the OFFICE-FEDERAL needs list after checking main.

Checked Oct 16 by a Claude session: this duplicates `people-officeholder-journal` (done, #4511). `src/director/journal-office.test.ts` already plays a year in a drawn place and shows taking office, a vote, a town hall and an interview in the player's journal, each citing its record id, and it passes on main. The CTO can drop this item.

Sent back 2026-10-16 from PR #4697 (branch claude/journal-taking-office): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Dropped (CTO, Oct 19, 2026): duplicate of people-officeholder-journal (done, #4511); journal-office.test.ts covers it.
