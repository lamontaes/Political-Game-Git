---
id: gov-poll-margin-zero-when-unanimous
title: "A poll where every respondent names the same candidate reports a margin of error of zero (Rancho Cordova, California)"
area: gov
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/poll-margin
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T16:41:34.886Z
---

**What.** A poll reports its margin of error from the leader's share with the share floored at one half, so when every respondent names the same candidate the share is one and the margin is zero. The golden-path check M2-06 (`src/core2/campaigns.test.ts`) fails on main in Rancho Cordova, California with the golden-path seed 578cf6adfcdcf793c164a5c3922d7d0ea8f68b6cb421153bec6d710972bec9b9 ("expected 0 to be greater than 0" at the margin check). The margin is now the Agresti-Coull interval (two more answers for and two against), never zero when anyone answered, and `pollMargin` is a pure function with its own test.

**Rules.** Sliding scales: no kink at a share of one half. Every number is SOURCED: Agresti and Coull 1998. One rule, all 56 places: the margin depends on the answers, not the place.

**Done when.** In the played world (the campaigns test with the place key 0659444 and the seed above, Rancho Cordova, California) the poll's margin of error is above zero and the test passes, and src/core2/poll-margin.test.ts holds the margin's shape.

**Files.** src/core2/modules/campaigns.ts

**Notes.** Found by the GitHub golden-path run on PR #4765 (M2-06 failed there and reproduced on a branch that is main plus notes).
