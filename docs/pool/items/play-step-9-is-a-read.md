---
id: play-step-9-is-a-read
title: "Golden path step 9 counts only when another engine read the new law, by record id"
area: play
kind: wiring
priority: 2
size: S
status: in-pr
claimed-by: claude/step9-read-s8
pr: #5137
after:
blocked-on:
source: "audit Oct 19, Part B step 9 and Part A 'What it fakes' 1"
claimed-at: 2026-10-19T20:03:40.389Z
---

**What.** In `src/bench/reached.ts` step 9 ("the town visibly changes") counts when a law-took-effect event exists. An event is a record, not an effect; the step is meant to show that a different engine read the law and something moved. Step 9 is counted only when a record from another engine cites the law as its why: a payroll line at the new wage, a permit refused under the new rule, a budget line moved by it. "Took effect" alone no longer counts, and the report prints the reading record.

**Rules.** An effect is a read, not a record: the law counts as reaching the town only when another engine's record cites it. Ask why: the report names the record that read the law and what it changed, not an event flag.

**Done when.** The check in a drawn place with `buildBenchWorld` reports step 9 with the record id of the read (the engine, the record, the amount or rule it changed) and no place counts step 9 on the took-effect event alone; a test under `tests/golden-path/` builds a law with no reader and asserts step 9 is not reached. The owner plays it: after his law passes, he can see what it changed.

**Files.** src/bench/reached.ts, src/bench/path-check.ts, tests/golden-path/

**Notes.** Child of play-golden-path-one-life; can land first on its own.
