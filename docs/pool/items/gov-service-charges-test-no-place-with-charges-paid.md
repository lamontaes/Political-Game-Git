---
id: gov-service-charges-test-no-place-with-charges-paid
title: "service-charges: twelve draws find no place whose households paid charges"
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

**What.** src/core2/service-charges.test.ts fails by draw on the clean train: it draws twelve places and none has households that paid at least 85 percent of their living costs with charges in the budget, so it throws and checks nothing. Guards: the charges the town's treasury page shows for what other service users pay, so the page and the engine agree.

**Cause.** Measured: on the clean train 8bb1ff9d, GOLDEN_PATH_SEED=25fc687ba465a50904a4e11c9f689544 gives 'no place with charges paid in 12 draws' (src/core2/service-charges.test.ts line 208). Reproduced twice on the clean train, so it is the seed, not this change. Which of the twelve draws failed which test (no charges, or the 85 percent rule) is not yet written down.

**Fix.** Pin the test to named places and fixed seeds (skill pinned-tests) instead of waiting on twelve draws, and find why households at drawn places pay under 85 percent of living costs if that is the failing gate: that is the world's households short of cash on the 1st, an engine question.

**Time box.** 3 hours for one opus session.

**Rules.** No dice. Pinned places and fixed seeds in the test; never loosen an assertion to get green.

**Done when.** A second session runs the test at the named places and seeds above and in a drawn place and seed it did not choose, sees it pass for the reason the fix names, and the player sees the same charges the test reads (the town's treasury page for charges).

**Waits on.** Nothing.

**Files.** src/core2/service-charges.test.ts

**Notes.** Found while building PR #9308 (fee levels by bill). Red on the clean train head 8bb1ff9d as well as on that PR.
