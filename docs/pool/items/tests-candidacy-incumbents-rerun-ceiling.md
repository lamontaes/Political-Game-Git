---
id: tests-candidacy-incumbents-rerun-ceiling
title: "The M2-04 candidacy test fails on main when a drawn town's incumbents all but all run again"
area: elections
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/candidacy.test.ts, "has most incumbents run again, as about 81% really do", fails on clean main (f25b1e4d2b) with GOLDEN_PATH_SEED f9bd82d15c3a6f0ab833241e88afddc160a11591c019179a44360b188485ea29 and place 3374780 (Suissevale, New Hampshire): "expected 0.955 to be less than 0.95". The golden-path run on PR 5917 drew it, and it reddens M2-04, an accepted spec, for any PR that draws the place. A share from one town's handful of incumbents is checked against a fixed ceiling; with few seats one more incumbent running moves it past the line, so the check reads noise, not the rule.

**Rules.** No dice: the rerun decision stays each incumbent's own read; the test should check the share against the real rate with a spread that fits the number of seats, or pool enough places, not tune the decision. One rule, all 56 places: keep the random draw and name the place and seed.

**Done when.** src/core2/candidacy.test.ts passes on seed f9bd82d15c3a6f0ab833241e88afddc160a11591c019179a44360b188485ea29 (place 3374780) and on a fresh seed, with the share's bound justified by the count of incumbents in the drawn place.

**Files.** src/core2/candidacy.test.ts

**Notes.** Found Oct 24 by the Words session checking PR 5917's golden-path failure; PR 5917 changes only grading-page tooling.
