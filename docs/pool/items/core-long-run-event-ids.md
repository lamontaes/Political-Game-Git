---
id: core-long-run-event-ids
title: "core.eventIds keeps the id of every event ever (Montpelier, Vermont: 661,212 ids, 117 MB at year 6)"
area: core
kind: bug
priority: 2
size: S
status: claimed
claimed-by: memory/event-ids
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-09T17:01:18.154Z
---

**What.** applyCoreEvent adds every event id to core.eventIds and nothing removes one. Every reader asks about an id built from today's date, a race still ahead (a contest id carries its election day) or an id with no date (a cause group's founding, a scene's reply), so an id whose newest written date is long past is never asked about again. At Montpelier, Vermont (5046000, world seed mont1, fast-forward) the set held 661,212 ids at year 6, 117 MB of live heap measured by removing it.

**Rules.** Keep results, not their history (owner, Oct 7, Nov 5, Nov 8): an id whose newest written date is more than eventIdRetentionDays past leaves the set on the first of a month, and an id with no date stays forever. Bookkeeping is a debug switch (Oct 11): tests and proofs keep every id.

**Done when.** In play an id more than eventIdRetentionDays past its newest date is gone after the next first of the month and an id with no date stays; with bookkeeping on both stay; a test shows both; speed:year --seed mont1 --place 5046000 --years 2 records proof against the same main differs only in core.eventIds and the new queue part.

**Files.** src/core2/event-id-retention.ts, src/core2/state.ts, src/core2/decision-detail.ts, src/core2/data/parameters.json

**Notes.** TODO
