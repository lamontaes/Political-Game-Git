---
id: people-journal-taking-office
title: "The journal of a person the player continues as records taking office"
area: people
kind: feature
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "split from office-needs-office-federal-23 (Oct 16, 2026)"
---

**What.** The journal of a person the player continues as shows nothing of taking office, an interview or a town hall, though the office-day act record holds them. Have the journal read the act record (taking office first) so the line cites the act by id, worded by the English engine.

**Rules.** No dice: cadence and lines follow records and traits. An effect is a read, not a record. No hand-written player text: lines are worded by the English engine. One rule, all 56 places.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place, seed named) the journal for a continued member lists taking office and a town hall with act record ids, and a test in src/director/journal.test.ts covers it. The owner plays it: reads his journal after his first week in Congress and sees what he did.

**Files.** src/director/journal.ts, src/core2/modules/office-day.ts

**Notes.** Split out of the OFFICE-FEDERAL needs list after checking main.
