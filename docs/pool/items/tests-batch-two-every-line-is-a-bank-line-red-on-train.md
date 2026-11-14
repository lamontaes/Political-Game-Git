---
id: tests-batch-two-every-line-is-a-bank-line-red-on-train
title: "batch-two.test.ts 'every line is a bank line, three to a moment, each moment described' fails on the train, and so does liked-lines-kept"
area: words
kind: bug
priority: 3
size: S
status: open
claimed-by:
blocked-on:
lead: words
standard: 2
source: Account lead M2, Nov 14, gate of #9123
claimed-at:
merged-at:
---

**What.** On a full clone at train 3076c608 with nothing changed, `scripts/dialogue-batch/batch-two.test.ts` "every line is a bank line, three to a moment, each moment described" fails with "expected undefined to be 'It matters to me whoever won. I live …'", and `scripts/dialogue-batch/liked-lines-kept.test.ts` "is a piece in a bank, or a grade moved onto a live piece in a bank" fails with "graded good, and in no bank: expected [ Array(1) ] to deeply equal []".

**Cause.** Needs cause. Measured: both fail on the clean train; the batch 2 line "It matters to me whoever won. I live under what they decide" (grade file 2026-11-09-batch-2-voice.json, row 1.1) has no matching bank piece, so a piece was rewritten or removed after it was graded.

**Fix.** Find which piece replaced it, move the grade onto the live piece (liked-lines-kept allows "a grade moved onto a live piece"), then both tests pass without loosening either.

**Done when.** Both tests pass on the train with no test changed.

**Files.** data/english/grades/2026-11-09-batch-2-voice.json, scripts/dialogue-batch/liked-lines-kept.test.ts
