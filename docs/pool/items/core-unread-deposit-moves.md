---
id: core-unread-deposit-moves
title: "Bank deposit moves are written and only a proof script reads them"
area: world
kind: wiring
priority: 3
size: S
status: done
claimed-by: claude/deposit-moves-unread
pr: #4635
blocked-on:
milestone:
source: "found by the static scan in core-wiring-gaps (Oct 15, 2026)"
claimed-at: 2026-10-16T07:40:43.252Z
---

**What.** The credit engine writes a `depositMoves` row for every move of a household or business into or out of a bank deposit (cash before, reserve, deposit before and after, the amount requested). Only `scripts/world-proofs/session-b-deposits.ts` reads them. Have the reader that needs them (the bank's lending room, the household's money panel) read the rows, or drop the table.

**Rules.** An effect is a read, not a record: a table nobody reads is an unregistered placeholder. Replace, never layer: wire a read, or delete the writer and the table in the same change.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place) a deposit move's record id is read by an engine or screen, or the table and its writer are gone.

**Files.** src/core2/credit-deposits.ts, src/core2/modules/credit.ts

**Notes.** Found by scanning every `.table("name")` use in `src`: the table has writes and no read in any engine. Verify against main before starting; the scan cannot see a read made through a helper that builds the table name.
