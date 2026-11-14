---
id: tests-batch-two-every-line-is-a-bank-line-red-on-train
title: "Two dialogue-batch tests are red on the train: a batch 2 line and a liked line have no live bank piece"
area: words
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: Account lead M2, Nov 14, gate of #9123
lead: words
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** On a full clone at train 3076c608 with nothing changed, `scripts/dialogue-batch/batch-two.test.ts` "every line is a bank line, three to a moment, each moment described" fails with "expected undefined to be 'It matters to me whoever won. I live …'", and `scripts/dialogue-batch/liked-lines-kept.test.ts` "is a piece in a bank, or a grade moved onto a live piece in a bank" fails with "graded good, and in no bank: expected [ Array(1) ] to deeply equal []".

**Cause.** Needs cause. Measured: both fail on the clean train; the first names a batch 2 line, "It matters to me whoever won. I live under what they decide", with no matching bank piece. Likely a piece rewritten or removed after it was graded.

**Fix.** None until the cause is found.

**Time box.** 2 hours for a Sonnet session.

**Rules.** Never loosen either test and never delete a piece graded good (`liked-lines-kept.test.ts`).

**Done when.** A second session runs both test files on the train and sees them pass with no test changed; in a drawn place (a place and seed the builder did not choose) it then plays a scene that uses the graded piece in the running game. Seen: the replayed scene shows the graded line.

**Waits on.** Nothing.

**Files.** data/english/grades/2026-11-09-batch-2-voice.json, scripts/dialogue-batch/liked-lines-kept.test.ts, scripts/dialogue-batch/batch-two.test.ts

**Notes.** Reproduce: `npx vitest run scripts/dialogue-batch/batch-two.test.ts scripts/dialogue-batch/liked-lines-kept.test.ts`.
