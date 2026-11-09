---
id: core-voter-household-weight-below-one
title: "A counted household stands for less than one voter in some towns"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: CTO, from the golden-path failure (M0-09) on PR 8060, Nov 9, 2026
claimed-at:
---

**What.** `src/core2/voter-groups.test.ts` ("voter groups are the counted electorate") fails at some drawn places because a voter row carries its household's weight and that weight is below 1: Valley City, North Dakota (key 3881180, seed d5a9ce3f642229fdc5611e1a85e2e1565f79688af5a1f55b560643f2d082a184) gave 0.414. A counted household stands for at least itself, so a weight under 1 means the town's Census scaling shrank a household instead of growing it. Find where the weight is set (the census weight model) and why it drops under 1 there, and fix the weight, not the test.

**Rules.** Real data is calibration only, and one rule covers all places: every counted household stands for one or more real households.

**Done when.** The test passes at Valley City, North Dakota with the seed above, and a different session names the household record and its weight before and after.

**Files.** src/core2/voter-groups.test.ts, the census weight code it reads (store.weightOf)

**Notes.** Not caused by PR 8060, which changes no engine file. The golden path draws a random place, so this fails only sometimes.
