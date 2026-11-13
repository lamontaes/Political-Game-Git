---
id: tests-campaign-money-remerton-donors-not-warm
title: "A drawn place's donor evenings bring in no gift at all: everyone asked answers not-warm (Remerton, Georgia)"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: opus
effort: medium
root: none
source: Red desk, Nov 13 (the filing sweep of tests-filing-fixed-date-thirteen-files, PR #8976)
---

**What.** src/core2/campaign-money-calibration.test.ts at GOLDEN_PATH_SEED=2c89147eae23b180, on the branch of PR #8976 (which lets it get past filing), reaches 32 of 32 places and lands in every band ($142 an hour, mean gift $155, median $105, 881 gifts), but fails "every place's evenings bring in money": in Remerton, Georgia (1364596) the candidate asked 294 people over 30 hours of calls and got no gift, 290 answering `not-warm` and 4 `no-spare`. On clean main the same seed fails earlier, at filing. Seen: a candidate in a small town who calls donors for ten weeks raises something from the people who know them.

**Cause.** Measured: `GOLDEN_PATH_SEED=2c89147eae23b180 npx vitest run src/core2/campaign-money-calibration.test.ts` on the branch of PR #8976 (a090d08ae2), the summary's row for Remerton (`why: {not-warm: 290, no-spare: 4}`). `donationAnswer` in src/core2/modules/campaigns.ts answers `not-warm` where `donorReason` is at or below zero, so for 290 of 294 people the reasons to give summed to nothing. Not found: whether the candidate the test files (the first of the ten best-known residents a race accepts, after the clock moved to Remerton's first filing day) has ties to the people the evenings call, or whether the asks reach strangers first. Read `donorReason` with that candidate's ties next.

**Fix.** Needs cause. Then the fix is in who the evenings call or in `donorReason`, never in the check.

**Time box.** 2 hours

**Rules.** No dice: who gives is decided by their ties, their money and the law, never a roll. One rule, all 56 places: the check keeps every drawn place and names it.

**Done when.** A second session runs campaign-money-calibration.test.ts on main at GOLDEN_PATH_SEED=2c89147eae23b180 and at a fresh seed, in the drawn places it names, and every place's evenings bring in at least one gift.

**Waits on.** PR #8976 (the check reaches this place only once it waits for filing).

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-money-calibration.test.ts
