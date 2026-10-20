---
id: words-grading-bench
title: "Order 2: the grading bench, every line a data point"
area: words
kind: feature
priority: 1
size: L
status: open
claimed-by:
pr:
blocked-on:
milestone:
after: words-bench-datapoints, words-bench-page
source: "words-and-director order 2"
claimed-at: 2026-10-16T04:16:33.604Z
---

**What.** The owner grades single batches by hand, and each grade fixes one line instead of the engine. Build `scripts/dialogue-batch/grading-bench.ts` (beside the existing `grading-batch.ts`): over one cached played world, stage every situation the records fire through the director, compose it through the real engine once per personality profile, record every line as a data point, render `docs/grading/words-batch-12.md`, and fold the owner's axis grades into `data/english/calibration.json`, which the engine reads. This also absorbs the two defect fixes of the closed words-batch-12 item: the 'My daughter was born. My daughter was born.' chapter and the roll-call family scene staged in a neighbor's household. The player would notice wording that improves across the board after a grade, not line by line.

**Rules.** No hand-written player text: the words come from the English engine's banks in `data/english/parts/`, authored with `origin: authored`, author and date or mined from public-domain sources with the source recorded; nothing is typed into code or a screen; American English: spellings follow `tests/american-english-sweep.test.ts` (run `npm run spelling`); Speed: the bench reuses one cached world and adds no new world run; one run, one number; No dice: profiles vary by personality traits, never a roll; only weights the engine reads change; An effect is a read, not a record: `data/english/calibration.json` is read by the composer when it renders, so a grade that changes nothing is a placeholder; Ask why: every line is traceable to the pieces and records that made it; Replace, never layer: no scenario text or scene script is added; any stand-in is deleted; Look before you ask: the 'Batch 12 must' rulings in OWNER-DECISIONS.md stand; read them first; One rule, all 56 places: the place is drawn from all 56 and named.

**Done when.** At least 150 distinct items in `docs/grading/words-batch-12.md`, every line traceable to bank pieces and records by id, and one line whose wording changed because of a grade, named by record id and the grade axis. In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body); tests in `scripts/dialogue-batch/` and `tests/english-parts-banks.test.ts`. The owner plays it: grades thirty different moments and sees the next batch word them differently.

**Files.** scripts/dialogue-batch/grading-batch.ts, scripts/dialogue-batch/coverage-table.ts, src/director/scene.ts, src/english/english-composition.ts, data/english/calibration.json (new)

**Notes.** Spec: Order 2 of docs/work-orders/words-and-director-2026-10-15.md.
Absorbs words-batch-12 (dropped as a duplicate as of 2026-10-15). Size L: the claiming session splits it into sub-items in the pool before building. Blocked-on words-catalog-coverage is done (#4398).

Split 2026-10-16 into words-bench-defects, words-bench-stage, words-bench-compose, words-bench-datapoints, words-bench-page and words-bench-calibration; this item closes when all six are done and the owner has graded the page.

Oct 20: The Oct 16 claim has no PR and is over two days old, so the claim is cleared.

Oct 20: Switched from blocked to the automatic after: gate on words-bench-datapoints, words-bench-page, so it opens by itself the moment those items are done.
