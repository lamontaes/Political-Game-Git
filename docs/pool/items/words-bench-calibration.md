---
id: words-bench-calibration
title: "Grades fold into a calibration table the engine reads when it composes"
area: words
kind: feature
priority: 1
size: M
status: in-pr
claimed-by: claude/words-bench-calibration
pr: #5286
blocked-on:
after: words-bench-datapoints
source: added with npm run pool -- add
claimed-at: 2026-10-19T23:33:49.661Z
---

**What.** Fold the owner's grades into a table the engine reads. `data/english/calibration.json` holds only weights, each marked TUNABLE with its spread: per trait the pull toward each bearing and toward longer or shorter lines, per register the target length in words and sentence count, per piece its running grade, and per move pair whether that arrangement read naturally. `scripts/dialogue-batch/apply-grades.ts` accepts the new shape `{"i","line","axes":{...},"note","prefer"}` (axes: naturalness, prose, sentence structure, length, creativity, trait fit, lie plausibility, each 1 to 5) beside the old shapes and moves the weights a small step per grade. The engine reads the table when it chooses and arranges pieces (`src/presentation/english-composition.ts`) and ranks replies (`src/director/conversation.ts`). The player would notice wording that improves across the board after a grade, not line by line.

**Rules.** No scenario text, no scene script, no if-this-town-then-that: only weights the engine reads when it chooses and arranges pieces; an effect is a read, not a record: a grade that changes nothing is a placeholder; every number tagged TUNABLE with its spread; no dice; no hand-written player text.

**Done when.** In a one-year `buildBenchWorld` run in a place drawn from all 56 (name it and the seed), one line's wording differs before and after a grade, named by the piece ids, the grade axis and the scene's record ids, shown by a test in `scripts/dialogue-batch/` that applies a grade and recomposes; `data/english/calibration.json` parses and every weight carries its spread.

**Files.** data/english/calibration.json (new), scripts/dialogue-batch/apply-grades.ts, src/presentation/english-composition.ts, src/director/conversation.ts

**Notes.** Part of words-grading-bench. Needs data points from words-bench-datapoints to grade.
