---
id: realistic-not-real-test-reference-population-published-by-draw
title: "realistic-not-real: a town's reference population opens on its published value at one draw"
area: gov
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: filed by hand on branch claude/project-thread-xy4wd4 (cluster 13, PR #9308)
after:
lead: governing
standard: 2
model: opus
effort: medium
root: none
---

**What.** src/core2/realistic-not-real.test.ts fails by draw on the clean train: a town's reference population opens on its published value and the schools people went to are not their world's own, so audit rows 28 and its neighbor are red at that draw. Guards: the realistic-not-real test's audit row 28 and the schools row, run at the named place and seed.

**Cause.** Measured: on the clean train 8bb1ff9d, with the seed REALISTIC_SEED=218f5d0d1d0c24e8, Highgate Springs, Vermont (5033325): "referencePopulation: published: expected 1 not to be 1" in "the town's population (audit row 28)", and a second red in "the schools people went to are their world's own". It reproduced on the clean train and on the PR head alike, and does not touch charges or fees. Not yet traced to the line that holds the value at 1.

**Fix.** Find why a place of that size keeps the published reference population of 1 (a place with a published count of one person may be a true reading, in which case the test needs a floor that says why) and fix the engine or the test, pinned to this place and seed.

**Time box.** 2 hours for one opus session.

**Rules.** No dice. Pinned places and fixed seeds in the test; never loosen an assertion to get green.

**Done when.** A second session runs the test at the place and seed named above and in a drawn place and seed it did not choose, and sees it pass for the reason the fix names.

**Waits on.** Nothing.

**Files.** src/core2/realistic-not-real.test.ts

**Notes.** Found while building PR #9308 (fee levels by bill). It passed on the clean train e24cb825 at the draw that run took.
