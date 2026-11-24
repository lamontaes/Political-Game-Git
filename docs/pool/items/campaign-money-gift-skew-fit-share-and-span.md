---
id: campaign-money-gift-skew-fit-share-and-span
title: "Gifts to a local campaign come out too even: the mean gift is 1.3 times the median, where real local giving runs about 2.9"
area: elections
kind: research
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: campaign-money-refit-after-views-carry-popularity
blocked-on:
root: design-electorate-one-model
lead: governing
model: opus
effort: medium
source: views thread, Nov 14 (Account lead's note on fitting to the real figures)
---

**What.** A town candidate's donor calls bring in gifts that sit too close together: few small gifts and few large ones. Real local giving has many small gifts and a long tail of large ones. Seen: the Campaign tab's money raised and the gifts listed after call time and donor meetings.

**Cause.** Measured: `GOLDEN_PATH_SEED=868ab6d8cbb6351cadd103f589af7ca01f6a44c02221caedfefa2f2d520a24f1 npx vitest run src/core2/campaign-money-calibration.test.ts` and the same at a2a0030b2f1095eab0f39b4497b20553832463b4afba377945f34c99bdaad8de (32 drawn places each, the summary in `GOV_REPORT_DIR`) gives a mean gift of $124 to $130 against a median of $86 to $97.5, 1.3 to 1.4 times, before and after popularity entered voters' views. The real figures the bands were drawn from (`donationShareOfMonthPerWarmth`'s row in `src/core2/data/campaigns/parameters.json`) are a mean near $144 (Worcester council races) and a median near $50 (Portland city races; NYC CFB 2025), 2.9 times. Found in code: a gift is the donor's reason times `donationShareOfMonthPerWarmth` times the month's spare weighed on a log scale of `donationMonthScaleMonths` of their living costs (`donationAnswer`, `src/core2/modules/campaigns.ts`), so the share scales every gift alike and cannot move the median and the mean apart; the month span sets how steeply a better-off donor gives more. The Nov 2 fit chose both against the bands' edges, not the real figures.

**Fix.** Record every ask (reason, month's spare, savings, cushion, own month, limit room) on the calibration test's places for at least 50 run seeds, half to fit and half held out; replay the gift rule at each share and month span; choose the pair closest to the real median, mean and dollars per hour on the fit half and report the held-out half. Write the pair, its spread and both halves' numbers into both rows. If no pair reaches a mean of at least twice the median, stop and bring the numbers to the governing lead: then the gift's shape is a design call. Change no band of the test.

**Time box.** 5 hours, Opus at medium effort, one heavy run at a time (heavy-runs).

**Rules.** No dice: real figures calibrate the totals of all gifts and never decide one donor's gift. Never loosen a band of the calibration test to get green.

**Done when.** The calibration test passes at three named run seeds with the mean gift at least twice the median, both rows carry both halves' numbers, and a second session, on main in a drawn place it names with its seed, runs a council campaign's call time in dev mode and sees several small gifts and a few large ones.

**Waits on.** `campaign-money-refit-after-views-carry-popularity` on the train.

**Files.** src/core2/data/campaigns/parameters.json, src/core2/campaign-money-calibration.test.ts

**Notes.** Nov 14 (claude, views thread): filed at the Account lead's ruling, with the refit item that found it.
