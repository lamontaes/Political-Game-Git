---
id: people-unplanned-exposure-calibration
title: "Calibrate the unplanned-pregnancy exposure against the real rate in played years"
area: people
kind: research
priority: 3
size: M
status: done
claimed-by:
pr: #5788
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The renewal engine's renewalUnplannedExposure (0.5, TUNABLE, spread unmeasured) gives almost no full-tier unplanned pregnancies: three drawn towns played a year each with 28 waiting couples between them and none had one. Guttmacher puts unintended pregnancies at about 4 in 100 women aged 15 to 44 a year. Play a batch of drawn towns for a year, compare the town's unplanned total (full and counted) with that rate times its women, and set the parameter and its spread from the comparison.

**Rules.** Research before building: the published rate checks the town's total and never picks a couple. Estimate, never UNKNOWN: the parameter keeps a labeled spread from the measured batch.

**Done when.** In at least six drawn places, each a one-year played world built with buildBenchWorld, the unplanned total per 100 women 15 to 44 falls within the parameter's recorded spread around the fetched Guttmacher rate; the parameter row names the source with a quote and the measured spread, and the PR names each place and seed.

**Files.** src/core2/data/renewal/parameters.json, src/core2/births-unplanned.ts, data/research/people/

**Notes.** Found while repairing src/core2/renewal.test.ts on PR #5749: Hopkins SC, Yuba WI and Tamuning GU (seed probe1) had 12, 2 and 14 couples and 0 unplanned in a year.

Sent back 2026-10-23 from PR #5788 (branch claude/unplanned-exposure-calibration): the PR targets main while parents 5757, 5749 and 5695 are still open; its integrated diff includes the pregnancy engine, counted-tier code and provider research (11 files, 1808 lines), not just the declared parameter row, so correct the base or provide full-stack scope and checks; finish on that branch, merge main into it first.

Sent back 2026-10-24 from PR #5788 (branch claude/unplanned-exposure-calibration): full-stack scope is disclosed, but renewal.test.ts:61-79 still allows zero ordinary named pregnancies before forcing carry:1, and people-unplanned-pregnancy-decision.md still declares impact:none despite creating pregnancy outcomes and moving cash; take corrected parent acceptance/declaration or retarget the bounded slice; finish on that branch, merge main into it first.

Fixer handed PR 5788 back Oct 24, 2026: its ordinary-year witness needs ordinary years with named unplanned pregnancies (none in 12 drawn places at seed 50892f9417b0793e, per the #5695 hand-back), which is this calibration itself; the parent stack (#5695 declaration, ordering with #5749 and #5757) needs the CTO to order it.

Oct 25 audit: From the dropped people-unplanned-exposure-rate-high: counted women ran 0.05 to 0.31 unplanned decisions a year over eight towns (PR #5757's branch).

Oct 25 audit: From the dropped people-unplanned-calibration: check all five weights (exposure, acceptance, endingBase, travelWeight, travelHalfMiles) at the ends of their windows.

Deferred Oct 25: nothing on screen reads it yet.
