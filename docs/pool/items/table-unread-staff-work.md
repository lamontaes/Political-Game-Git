---
id: table-unread-staff-work
title: "The staff engine writes work rows nothing else reads"
area: gov
kind: wiring
priority: 3
size: S
status: in-pr
claimed-by: claude/staff-work-why
pr: #4973
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T20:35:40.910Z
---

**What.** In a one-year run of the played world (Parrott, Virginia (5160840), seed 0ad0af8699c4, `node --import tsx scripts/core2-year/table-trace.ts 0ad0af8699c4 365`), the staff engine writes its work rows and nothing reads them back: `core2-staff-v1/work` (51 rows). An effect is a read, so a table written and read by no other engine is a record that does nothing. Check first whether a screen reads it (the headless run does not open screens); if one does, say so in the item and close it; otherwise give the table a reader that decides something, or delete the writer and the table in the same change.

**Rules.** An effect is a read, not a record (AGENTS.md): a table nobody else reads is an unregistered placeholder until another engine reads it or it is deleted. Replace, never layer: delete the writer and the table together rather than leaving the table beside a new one. One rule, all 56 places: the check is the trace run in a drawn place with the seed named.

**Done when.** The trace report for a drawn place and a seed the builder did not choose, run with `scripts/core2-year/table-trace.ts`, no longer lists these tables as unread, because another engine reads them (named by file and line in the PR body) or because the tables and their writers are gone, and the engine's own tests pass.

**Files.** src/core2/modules/staff.ts, scripts/core2-year/table-trace.ts

**Notes.** Found by the table trace pass (core-wiring-gaps-trace-pass), report docs/reports/table-trace-2026-10-17.md.

**Worked Oct 17 (claude/staff-work-why).** Only staff.test.ts reads the `work` rows (`workOf`); no engine does. The row says why a task was good or poor, which is the "why" the owner's keep-it-simple rule saves only for the player and the people they deal with. `record` in staff.ts now writes the row only when `keepsWhy` says so for the official or the staffer (everyone's when bookkeeping is on); the staffer's count of tasks done is kept for everyone. A test in staff.test.ts shows an aide nobody deals with gets no new row while the count grows. Left, so this item stays open: a reader that decides something, for instance the official re-weighing a poor staffer at the next review from their tasks' quality, which is a design call about when a staffer is let go.
