---
id: core-executive-desk-twin-deleted
title: "The executive's own desk table, read only by two functions nothing calls, is deleted beside the legislature's desk"
area: core
kind: cleanup
priority: 2
size: S
status: done
claimed-by: claude/dup-desk-decision
pr: #6465
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T01:00:39.541Z
---

**What.** The executive module kept its own desk table of every bill on an executive's desk, filled by a legislature hook. Only decideOnDesk and deskOf read it, and nothing calls either; the live desk is office-day's decideDesk, which reads the bill's own status and records the act. The table is a record nobody reads beside the real one (duplicates report row C10).

**Rules.** An effect is a read, not a record: a table no engine reads is an unregistered placeholder, so the table, its writer, the hook registration and the two dead readers go in one change.

**Done when.** In a played world (buildBenchWorld) in a place drawn from all 56, a year of bills still reaches the executive and is signed, vetoed or overridden through executiveDecision, named by record id, executive.test.ts and office-day-desk.test.ts pass, and grep finds no decideOnDesk, deskOf or desk table.

**Files.** src/core2/modules/executive.ts

**Notes.** TODO
