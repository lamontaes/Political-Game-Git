---
id: table-unread-macro-repricings
title: "The macro engine writes repricing rows nothing else reads"
area: world
kind: wiring
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** In a one-year run of the played world (Parrott, Virginia (5160840), seed 0ad0af8699c4, `node --import tsx scripts/core2-year/table-trace.ts 0ad0af8699c4 365`), the macro engine records each repricing of the economy and no other engine, screen or journal line reads it: `macro/repricings` (16 rows). An effect is a read, so a table written and read by no other engine is a record that does nothing. Check first whether a screen reads it (the headless run does not open screens); if one does, say so in the item and close it; otherwise give the table a reader that decides something, or delete the writer and the table in the same change.

**Rules.** An effect is a read, not a record (AGENTS.md): a table nobody else reads is an unregistered placeholder until another engine reads it or it is deleted. Replace, never layer: delete the writer and the table together rather than leaving the table beside a new one. One rule, all 56 places: the check is the trace run in a drawn place with the seed named.

**Done when.** The trace report for a drawn place and a seed the builder did not choose, run with `scripts/core2-year/table-trace.ts`, no longer lists these tables as unread, because another engine reads them (named by file and line in the PR body) or because the tables and their writers are gone, and the engine's own tests pass.

**Files.** src/core2/modules/macro.ts, scripts/core2-year/table-trace.ts

**Notes.** Found by the table trace pass (core-wiring-gaps-trace-pass), report docs/reports/table-trace-2026-10-17.md.

Looked at Oct 17 (claude), not built. `repricings` is read by `bankPanel` (world-panels.ts), which feeds the developer bench's world panels only, plus tests and the macro proof scripts. The line's new rate already lands on the facility itself (`repriceCreditFacility`); the table adds the meeting id that caused it. A reader that decides something would be the bank's conversation or the borrower's journal citing the meeting; otherwise the owner rules whether a developer panel counts.
