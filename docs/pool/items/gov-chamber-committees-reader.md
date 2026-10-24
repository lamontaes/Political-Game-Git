---
id: gov-chamber-committees-reader
title: "Bills are routed and committees seated from each chamber's own committee list, falling back to the national nine"
area: gov
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
milestone:
source: split from gov-stopgap-legislature-committees-assumed-data by pool feeder Oct 20
---

**What.** Change src/core2/legislature-committees.ts so committeeForSection, COMMITTEES and committeeTopics take the chamber (its jurisdiction key and kind) and read that chamber's own committee list from a new src/core2/data/legislature/chamber-committees.json (committee id, display name key, the catalog topics, law series and budget lines it hears), and fall back to the national nine in committees.json for a chamber with no row. Pass the chamber through committeeFor in src/core2/modules/legislature.ts (line 2714) and the seating loop in src/core2/modules/leadership.ts (line 565), whose cap uses COMMITTEES.length. For Congress, build the list from data/office-day/federal-committees.json using each real committee's jurisdiction questions.

**Rules.** Replace, never layer: one reader takes the chamber and the global COMMITTEES constant is deleted, with no parallel router beside it. One rule, all 56 places: the reader names no chamber, and the data decides. An effect is a read, not a record: the routed committee is the one the leadership engine seats and whose members vote, so a different list changes a roll call. No hand-written player text: committee names are data keys that the English engine words.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose, with two seeded chamber rows in chamber-committees.json (one of 12 committees, one absent), bills in the first go to its own committees and bills in the second to the national nine, shown by bill, committee and member vote record ids; src/core2/legislature-committees.test.ts proves it and the stopgap marker stays until the data parts land.

**Files.** src/core2/legislature-committees.ts, src/core2/modules/legislature.ts, src/core2/modules/leadership.ts, src/core2/data/legislature/chamber-committees.json, src/core2/legislature-committees.test.ts

**Notes.** Oct 20 (pool feeder): part 1 of 3 of gov-stopgap-legislature-committees-assumed-data. Speed: look the chamber's list up once per session, never scan per bill per day.
