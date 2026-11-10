---
id: core-long-run-election-and-term-rows-part-4-readers
title: "Card, trace, press and results read folded ids"
area: core
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
after: core-long-run-election-and-term-rows-part-1-terms-fold, core-long-run-election-and-term-rows-part-2-outside-races, core-long-run-election-and-term-rows-part-3-played-place
blocked-on:
lead: speed
source: split from core-long-run-election-and-term-rows in the pool redo, Nov 10, 2026
standard: 2
model: sonnet
effort: medium
root: rc5-full-detail-every-day
checked: fable 2026-11-10
---

**What.** Once terms and races fold, every reader that holds an old id must still get an answer: the person card's past offices, the dev trace, the press desk and printed words, /api/results for an old night, recalls and candidate identity. The reader map in the Notes lists them; the CTO ruled the folded-id question in OWNER-DECISIONS (Nov 1 23:40) with four conditions. Two flaws found outside the fold are fixed here too.

**Cause.** Found in code: src/bench/legislature.ts, src/core2/modules/voting.ts and src/core2/modules/offices.ts read terms and races by id; the Notes of core-long-run-election-and-term-rows list the readers with file and line, and that the press desk's `holdsHighOffice` (src/core2/press-desk.ts line 587) and the recall check read the term named by an official's own id, which has ended after a re-election.

**Fix.** Move each reader in the Notes' map to termById and careerOf and to the summaries, resolve a folded id to its seat's summary as the CTO's four conditions say, and fix the re-election flaw by reading the serving term.

**Time box.** 4 hours for a Sonnet session.

**Rules.** Speed (owner, Oct 29; OWNER-DECISIONS Oct 30 01:55): years 97 to 100 of a save hold at most 1.2 times the records of years 1 to 4, and old records fold into summaries once play no longer reads them. Folds are built once each reader's window is agreed with its owner (CTO, Oct 30 04:14): the laws lead owns the world's governing, the governing lead owns voting and the player's path. The world has a past (owner): officials keep voting records and the prior election exists, so what running on the record reads must stay.

**Done when.** A second session, in a drawn place after four played years (place and seed named), opens the person card of an official whose terms were folded, runs Trace on a folded term id and a folded race id, and opens an old night's results, and sees each answer instead of a missing record. The records proof is identical outside the folded tables.

**Waits on.** The three fold parts of this item merged.

**Files.** src/bench/legislature.ts, src/core2/modules/voting.ts, src/core2/modules/offices.ts, src/core2/press-desk.ts, src/bench/dev-trace.ts, src/bench/card.ts
