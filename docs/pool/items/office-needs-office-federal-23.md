---
id: office-needs-office-federal-23
title: "Needs from other sessions listed in OFFICE-FEDERAL.md (line 23): 10 lines"
area: office
kind: wiring
priority: 2
status: done
claimed-by: claude/office-federal-23
pr: #4547
blocked-on:
milestone:
source: 'docs/archive/2026-10-23/coordination/OFFICE-FEDERAL.md "Needs from other sessions" (line 23)'
claimed-at: 2026-10-16T02:27:42.380Z
---

**What.** Ten requests remain on the federal office day: `prepareAct` for any registered kit (`SG-OFFICE-FED-prepared`), the engine's own vote reading only a bill's first chamber (a senator the player controls who leaves a House bill vote has it cast with no act on the record), a cadence for the local town hall, the Orem filing loss, federal executive orders, pardons, routing problems to members, committee seats for every member and a floor agenda, national outlets printing none of a sitting president's acts, and the journal showing nothing of taking office. Verify each on main, close what is built and split the rest. The player would notice his journal recording taking office and the press covering the president.

**Rules.** Look before you ask: search docs/ and the register for each line first; several are decided; Wire to the world: each line closes when another engine reads what it wrote in a played year, by record id; An effect is a read, not a record: outlets read the president's acts and the journal reads the office-day act record; No dice: newsworthiness and cadence follow records and traits, not a roll; One rule, all 56 places: calendars and powers are data for all 56 places' federal representation; Placeholders: SG-OFFICE-FED-prepared stays registered until `prepareAct` exists.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): each of the ten lines in `docs/archive/2026-10-23/coordination/OFFICE-FEDERAL.md` (Needs from other sessions, line 23) is struck with a commit or record id, or has a pool item; the journal for a player continuing as a member shows taking office, an interview and a town hall with act record ids, and a national outlet prints a presidential act. The owner plays it: reads his journal after his first week in Congress and sees what he did.

**Files.** src/core2/office-day-federal.ts, src/core2/modules/office-day.ts, src/core2/modules/press.ts, src/director/journal.ts, docs/archive/2026-10-23/coordination/OFFICE-FEDERAL.md

**Notes.** Overnight pool item 10: claim one list at a time. Verify.

**Checked Oct 15-16 (claude/office-federal-23).** Line by line against `docs/archive/2026-10-23/coordination/OFFICE-FEDERAL.md` line 23:

- **`prepareAct` for any kit (`SG-OFFICE-FED-prepared`):** open, tracked by `office-stopgap-office-day-federal-missing-engine-hook`.
- **The engine's own vote reads only a bill's first chamber:** fixed in this PR. `ownVote` (`office-day.ts`) now looks for the player's seat in every chamber the bill crosses (`chambersOf`), so a senator the player controls casts and records a vote on a House bill. `office-day-federal.test.ts` shows it (old code: no vote act; new: one), on three drawn seeds.
- **A cadence for the local town hall:** open, no pool item; the Maine run is not reproduced here. Filed as `office-local-town-hall-cadence`.
- **The Orem filing loss:** in a PR (`gov-congress-member-files-council`, #4480).
- **Federal executive orders and pardons:** open, `office-presidential-orders-pardons-the-situation-room` and `office-stopgap-office-day-federal-president-missing-mechanic`.
- **Routing problems to members of Congress:** open, `office-casework-for-members-of-congress`.
- **Committee seats for every member and a floor agenda:** open, `office-committee-assignments-and-hearings-as-stops-and` and `office-stopgap-office-day-federal-missing-core-api` (SG-OFFICE-FED-floor-agenda).
- **National outlets print none of a sitting president's acts:** in a PR (`gov-president-not-newsworthy`, #4410).
- **The journal shows nothing of taking office:** open, `people-journal-bill-names` and the Words line cover journal lines; no item names taking office, filed as `people-journal-taking-office`.
