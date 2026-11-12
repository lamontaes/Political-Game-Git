---
id: core-long-run-tables-grow-with-history-part-4-whole-save-check
title: "Whole-save check: years 17 to 20 run as fast as years 1 to 4"
area: core
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
after: core-long-run-tables-grow-with-history-part-1-campaign-tables, core-long-run-tables-grow-with-history-part-2-durable-log-and-speech, core-long-run-election-and-term-rows
blocked-on:
lead: speed
source: split from core-long-run-tables-grow-with-history in the pool redo, Nov 10, 2026
standard: 2
model: sonnet
effort: medium
root: rc5-full-detail-every-day
checked: fable 2026-11-10
---

**What.** After the folds land, one run of a whole save must show the rule the owner set on Oct 29: year 100 runs as fast as year 1. Run twenty years of the played world in two drawn places and compare years 17 to 20 against years 1 to 4 in seconds, heap after a collection and records kept. File an item for any table still growing. Feeds: core-long-run-tables-grow-with-history (the one run that shows year 100 runs as fast as year 1).

**Cause.** Measured: `npm run speed:year -- --seed long-1 --years 100` (Ringgold, Louisiana) before the folds: years 1 to 6 take 42, 60, 135, 168, 162 and 161 seconds. The runner is scripts/speed-years/run.ts.

**Fix.** Run the check after the other parts merge, one process at a time (skill heavy-runs), and file a pool item naming each table that still grows.

**Time box.** 3 hours for a Sonnet session.

**Rules.** Speed and the Oct 29 22:45 ruling (a country's year, for hundreds of years). Replace, never layer: a fold replaces the rows it summarizes. Whatever play reads (a screen, a decision, the director, the journal, the trace) still reads the same answer from the summary. Ask why: the player's own records and the people they deal with keep their reasons.

**Done when.** A second session runs `npm run speed:year -- --seed long-1 --years 20` and a second drawn place and sees the average of years 17 to 20 at most 1.2 times the average of years 1 to 4 in seconds, heap after a collection and records kept, with the tables that still grow listed.

**Waits on.** The other parts of core-long-run-tables-grow-with-history merged.

**Files.** scripts/speed-years/run.ts
