---
id: words-bench-datapoints
title: "Every line the bench composes is a data point, deduped, in batch-12.json"
area: words
kind: feature
priority: 1
size: M
status: claimed
claimed-by: claude/words-bench-datapoints
pr:
blocked-on:
after: words-bench-compose
source: added with npm run pool -- add
claimed-at: 2026-10-19T23:11:26.070Z
---

**What.** Make every composed line a data point and drop repeats. For each line record: move, register, bearing, key, the speaker's traits, lie or not, length in words, sentence count, the ids of the pieces used, and the record ids that filled the slots. Write `data/english/batches/batch-12.json`, one row per line grouped by item, with the item's situation type, cast record ids, profile and the cause record that fired it. Dedupe: no two items share (situation type, cast, pieces used); a profile that reads identically to another on one scene is dropped; no two choice sets share the same four replies; a situation type appears at most 3 times per profile (`--max-per-type`); a phrase appears once; the bench prints the count dropped under each rule.

**Rules.** No hand-written player text: every word comes from the English engine's banks in `data/english/parts/`, nothing is typed into code or a screen; no dice: profiles vary by traits, never a roll; one rule, all 56 places: the place is drawn from all 56 and named; American English (`npm run spelling`); speed: the bench reuses one cached world and adds no new world run. Ask why: every row answers why by piece and record id; one run, one number.

**Done when.** At least 150 distinct items in `data/english/batches/batch-12.json` from one cached year in a place drawn from all 56 (name it and the seed), no two sharing situation type, cast and pieces, every row with its piece ids and record ids resolving, and the dropped counts printed; tests in `scripts/dialogue-batch/` for each dedupe rule.

**Files.** scripts/dialogue-batch/grading-bench.ts, data/english/batches/batch-12.json (new), scripts/dialogue-batch/repetition-guard.ts

**Notes.** Part of words-grading-bench. Takes composed scenes from words-bench-compose.
