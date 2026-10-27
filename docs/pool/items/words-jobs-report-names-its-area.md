---
id: words-jobs-report-names-its-area
title: "A jobs report's headline names the area the rate measures, not the town"
area: words
kind: bug
priority: 1
size: S
status: done
claimed-by: words/jobs-report-scope
pr: #6315
blocked-on:
source: "words-and-scenes lead, Oct 27: opening-unemployment-scope red on main (seed 061786366f01af27)"
lead: words
milestone: play-first
claimed-at: 2026-10-27
---

**What.** The printed-news headline "{place} unemployment at {percent}" also matches the opening's jobs story. That story's place is the town and its rate is the region's, so La Grange, Tennessee read "La Grange unemployment at 4.0" for the Memphis area's rate. That is a wrong claim on the first screen of the game, and `opening-unemployment-scope.test.ts` is red on main for that seed.

**Rules.** Ask why: a figure is told under the area it measures. No hand-written player text in code: the fix is in the bank's slots and the builder's facts. One rule, all 56 places: the area comes from the regional engine's record.

**Done when.** Every jobs-report piece names `{area}`, never `{place}`. The state jobs report fills `area` with the state. `opening-unemployment-scope.test.ts` passes with seed `061786366f01af27` (La Grange, Tennessee, in a buildBenchWorld drawn place), and `printed-words.test.ts` and `english-parts-banks` pass.

**Time box.** 1 hour.

**You will see.** On the opening night in La Grange, Tennessee: "Unemployment in the Memphis area at 4.0".

**Screenshot.** None: a headline's words; the test reads the composed text.

**Files.** data/english/parts/headlines.json, data/english/parts/news.json, src/bench/printed-words.ts

**Notes.** Found while checking `words-federal-question-names`. The opening's percent fact has no percent sign ("4.0"); that is the director's fact format, noted for the director engineer.
