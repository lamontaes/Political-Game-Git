---
id: test-bill-section-cite-played-352-seconds-staged-at-pinned-places
title: "The bill-section cite test played 352 seconds on a drawn place and was red on the train"
area: gov
kind: bug
priority: 3
size: S
status: in-pr
claimed-by:
pr: 9402
blocked-on:
standard: 2
model: sonnet
effort: low
lead: governing
root: none
source: Account lead cluster 11, Nov 15 (src/core2/bill-section-cite.test.ts red on the clean train and 352 s long)
claimed-at:
after:
checked:
---

**What.** `src/core2/bill-section-cite.test.ts` drew a place and played days until a law row appeared, took 352 seconds and was red on the clean train. Guards: the bill paper's cited amount.

**Cause.** Found in code: src/core2/bill-section-cite.test.ts drew its place with `drawPlace` and advanced the core by played days to wait for a bill to be enacted, then compared the cite to the wrong row where the federal and the local amount tie (`billValueInForce` keeps federal on a tie).

**Fix.** Pin Dale City VA and Rhinelander WI, start from the row `billValueInForce` returns, and stage the enactment through `enactLaw`, so no played days are needed.

**Time box.** 1 hour.

**Rules.** Pinned places, fixed seeds, no draw loops.

**Done when.** The test passes at both pinned places in about 30 seconds each and fails if the cite names a row other than the one in force; a second session sees the same cited amount on the bill paper in the running game, in a drawn place and seed nobody chose.

**Waits on.** Nothing.

**Files.** src/core2/bill-section-cite.test.ts
