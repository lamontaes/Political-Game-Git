---
id: core-unread-outside-costs
title: "Business outside costs are written and only an audit reads them"
area: world
kind: wiring
priority: 3
size: S
status: done
claimed-by: claude/outside-costs-read
pr: #4636
blocked-on:
milestone:
source: "found by the static scan in core-wiring-gaps (Oct 15, 2026)"
claimed-at: 2026-10-16T07:48:57.516Z
---

**What.** The business engine writes an `outsideCosts` row for each month a firm pays suppliers outside the town (the good, the amount, the payee, whether it was paid in town). Only the business audit test and a proof script read them; the books view reads the flow itself. Have the books or the news read the rows, or drop the table.

**Rules.** An effect is a read, not a record: a table nobody reads is an unregistered placeholder. Replace, never layer: wire a read, or delete the writer and the table in the same change.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place) an outside-cost record id is read by the books view or another engine, or the table and its writer are gone.

**Files.** src/core2/modules/business.ts

**Notes.** Found by scanning every `.table("name")` use in `src`: the table has writes and no read in any engine. Verify against main before starting; the scan cannot see a read made through a helper that builds the table name.
