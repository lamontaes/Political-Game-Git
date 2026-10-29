---
id: core-town-lean-read-once
title: "The town's lean has one reader, not seven copies of the same lookup in seven engines"
area: core
kind: cleanup
priority: 2
size: S
status: done
claimed-by: claude/dup-town-lean
pr: #6469
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T01:21:01.644Z
---

**What.** Seven engines each carried their own copy of the function that reads the town's lean from the campaigns engine's town row: campaign stances, ballot measures, the legislature, recalls, staff, world legislating and voting (with its own daily cache). The campaigns engine writes the row once at the opening; seven readers of one fact means seven places to drift (duplicates report row C5).

**Rules.** Replace, never layer: one exported townLean in the campaigns engine, which owns the town row, replaces the seven copies in the same change; no alias is left behind, and every engine reads the same value.

**Done when.** In a played world (buildBenchWorld) in a place drawn from all 56, a year of bills, votes, recalls, seatings and results is identical on main and on this branch by a fingerprint of their record ids and facts, the recall, ballot measure and stance tests pass, and grep finds one function named townLean in src/core2.

**Files.** src/core2/modules/campaigns.ts, src/core2/modules/voting.ts, src/core2/modules/legislature.ts, src/core2/modules/recalls.ts, src/core2/modules/staff.ts, src/core2/modules/world-legislating.ts, src/core2/modules/ballot-measures.ts, src/core2/campaign-stances.ts

**Notes.** TODO
