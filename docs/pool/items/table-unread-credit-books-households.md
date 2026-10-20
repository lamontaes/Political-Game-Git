---
id: table-unread-credit-books-households
title: "The credit engine writes book, household and payment rows nothing else reads"
area: world
kind: wiring
priority: 3
size: S
status: in-pr
claimed-by: claude/credit-unread-s5
pr: #4979
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T21:00:13.524Z
---

**What.** In a one-year run of the played world (Parrott, Virginia (5160840), seed 0ad0af8699c4, `node --import tsx scripts/core2-year/table-trace.ts 0ad0af8699c4 365`), the credit engine keeps its books, the household credit rows and its payments, and only tests and its own file read them: `credit/books` (13 rows), `credit/households` (363 rows), `credit/payments` (26 rows). An effect is a read, so a table written and read by no other engine is a record that does nothing. Check first whether a screen reads it (the headless run does not open screens); if one does, say so in the item and close it; otherwise give the table a reader that decides something, or delete the writer and the table in the same change.

**Rules.** An effect is a read, not a record (AGENTS.md): a table nobody else reads is an unregistered placeholder until another engine reads it or it is deleted. Replace, never layer: delete the writer and the table together rather than leaving the table beside a new one. One rule, all 56 places: the check is the trace run in a drawn place with the seed named.

**Done when.** The trace report for a drawn place and a seed the builder did not choose, run with `scripts/core2-year/table-trace.ts`, no longer lists these tables as unread, because another engine reads them (named by file and line in the PR body) or because the tables and their writers are gone, and the engine's own tests pass.

**Files.** src/core2/modules/credit.ts, scripts/core2-year/table-trace.ts

**Notes.** Found by the table trace pass (core-wiring-gaps-trace-pass), report docs/reports/table-trace-2026-10-17.md.
