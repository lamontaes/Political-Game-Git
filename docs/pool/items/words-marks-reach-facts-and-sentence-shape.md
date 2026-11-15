---
id: words-marks-reach-facts-and-sentence-shape
title: "A mark on tone or intent reaches the lines that check the same facts or share a sentence shape"
area: words
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
after: words-spoken-marks-reach-shared-weights
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Account lead, Nov 15 05:40Z; the lead's ruling on the marks plan (marks that cannot spread get an item)
---

**What.** A spoken mark now moves a line's move pair, its bearing for the speaker's traits and its register length. It cannot move the lines that check the same facts or share a sentence shape, because the engine keeps no weight for either. The owner expects a mark on tone and intent to reach those lines too. Seen: in the grade run's report, where a mark lists no fact or shape row it moved.

**Cause.** Found in code: `calibratedVariants` (src/english/calibration.ts) weights a variant only by length, bearing and the move pair, so the calibration table has no row keyed by the facts a line requires or by its sentence shape for a mark to move.

**Fix.** Add one calibration row family the fold writes and `calibratedVariants` reads: by the facts a piece checks (its `requiresFacts` and `onlyWhen`) and by its sentence shape (sentences and whether it asks), each moved by the existing step from sound marks, TUNABLE with its spread. The Words lead rules which shapes count before it is built.

**Time box.** 6 hours for one session.

**Rules.** Replace, never layer: the new rows live in the one calibration table the fold already writes, with no second store, and marks on meaning stay rules.

**Done when.** A second session folds the Nov 15 marks and reads, for a mark on a line that checks a fact, the fact row it moved and another line checking that fact whose pick changed in a played world at a drawn place, naming the place and seed.

**Waits on.** The Words lead's ruling on which sentence shapes count.

**Files.** src/english/calibration.ts, scripts/dialogue-batch/apply-grades.ts, data/english/calibration.json
