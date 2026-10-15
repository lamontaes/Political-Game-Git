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
blocked-on: "words-authored-pieces-gate"
milestone:
source: "words-and-director order 2"
---

**What.** `scripts/dialogue-batch/grading-bench.ts`: over one cached played world, stage every situation the records fire through the director, compose it through the real engine once per personality profile, record every line as a data point, render `docs/grading/words-batch-12.md`, and fold the owner's axis grades into `data/english/calibration.json`, which the engine reads.

**Rules.** No new world runs. No scenario text, no scene script; only weights the engine reads. The "Batch 12 must" rulings stand.

**Done when.** At least 150 distinct items, every line traceable to pieces and records, and one line whose wording changed because of a grade, named by record id.

**Files.** scripts/dialogue-batch/, src/director/, src/presentation/english-composition.ts, data/english/

**Notes.** Spec: Order 2 of docs/work-orders/words-and-director-2026-10-15.md.
