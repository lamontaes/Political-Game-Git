---
id: table-unread-voting-counted-places
title: "The voting engine writes counted-ballot and place rows nothing else reads"
area: gov
kind: wiring
priority: 3
size: S
status: done
claimed-by: claude/results-where-won
pr: #4947
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T18:29:37.731Z
---

**What.** In a one-year run of the played world (Parrott, Virginia (5160840), seed 0ad0af8699c4, `node --import tsx scripts/core2-year/table-trace.ts 0ad0af8699c4 365`), the voting engine writes counted-ballot and place rows that no other engine reads in the traced year: `core2-voting-v1/countedBallots` (4 rows), `core2-voting-v1/places` (400 rows). An effect is a read, so a table written and read by no other engine is a record that does nothing. Check first whether a screen reads it (the headless run does not open screens); if one does, say so in the item and close it; otherwise give the table a reader that decides something, or delete the writer and the table in the same change.

**Rules.** An effect is a read, not a record (AGENTS.md): a table nobody else reads is an unregistered placeholder until another engine reads it or it is deleted. Replace, never layer: delete the writer and the table together rather than leaving the table beside a new one. One rule, all 56 places: the check is the trace run in a drawn place with the seed named.

**Done when.** The trace report for a drawn place and a seed the builder did not choose, run with `scripts/core2-year/table-trace.ts`, no longer lists these tables as unread, because another engine reads them (named by file and line in the PR body) or because the tables and their writers are gone, and the engine's own tests pass.

**Files.** src/core2/modules/voting.ts, scripts/core2-year/table-trace.ts

**Notes.** Found by the table trace pass (core-wiring-gaps-trace-pass), report docs/reports/table-trace-2026-10-17.md.

Sent back 2026-10-17 from PR #4947 (branch claude/results-where-won): Morning check: the new place-result assertions in election-results.test.ts are nested under for (const place of race.places), with no assertion that any counted place exists. Returning places: [] for every race would bypass all new assertions and still pass. Require at least one generated counted-place result (with bounded eligible draws if needed), compare the view to the voting engine’s actual place rows, and retain the name/leader checks. Include that populated route in the screen’s browser validation.; finish on that branch, merge main into it first.
