---
id: office-needs-office-federal-23
title: "Needs from other sessions listed in OFFICE-FEDERAL.md (line 23): 10 lines"
area: office
kind: wiring
priority: 2
status: claimed
claimed-by: claude/office-federal-23
pr:
blocked-on:
milestone:
source: 'docs/coordination/OFFICE-FEDERAL.md "Needs from other sessions" (line 23)'
claimed-at: 2026-10-16T02:27:42.380Z
---

**What.** Ten requests remain on the federal office day: `prepareAct` for any registered kit (`SG-OFFICE-FED-prepared`), the engine's own vote reading only a bill's first chamber (a senator the player controls who leaves a House bill vote has it cast with no act on the record), a cadence for the local town hall, the Orem filing loss, federal executive orders, pardons, routing problems to members, committee seats for every member and a floor agenda, national outlets printing none of a sitting president's acts, and the journal showing nothing of taking office. Verify each on main, close what is built and split the rest. The player would notice his journal recording taking office and the press covering the president.

**Rules.** Look before you ask: search docs/ and the register for each line first; several are decided; Wire to the world: each line closes when another engine reads what it wrote in a played year, by record id; An effect is a read, not a record: outlets read the president's acts and the journal reads the office-day act record; No dice: newsworthiness and cadence follow records and traits, not a roll; One rule, all 56 places: calendars and powers are data for all 56 places' federal representation; Placeholders: SG-OFFICE-FED-prepared stays registered until `prepareAct` exists.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): each of the ten lines in `docs/coordination/OFFICE-FEDERAL.md` (Needs from other sessions, line 23) is struck with a commit or record id, or has a pool item; the journal for a player continuing as a member shows taking office, an interview and a town hall with act record ids, and a national outlet prints a presidential act. The owner plays it: reads his journal after his first week in Congress and sees what he did.

**Files.** src/core2/office-day-federal.ts, src/core2/modules/office-day.ts, src/core2/modules/press.ts, src/director/journal.ts, docs/coordination/OFFICE-FEDERAL.md

**Notes.** Overnight pool item 10: claim one list at a time. Verify.
