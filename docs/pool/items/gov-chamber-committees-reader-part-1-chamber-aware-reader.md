---
id: gov-chamber-committees-reader-part-1-chamber-aware-reader
title: "Committee reader takes the chamber and falls back to the national nine"
area: gov
kind: feature
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: opus
effort: high
root: rc9-place-facts-one-default
source: split from gov-chamber-committees-reader in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Make the committee reader chamber-aware. `committeeForSection`, `COMMITTEES` and `committeeTopics` in `src/core2/legislature-committees.ts` take the chamber (its jurisdiction key and kind) and read that chamber's own list from a new `chamber-committees.json` (committee id, display name key, the catalog topics, law series and budget lines it hears), and fall back to the nine in `committees.json` for a chamber with no row. Pass the chamber through `committeeFor` in `src/core2/modules/legislature.ts` and the seating loop in `src/core2/modules/leadership.ts` (its cap, `COMMITTEES.length`, becomes the chamber's own count). The file starts with no real rows; the test seeds two.

**Cause.** Found in code: `src/core2/legislature-committees.ts` `COMMITTEES` (line 20) is a module constant of nine ids read by `committeeFor` (`src/core2/modules/legislature.ts`, line 4081) and by the seating cap in `src/core2/modules/leadership.ts` (line 533); stopgap `SG-GOV-committee-names-national` (line 18).

**Fix.** Change the reader to take the chamber and look the list up once per session; add the empty `chamber-committees.json` with its row shape; delete the global `COMMITTEES` constant and update every reader; keep the stopgap marker until the data parts land.

**Time box.** 6 hours for one opus session.

**Rules.** Replace, never layer: the global `COMMITTEES` constant is deleted with no parallel router. One rule, all 56 places: the reader names no chamber. An effect is a read, not a record: the leadership engine seats the routed committee. Speed: one lookup per chamber per session.

**Done when.** A second session runs `src/core2/legislature-committees.test.ts` and a one-year world (`buildBenchWorld`) in a place drawn from all 56 (seed named) with two seeded chamber rows, one of 12 committees and one absent, and sees bills in the first go to its own committees and bills in the second to the national nine, shown by bill, committee and member vote record ids.

**Waits on.** Nothing.

**Files.** src/core2/legislature-committees.ts, src/core2/modules/legislature.ts, src/core2/modules/leadership.ts, src/core2/data/legislature/chamber-committees.json (new), src/core2/legislature-committees.test.ts

**Notes.** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). A chamber-aware reader exists only to read per-chamber lists nobody sees; the nine work.
