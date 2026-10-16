---
id: core-unread-carry-requests
title: "Carry requests are written and nothing reads them"
area: gov
kind: wiring
priority: 3
size: S
status: done
claimed-by: claude/carry-requests-read
pr: #4631
blocked-on:
milestone:
source: "found by the static scan in core-wiring-gaps (Oct 15, 2026)"
claimed-at: 2026-10-16T07:34:58.088Z
---

**What.** Every time an executive asks a member to carry a bill, `carryRequest` in `legislature.ts` writes a row to the `carryRequests` table (the asker, the member, the position, the standing, whether it was carried and the bill id). No engine, screen or test reads the table. The bill already carries `requestedBy`. Either have the director or the member's later vote read the row (a member who carried a bill for an executive is asked about it, or owes a favor), or delete the table and keep the returned row only.

**Rules.** An effect is a read, not a record: a table nobody reads is an unregistered placeholder. Replace, never layer: wire a read, or delete the writer and the table in the same change.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place) a carry request's record id is read by the named reader, or the table is gone and the legislature test still passes.

**Files.** src/core2/modules/legislature.ts

**Notes.** Found by scanning every `.table("name")` use in `src`: the table has writes and no read in any engine. Verify against main before starting; the scan cannot see a read made through a helper that builds the table name.
