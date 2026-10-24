---
id: tests-campaign-turn-donor-total-green-isle
title: "A donor asked again gives 1,300 where the test expects nothing (Green Isle, Minnesota)"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/campaign-donor-total
pr: #5940
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T12:19:44.804Z
---

**What.** src/core2/campaign-turn.test.ts, 'a donor's running total is read from its indexed row, not from the history of payments', fails on main at line 279 in Green Isle, Minnesota (place key 2725658, seed 3d29bb4ba93ab238770ab3570ad393b0144d225cabba0415b78f6a7fd4ccb5bc): askForDonation returns 1300 where 0 is expected. Found by the M0-M2 lead's helper on the campaigns small-place fix; identical with that fix reverted.

**Rules.** One rule, all 56 places: a donor's limit and running total must hold in every drawn place, so fix the cause in the donation engine or how the test picks its donor, never the assertion.

**Done when.** GOLDEN_PATH_SEED=3d29bb4ba93ab238770ab3570ad393b0144d225cabba0415b78f6a7fd4ccb5bc npx vitest run src/core2/campaign-turn.test.ts passes with the cause named by line in the PR, and on three more drawn places named with seeds.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-turn.test.ts

**Notes.** TODO
