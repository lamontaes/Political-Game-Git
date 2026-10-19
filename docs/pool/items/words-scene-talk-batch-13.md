---
id: words-scene-talk-batch-13
title: "Batch 13: the grading bench pages built on the exchange engine"
area: words
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
after: words-scene-talk-exchange-engine
source: split from words-scene-talk (L) by the claiming session, Oct 19
claimed-at:
---

**What.** Run the grading bench on the exchange engine so batch 13 shows purpose scenes composed once per personality profile, each exchange to its result. The page lists every scene with its want, stakes and result, and the data file records every line for the grade fold. Types the cached year does not fire are listed as not staged, with why.

**Rules.** No hand-written player text: every opener and reply is composed by the English engine from banked pieces in data/english/parts/. Ask why: each opener cites the record that earns it, and a talk with no record opens without a claim about the past. No dice: who says yes or no follows traits, relationships and the stakes, never a roll.

**Done when.** Running npm run words:bench on a cached played world in a drawn place builds the batch 13 page and data, a test in scripts/dialogue-batch/ shows each exchange reaching a result with its record ids, and the owner can grade the page.

**Files.** scripts/dialogue-batch/grading-bench.ts, scripts/dialogue-batch/scene-page.ts, data/english/batches/

**Notes.** Remainder of words-scene-talk after pull request 4459 (catalog of 14 types, purpose arcs, the 250-piece scene-talk bank). Build on branch words/scene-talk once it is merged.
