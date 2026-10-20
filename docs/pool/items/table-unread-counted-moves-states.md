---
id: table-unread-counted-moves-states
title: "The counted-moves engine writes pull, state and move rows nothing else reads"
area: core
kind: wiring
priority: 3
size: S
status: in-pr
claimed-by: claude/moves-unread
pr: #4978
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T16:19:13.942Z
---

**What.** In a one-year run of the played world (Parrott, Virginia (5160840), seed 0ad0af8699c4, `node --import tsx scripts/core2-year/table-trace.ts 0ad0af8699c4 365`), the counted-moves engine writes each month's pulls, state rows and household moves and no other engine reads them in the traced year: `core2-counted-moves-v1/moves` (140 rows), `core2-counted-moves-v1/pulls` (62 rows), `core2-counted-moves-v1/states` (56 rows). An effect is a read, so a table written and read by no other engine is a record that does nothing. Check first whether a screen reads it (the headless run does not open screens); if one does, say so in the item and close it; otherwise give the table a reader that decides something, or delete the writer and the table in the same change.

**Rules.** An effect is a read, not a record (AGENTS.md): a table nobody else reads is an unregistered placeholder until another engine reads it or it is deleted. Replace, never layer: delete the writer and the table together rather than leaving the table beside a new one. One rule, all 56 places: the check is the trace run in a drawn place with the seed named.

**Done when.** The trace report for a drawn place and a seed the builder did not choose, run with `scripts/core2-year/table-trace.ts`, no longer lists these tables as unread, because another engine reads them (named by file and line in the PR body) or because the tables and their writers are gone, and the engine's own tests pass.

**Files.** src/core2/modules/counted-moves.ts, scripts/core2-year/table-trace.ts

**Notes.** Found by the table trace pass (core-wiring-gaps-trace-pass), report docs/reports/table-trace-2026-10-17.md.

Done Oct 17 (claude, PR 4897): the `states` table is deleted with its writer; the regional economy reads the same figures from the engine's running totals (`rt.totals`), and nothing read the table. The `moves` and `pulls` tables stay: `countedMoves` and `countedPull` are the answer to why a counted household moved and what pulled its group, and are read by `scripts/core2-year/one-model-proof.mjs` and the engine's tests; no screen reads them yet, so the PR body asks the CTO whether the trace should count a proof script as a reader.
Sent back 2026-10-17 from PR #4978 (branch claude/counted-moves-unread-tables): The new bookkeeping-only move ledger breaks the counted-town regression now merged on main (#4877): counted-moves-town.test.ts explicitly disables bookkeeping, reads countedMoves(...), and requires a recorded departure. record() now returns before writing every such row. Update that ledger consumer to enable bookkeeping while preserving its departure assertions, and audit the other direct move-ledger consumers for the same mismatch before merging main and rerunning changed-file checks.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #4978 (branch claude/counted-moves-unread-tables): merging main still conflicts in src/core2/modules/counted-moves.ts; finish on that branch, merge main into it first.
