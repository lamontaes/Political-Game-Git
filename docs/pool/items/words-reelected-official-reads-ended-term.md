---
id: words-reelected-official-reads-ended-term
title: "A re-elected official's profile and the press desk read the term that ended at the re-election"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** press-desk.ts holdsHighOffice (about lines 585-595) and printed-words.ts officeOf (about 350-357) and termOf (about 1213) read the term named by the official's own id (official:<termId>). After a re-election that term has ended and a new serving term holds the seat, so holdsHighOffice returns false for a re-elected official and a profile reads the old term. recalls.ts:208-215 has the same flaw and is asked of the laws lead separately. Found by the speed lead's reader map of office terms on Nov 1 (main 24cebf2761).

**Rules.** The simulation is the one layer that knows anything, and every story and profile is a view of the same records: a view must read the official's serving term, not the term their id was minted from. One rule, all 56 places: the reader finds the serving term by person or seat, never by a place named in code.

**Done when.** In a played world (buildBenchWorld) in a place drawn from all 56, named with its seed, a test re-elects an official who is not filled in, then shows holdsHighOffice true for them and the printed profile naming the new term by record id; with the old read put back, the test fails.

**Files.** src/core2/press-desk.ts,src/bench/printed-words.ts

**Notes.** lead: words. Words asked for it on Nov 1, 23:54 UTC, to take after its current order. When the office-terms fold (core-long-run-election-and-term-rows) lands, these reads go through its termById resolver.
