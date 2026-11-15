---
id: words-police-log-space-reads-ratio-over-near-empty-usual
title: "A one-report month in a town that almost never reports gets the police log's full space, as nine times usual"
area: words
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
source: "Interviews thread, Nov 15, 2026, tracing the Surrency police-log red on Train #9554 (29ef4685)"
root: none
---

**What.** At Surrency, Georgia (1374852, drawPlace seed pl4 "police-log", 330 played days on Train head 29ef4685), the November 2025 police log goes on the wire as nine times the town's usual: one report against a usual of 0.1 (one report in the nine closed months before it). The paper prints it word for word as headline "November police log for Surrency", lede "One crime was reported to police in Surrency in November." It prints no comparison, so a reader never sees "nine times". But the desk gives the brief its full space, the same as a truly busy month.

**Cause.** Measured: the wire row `police-log:2025-11` carries facts `vsUsual "9"`, `usual "0.1"`, `spread "0.3"`, `monthsOfRecord "9"`, `chance "0.1052"`. `vsUsual` is reported over the mean of the closed months (`policeLog` in src/core2/modules/press.ts, the `vsUsual` line), with nothing about how few reports the mean rests on. The words compare only when `monthIsWellOver` holds (chance under `briefChanceBar`). Here the chance is 0.105, so the lede says nothing of the usual, and that part is right. The space does not ask the same question: `usualSpace` in src/core2/press-desk.ts reads only the `vsUsual` ratio, and 9 is over `briefUsualCeiling`, so the brief has all its space. Two reports in ten months are not news against each other, yet the space slide treats them as the busiest month a town can have.

**Fix.** Make the space slide read the same standing the words read, the chance of a month this busy at the town's usual (the `chance` fact). A month the town's own record makes ordinary by chance then gets an ordinary month's space, and the ratio no longer counts on its own when the usual rests on a report or two. No cap or floor on the ratio: the reading changes, not a threshold. The Words lead says whether one report in a town that almost never has one should still have full space as news in itself. If so, the fix is only to name that in `usualSpace`'s comment.

**Time box.** 2 hours.

**Rules.** No dice; sliding scales, nothing flips at a threshold.

**Done when.** At Surrency (pl4) on the Train head, the November 2025 log's space comes from its chance, and the police-log slide test (Wendell pl1, Hesperia pl8) stays green. A second session plays a drawn small town for a year and sees a one-off report printed with an ordinary month's space.

**Waits on.** The Words lead's call in Fix.

**Files.** src/core2/press-desk.ts, src/core2/modules/press.ts, src/bench/printed-police-log.test.ts
