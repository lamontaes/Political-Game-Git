---
id: table-unread-credit-books-households
title: "The credit engine writes book, household and payment rows nothing else reads"
area: world
kind: wiring
priority: 3
size: S
status: done
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

Worked Oct 17 (claude, claude/credit-unread-s5). The headless trace does not open screens, and one of the three tables is read by one. `credit/books` is read by the Money screen (`src/bench/bank.ts`, the bank's books) and by `bankPanel` in `src/core2/modules/world-panels.ts`: it stays. `credit/households` (the household's month: home costs, everyday living, paid, unpaid) and `credit/payments` (each loan payment with what was due, what was paid and the cash the borrower held) had no reader outside tests; the Money screen now shows the player's household's latest month and the latest payments on the loans it owes (`bankView` and the money section of `src/bench/play.mjs`), with its words in `src/bench/data/controls.json`. `src/bench/bank-month.test.ts` draws places until a household has paid a loan and checks the screen's numbers equal the engine's rows (seed `bm1`: Chestertown, Maryland; Mill Creek, Washington; Napi Headquarters, New Mexico are its first three draws). The trace will still list the tables until it learns that the bench's bank view reads them: add `src/bench/bank.ts` to the readers its report counts.
