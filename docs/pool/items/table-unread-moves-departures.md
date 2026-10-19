---
id: table-unread-moves-departures
title: "The moves engine writes departure rows nothing else reads"
area: people
kind: wiring
priority: 3
size: S
status: claimed
claimed-by: claude/moves-departures-read
pr: #4971
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T22:06:12.009Z
---

**What.** In a one-year run of the played world (Parrott, Virginia (5160840), seed 0ad0af8699c4, `node --import tsx scripts/core2-year/table-trace.ts 0ad0af8699c4 365`), the moves engine writes a departure row for each household that leaves and no other engine reads it: `moves/departures` (16 rows). An effect is a read, so a table written and read by no other engine is a record that does nothing. Check first whether a screen reads it (the headless run does not open screens); if one does, say so in the item and close it; otherwise give the table a reader that decides something, or delete the writer and the table in the same change.

**Rules.** An effect is a read, not a record (AGENTS.md): a table nobody else reads is an unregistered placeholder until another engine reads it or it is deleted. Replace, never layer: delete the writer and the table together rather than leaving the table beside a new one. One rule, all 56 places: the check is the trace run in a drawn place with the seed named.

**Done when.** The trace report for a drawn place and a seed the builder did not choose, run with `scripts/core2-year/table-trace.ts`, no longer lists these tables as unread, because another engine reads them (named by file and line in the PR body) or because the tables and their writers are gone, and the engine's own tests pass.

**Files.** src/core2/modules/moves.ts, scripts/core2-year/table-trace.ts

**Notes.** Found by the table trace pass (core-wiring-gaps-trace-pass), report docs/reports/table-trace-2026-10-17.md.

Looked at Oct 17 (claude, claude/departures-why), not built. The `departures` rows are read by the moves tests (moves.test.ts, moves-cash.test.ts) and by three year proofs (world-wiring-year.ts, world-economy-year.ts, moves-proof.ts, which turns bookkeeping off and still counts the rows), and no engine reads them in play. The same facts go out on the `people.moved-away` event (witnesses, the destination, the home sale), which the director and the journal can read; only the reasons by cause live on the row alone. About 16 rows a year in a town costs no memory worth trimming, so the useful change is a reader: have the director's "a neighbor moved away" scene and the journal line for a person's relative cite the departure by id and word its reasons. That is the Words and director line's, so this item waits on a director producer for `people.moved-away`.

Merged findings/prerequisites from PR #4971 on 2026-10-18; the remaining implementation is unfinished and this item stays open. Continue it on a new branch and PR.
